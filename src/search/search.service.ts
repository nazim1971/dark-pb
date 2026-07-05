import { Injectable } from "@nestjs/common";
import { CompanyType, Prisma, Role } from "@prisma/client";
import { AuthenticatedUser } from "../auth/interfaces/token-payload.interface";
import { buildPaginatedDataResponse } from "../common/helpers/response.helper";
import { PrismaService } from "../prisma/prisma.service";
import { buildPagination } from "../prisma/query-helpers";
import {
  SearchEntityType,
  SearchQueryDto,
  SearchSortBy,
  SearchSortDirection,
} from "./dto/search-query.dto";

export interface SearchItem {
  entityType: SearchEntityType;
  id: string;
  title: string;
  subtitle: string | null;
  score: number;
  createdAt: Date;
  updatedAt: Date;
  payload: Record<string, unknown>;
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async globalSearch(user: AuthenticatedUser, query: SearchQueryDto) {
    const q = query.q.trim();
    const types = this.resolveTypes(user, query.types);
    const candidateLimit = Math.max(query.limit * 4, 80);

    const [songs, writers, users, publishers, recordLabels] = await Promise.all([
      types.includes(SearchEntityType.SONG)
        ? this.searchSongs(user, q, candidateLimit)
        : Promise.resolve([]),
      types.includes(SearchEntityType.WRITER)
        ? this.searchWriters(user, q, candidateLimit)
        : Promise.resolve([]),
      types.includes(SearchEntityType.USER) && user.role === Role.ADMIN
        ? this.searchUsers(q, candidateLimit)
        : Promise.resolve([]),
      types.includes(SearchEntityType.PUBLISHER) && user.role === Role.ADMIN
        ? this.searchPublishers(q, candidateLimit)
        : Promise.resolve([]),
      types.includes(SearchEntityType.RECORD_LABEL) && user.role === Role.ADMIN
        ? this.searchRecordLabels(q, candidateLimit)
        : Promise.resolve([]),
    ]);

    const rows = [...songs, ...writers, ...users, ...publishers, ...recordLabels];
    const sorted = this.sortRows(rows, query.sortBy, query.sortDirection);
    const pagination = buildPagination(query);

    return {
      ...buildPaginatedDataResponse(
        sorted.slice(pagination.skip, pagination.skip + pagination.take),
        pagination.page,
        pagination.limit,
        sorted.length,
      ),
      filters: {
        q,
        types,
      },
    };
  }

  private resolveTypes(
    user: AuthenticatedUser,
    requested?: SearchEntityType[],
  ): SearchEntityType[] {
    const allowed =
      user.role === Role.ADMIN
        ? [
            SearchEntityType.SONG,
            SearchEntityType.WRITER,
            SearchEntityType.USER,
            SearchEntityType.PUBLISHER,
            SearchEntityType.RECORD_LABEL,
          ]
        : [SearchEntityType.SONG, SearchEntityType.WRITER];

    if (!requested || requested.length === 0) {
      return allowed;
    }

    return requested.filter((type) => allowed.includes(type));
  }

  private async searchSongs(
    user: AuthenticatedUser,
    q: string,
    take: number,
  ): Promise<SearchItem[]> {
    const where: Prisma.CompositionWhereInput = {
      deletedAt: null,
      ...(user.role === Role.ADMIN ? {} : { ownerId: user.userId }),
      OR: [
        { songTitle: { contains: q, mode: "insensitive" } },
        { alternativeTitle: { contains: q, mode: "insensitive" } },
        { artistName: { contains: q, mode: "insensitive" } },
        { isrc: { contains: q, mode: "insensitive" } },
        { dlrpId: { contains: q, mode: "insensitive" } },
      ],
    };

    const rows = await this.prisma.composition.findMany({
      where,
      select: {
        id: true,
        songTitle: true,
        alternativeTitle: true,
        artistName: true,
        isrc: true,
        dlrpId: true,
        createdAt: true,
        updatedAt: true,
      },
      take,
      orderBy: [{ updatedAt: "desc" }],
    });

    return rows.map((row) => ({
      entityType: SearchEntityType.SONG,
      id: row.id,
      title: row.songTitle,
      subtitle: row.artistName ?? row.alternativeTitle,
      score: this.relevanceScore(row.songTitle, q),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      payload: {
        alternativeTitle: row.alternativeTitle,
        artistName: row.artistName,
        isrc: row.isrc,
        dlrpId: row.dlrpId,
      },
    }));
  }

  private async searchWriters(
    user: AuthenticatedUser,
    q: string,
    take: number,
  ): Promise<SearchItem[]> {
    const where: Prisma.WriterWhereInput = {
      deletedAt: null,
      OR: [
        { legalName: { contains: q, mode: "insensitive" } },
        { stageName: { contains: q, mode: "insensitive" } },
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
        { ipiNumber: { contains: q, mode: "insensitive" } },
      ],
    };

    if (user.role !== Role.ADMIN) {
      where.AND = [
        {
          OR: [
            { userId: user.userId },
            {
              compositions: {
                some: {
                  composition: {
                    ownerId: user.userId,
                  },
                },
              },
            },
          ],
        },
      ];
    }

    const rows = await this.prisma.writer.findMany({
      where,
      select: {
        id: true,
        legalName: true,
        stageName: true,
        firstName: true,
        lastName: true,
        ipiNumber: true,
        pro: true,
        createdAt: true,
        updatedAt: true,
      },
      take,
      orderBy: [{ updatedAt: "desc" }],
    });

    return rows.map((row) => ({
      entityType: SearchEntityType.WRITER,
      id: row.id,
      title: row.stageName ?? row.legalName,
      subtitle: `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim() || null,
      score: this.relevanceScore(row.stageName ?? row.legalName, q),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      payload: {
        legalName: row.legalName,
        firstName: row.firstName,
        lastName: row.lastName,
        ipiNumber: row.ipiNumber,
        pro: row.pro,
      },
    }));
  }

  private async searchUsers(q: string, take: number): Promise<SearchItem[]> {
    const rows = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { legalName: { contains: q, mode: "insensitive" } },
          { stageName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        legalName: true,
        stageName: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      take,
      orderBy: [{ updatedAt: "desc" }],
    });

    return rows.map((row) => ({
      entityType: SearchEntityType.USER,
      id: row.id,
      title: `${row.firstName} ${row.lastName}`.trim(),
      subtitle: row.email,
      score: this.relevanceScore(`${row.firstName} ${row.lastName} ${row.email}`, q),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      payload: {
        role: row.role,
        legalName: row.legalName,
        stageName: row.stageName,
      },
    }));
  }

  private async searchPublishers(q: string, take: number): Promise<SearchItem[]> {
    const rows = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        role: Role.PUBLISHER,
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { legalName: { contains: q, mode: "insensitive" } },
          { stageName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        legalName: true,
        stageName: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
      take,
      orderBy: [{ updatedAt: "desc" }],
    });

    return rows.map((row) => ({
      entityType: SearchEntityType.PUBLISHER,
      id: row.id,
      title: row.legalName ?? `${row.firstName} ${row.lastName}`.trim(),
      subtitle: row.email,
      score: this.relevanceScore(`${row.firstName} ${row.lastName} ${row.email}`, q),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      payload: {
        legalName: row.legalName,
        stageName: row.stageName,
      },
    }));
  }

  private async searchRecordLabels(q: string, take: number): Promise<SearchItem[]> {
    const [users, companies] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          deletedAt: null,
          role: Role.RECORD_LABEL,
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { legalName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          legalName: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
        take,
        orderBy: [{ updatedAt: "desc" }],
      }),
      this.prisma.company.findMany({
        where: {
          deletedAt: null,
          type: CompanyType.RECORD_LABEL,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { legalName: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          legalName: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
        take,
        orderBy: [{ updatedAt: "desc" }],
      }),
    ]);

    return [
      ...users.map((row) => ({
        entityType: SearchEntityType.RECORD_LABEL,
        id: row.id,
        title: row.legalName ?? `${row.firstName} ${row.lastName}`.trim(),
        subtitle: row.email,
        score: this.relevanceScore(
          `${row.legalName ?? ""} ${row.firstName} ${row.lastName} ${row.email}`,
          q,
        ),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        payload: {
          source: "user",
        },
      })),
      ...companies.map((row) => ({
        entityType: SearchEntityType.RECORD_LABEL,
        id: row.id,
        title: row.legalName ?? row.name,
        subtitle: row.email,
        score: this.relevanceScore(`${row.legalName ?? ""} ${row.name} ${row.email ?? ""}`, q),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        payload: {
          source: "company",
          companyName: row.name,
        },
      })),
    ];
  }

  private sortRows(
    rows: SearchItem[],
    sortBy: SearchSortBy,
    sortDirection: SearchSortDirection,
  ): SearchItem[] {
    const direction = sortDirection === SearchSortDirection.ASC ? 1 : -1;

    return [...rows].sort((a, b) => {
      if (sortBy === SearchSortBy.RELEVANCE) {
        return (a.score - b.score) * direction;
      }

      if (sortBy === SearchSortBy.CREATED_AT) {
        return (a.createdAt.getTime() - b.createdAt.getTime()) * direction;
      }

      if (sortBy === SearchSortBy.UPDATED_AT) {
        return (a.updatedAt.getTime() - b.updatedAt.getTime()) * direction;
      }

      return a.title.localeCompare(b.title) * direction;
    });
  }

  private relevanceScore(value: string, q: string): number {
    const text = value.toLowerCase();
    const needle = q.toLowerCase();

    if (text === needle) {
      return 100;
    }

    if (text.startsWith(needle)) {
      return 75;
    }

    if (text.includes(needle)) {
      return 50;
    }

    return 0;
  }
}
