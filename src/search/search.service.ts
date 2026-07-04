import { Injectable } from "@nestjs/common";
import { Prisma, Role } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser } from "../auth/interfaces/token-payload.interface";
import {
  SearchEntityType,
  SearchQueryDto,
  SearchSortBy,
  SearchSortDirection,
} from "./dto/search-query.dto";

interface RawRankResult {
  entityType: SearchEntityType;
  entityId: string;
  rank: number;
}

export interface SearchItem {
  entityType: SearchEntityType;
  id: string;
  title: string;
  subtitle: string | null;
  tags: string[];
  score: number;
  createdAt: Date;
  updatedAt: Date;
  payload: Record<string, unknown>;
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async globalSearch(user: AuthenticatedUser, query: SearchQueryDto) {
    const types = this.resolveTypes(query.types);
    const candidateLimit = Math.max(query.limit * 5, 100);
    const ranking = query.q ? await this.fetchFullTextRanks(query.q, types, candidateLimit) : [];

    const rankMap = new Map<string, number>(
      ranking.map((item) => [this.rankKey(item.entityType, item.entityId), item.rank]),
    );

    const groupedIds = this.groupIdsByType(ranking);

    const [compositions, writers, publishers, recordings] = await Promise.all([
      types.includes(SearchEntityType.COMPOSITION)
        ? this.searchCompositions(user, query, groupedIds.composition, candidateLimit)
        : Promise.resolve([]),
      types.includes(SearchEntityType.WRITER)
        ? this.searchWriters(query, groupedIds.writer, candidateLimit)
        : Promise.resolve([]),
      types.includes(SearchEntityType.PUBLISHER)
        ? this.searchPublishers(query, groupedIds.publisher, candidateLimit)
        : Promise.resolve([]),
      types.includes(SearchEntityType.RECORDING)
        ? this.searchRecordings(query, groupedIds.recording, candidateLimit)
        : Promise.resolve([]),
    ]);

    const rows: SearchItem[] = [
      ...compositions.map((item) => this.mapComposition(item, rankMap)),
      ...writers.map((item) => this.mapWriter(item, rankMap)),
      ...publishers.map((item) => this.mapPublisher(item, rankMap)),
      ...recordings.map((item) => this.mapRecording(item, rankMap)),
    ];

    const sorted = this.sortRows(rows, query.sortBy, query.sortDirection, !!query.q);
    const offset = (query.page - 1) * query.limit;
    const paged = sorted.slice(offset, offset + query.limit);

    return {
      data: paged,
      meta: {
        page: query.page,
        limit: query.limit,
        total: sorted.length,
      },
      filters: {
        types,
        query: query.q ?? null,
      },
    };
  }

  private async fetchFullTextRanks(
    q: string,
    types: SearchEntityType[],
    limit: number,
  ): Promise<RawRankResult[]> {
    const unions: Prisma.Sql[] = [];
    const tsQuery = Prisma.sql`plainto_tsquery('simple', ${q})`;

    if (types.includes(SearchEntityType.COMPOSITION)) {
      unions.push(Prisma.sql`
				SELECT 'composition'::text AS "entityType", "id"::text AS "entityId",
							 ts_rank(
								 to_tsvector('simple',
									 coalesce("songTitle", '') || ' ' ||
									 coalesce("alternativeTitle", '') || ' ' ||
									 coalesce("iswc", '') || ' ' ||
									 coalesce("isrc", '') || ' ' ||
									 coalesce("spotifyUrl", '')
								 ),
								 ${tsQuery}
							 ) AS rank
				FROM "compositions"
				WHERE "deletedAt" IS NULL
					AND to_tsvector('simple',
						coalesce("songTitle", '') || ' ' ||
						coalesce("alternativeTitle", '') || ' ' ||
						coalesce("iswc", '') || ' ' ||
						coalesce("isrc", '') || ' ' ||
						coalesce("spotifyUrl", '')
					) @@ ${tsQuery}
			`);
    }

    if (types.includes(SearchEntityType.WRITER)) {
      unions.push(Prisma.sql`
				SELECT 'writer'::text AS "entityType", "id"::text AS "entityId",
							 ts_rank(
								 to_tsvector('simple',
									 coalesce("legalName", '') || ' ' ||
									 coalesce("stageName", '') || ' ' ||
									 coalesce("ipiNumber", '') || ' ' ||
									 coalesce("pro", '')
								 ),
								 ${tsQuery}
							 ) AS rank
				FROM "writers"
				WHERE "deletedAt" IS NULL
					AND to_tsvector('simple',
						coalesce("legalName", '') || ' ' ||
						coalesce("stageName", '') || ' ' ||
						coalesce("ipiNumber", '') || ' ' ||
						coalesce("pro", '')
					) @@ ${tsQuery}
			`);
    }

    if (types.includes(SearchEntityType.PUBLISHER)) {
      unions.push(Prisma.sql`
				SELECT 'publisher'::text AS "entityType", "id"::text AS "entityId",
							 ts_rank(
								 to_tsvector('simple',
									 coalesce("publisherName", '') || ' ' ||
									 coalesce("ipi", '') || ' ' ||
									 coalesce("territory", '')
								 ),
								 ${tsQuery}
							 ) AS rank
				FROM "publishers"
				WHERE "deletedAt" IS NULL
					AND to_tsvector('simple',
						coalesce("publisherName", '') || ' ' ||
						coalesce("ipi", '') || ' ' ||
						coalesce("territory", '')
					) @@ ${tsQuery}
			`);
    }

    if (types.includes(SearchEntityType.RECORDING)) {
      unions.push(Prisma.sql`
				SELECT 'recording'::text AS "entityType", "id"::text AS "entityId",
							 ts_rank(
								 to_tsvector('simple',
									 coalesce("artist", '') || ' ' ||
									 coalesce("isrc", '') || ' ' ||
									 coalesce("spotifyLink", '')
								 ),
								 ${tsQuery}
							 ) AS rank
				FROM "recordings"
				WHERE "deletedAt" IS NULL
					AND to_tsvector('simple',
						coalesce("artist", '') || ' ' ||
						coalesce("isrc", '') || ' ' ||
						coalesce("spotifyLink", '')
					) @@ ${tsQuery}
			`);
    }

    if (unions.length === 0) {
      return [];
    }

    const unionSql = Prisma.join(unions, " UNION ALL ");
    const querySql = Prisma.sql`
			SELECT *
			FROM (${unionSql}) AS ranked
			ORDER BY rank DESC
			LIMIT ${limit}
		`;

    const rows =
      await this.prisma.$queryRaw<Array<{ entityType: string; entityId: string; rank: number }>>(
        querySql,
      );

    return rows.map((row) => ({
      entityType: row.entityType as SearchEntityType,
      entityId: row.entityId,
      rank: Number(row.rank),
    }));
  }

  private async searchCompositions(
    user: AuthenticatedUser,
    query: SearchQueryDto,
    rankedIds: string[],
    limit: number,
  ) {
    const where: Prisma.CompositionWhereInput = {};
    if (user.role !== Role.ADMIN) {
      where.ownerId = user.userId;
    }
    if (query.song) {
      where.songTitle = { contains: query.song, mode: "insensitive" };
    }
    if (query.isrc) {
      where.isrc = { contains: query.isrc, mode: "insensitive" };
    }
    if (query.iswc) {
      where.iswc = { contains: query.iswc, mode: "insensitive" };
    }
    if (query.spotifyUrl) {
      where.spotifyUrl = { contains: query.spotifyUrl, mode: "insensitive" };
    }
    if (query.q && rankedIds.length > 0) {
      where.id = { in: rankedIds };
    }
    return this.prisma.composition.findMany({
      where,
      select: {
        id: true,
        songTitle: true,
        alternativeTitle: true,
        isrc: true,
        iswc: true,
        spotifyUrl: true,
        owner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            legalName: true,
            stageName: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      take: limit,
      orderBy: [{ updatedAt: "desc" }],
    });
  }

  private async searchWriters(query: SearchQueryDto, rankedIds: string[], limit: number) {
    const where: Prisma.WriterWhereInput = {};
    if (query.writer) {
      where.OR = [
        { legalName: { contains: query.writer, mode: "insensitive" } },
        { stageName: { contains: query.writer, mode: "insensitive" } },
      ];
    }
    if (query.ipi) {
      where.ipiNumber = { contains: query.ipi, mode: "insensitive" };
    }
    if (query.q && rankedIds.length > 0) {
      where.id = { in: rankedIds };
    }
    return this.prisma.writer.findMany({
      where,
      select: {
        id: true,
        legalName: true,
        stageName: true,
        ipiNumber: true,
        pro: true,
        createdAt: true,
        updatedAt: true,
      },
      take: limit,
      orderBy: [{ updatedAt: "desc" }],
    });
  }

  private async searchPublishers(query: SearchQueryDto, rankedIds: string[], limit: number) {
    const where: Prisma.PublisherWhereInput = {};
    if (query.publisher) {
      where.publisherName = { contains: query.publisher, mode: "insensitive" };
    }
    if (query.ipi) {
      where.ipi = { contains: query.ipi, mode: "insensitive" };
    }
    if (query.q && rankedIds.length > 0) {
      where.id = { in: rankedIds };
    }
    return this.prisma.publisher.findMany({
      where,
      select: {
        id: true,
        publisherName: true,
        ipi: true,
        territory: true,
        createdAt: true,
        updatedAt: true,
      },
      take: limit,
      orderBy: [{ updatedAt: "desc" }],
    });
  }

  private async searchRecordings(query: SearchQueryDto, rankedIds: string[], limit: number) {
    const where: Prisma.RecordingWhereInput = {};
    if (query.artist) {
      where.artist = { contains: query.artist, mode: "insensitive" };
    }
    if (query.isrc) {
      where.isrc = { contains: query.isrc, mode: "insensitive" };
    }
    if (query.spotifyUrl) {
      where.spotifyLink = { contains: query.spotifyUrl, mode: "insensitive" };
    }
    if (query.q && rankedIds.length > 0) {
      where.id = { in: rankedIds };
    }
    return this.prisma.recording.findMany({
      where,
      select: {
        id: true,
        artist: true,
        isrc: true,
        spotifyLink: true,
        createdAt: true,
        updatedAt: true,
      },
      take: limit,
      orderBy: [{ updatedAt: "desc" }],
    });
  }

  private mapComposition(
    item: {
      id: string;
      songTitle: string;
      alternativeTitle: string | null;
      isrc: string | null;
      iswc: string | null;
      spotifyUrl: string | null;
      owner: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        legalName: string | null;
        stageName: string | null;
      };
      createdAt: Date;
      updatedAt: Date;
    },
    rankMap: Map<string, number>,
  ): SearchItem {
    return {
      entityType: SearchEntityType.COMPOSITION,
      id: item.id,
      title: item.songTitle,
      subtitle: item.alternativeTitle,
      tags: [item.isrc, item.iswc].filter((v): v is string => !!v),
      score: rankMap.get(this.rankKey(SearchEntityType.COMPOSITION, item.id)) ?? 0,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      payload: {
        isrc: item.isrc,
        iswc: item.iswc,
        spotifyUrl: item.spotifyUrl,
        owner: item.owner,
      },
    };
  }

  private mapWriter(
    item: {
      id: string;
      legalName: string;
      stageName: string | null;
      ipiNumber: string | null;
      pro: string | null;
      createdAt: Date;
      updatedAt: Date;
    },
    rankMap: Map<string, number>,
  ): SearchItem {
    return {
      entityType: SearchEntityType.WRITER,
      id: item.id,
      title: item.stageName ?? item.legalName,
      subtitle: item.stageName ? item.legalName : null,
      tags: [item.ipiNumber, item.pro].filter((v): v is string => !!v),
      score: rankMap.get(this.rankKey(SearchEntityType.WRITER, item.id)) ?? 0,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      payload: {
        legalName: item.legalName,
        stageName: item.stageName,
        ipi: item.ipiNumber,
      },
    };
  }

  private mapPublisher(
    item: {
      id: string;
      publisherName: string;
      ipi: string | null;
      territory: string | null;
      createdAt: Date;
      updatedAt: Date;
    },
    rankMap: Map<string, number>,
  ): SearchItem {
    return {
      entityType: SearchEntityType.PUBLISHER,
      id: item.id,
      title: item.publisherName,
      subtitle: item.territory,
      tags: [item.ipi].filter((v): v is string => !!v),
      score: rankMap.get(this.rankKey(SearchEntityType.PUBLISHER, item.id)) ?? 0,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      payload: {
        ipi: item.ipi,
        territory: item.territory,
      },
    };
  }

  private mapRecording(
    item: {
      id: string;
      artist: string | null;
      isrc: string | null;
      spotifyLink: string | null;
      createdAt: Date;
      updatedAt: Date;
    },
    rankMap: Map<string, number>,
  ): SearchItem {
    return {
      entityType: SearchEntityType.RECORDING,
      id: item.id,
      title: item.artist ?? "Unknown Artist",
      subtitle: item.isrc,
      tags: [item.isrc].filter((v): v is string => !!v),
      score: rankMap.get(this.rankKey(SearchEntityType.RECORDING, item.id)) ?? 0,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      payload: {
        artist: item.artist,
        isrc: item.isrc,
        spotifyUrl: item.spotifyLink,
      },
    };
  }

  private sortRows(
    rows: SearchItem[],
    sortBy: SearchSortBy,
    sortDirection: SearchSortDirection,
    hasQuery: boolean,
  ): SearchItem[] {
    const direction = sortDirection === SearchSortDirection.ASC ? 1 : -1;
    const effectiveSortBy =
      sortBy === SearchSortBy.RELEVANCE && !hasQuery ? SearchSortBy.UPDATED_AT : sortBy;

    return [...rows].sort((a, b) => {
      if (effectiveSortBy === SearchSortBy.RELEVANCE) {
        return (a.score - b.score) * direction;
      }

      if (effectiveSortBy === SearchSortBy.CREATED_AT) {
        return (a.createdAt.getTime() - b.createdAt.getTime()) * direction;
      }

      if (effectiveSortBy === SearchSortBy.UPDATED_AT) {
        return (a.updatedAt.getTime() - b.updatedAt.getTime()) * direction;
      }

      return a.title.localeCompare(b.title) * direction;
    });
  }

  private resolveTypes(types?: SearchEntityType[]): SearchEntityType[] {
    if (!types || types.length === 0) {
      return [
        SearchEntityType.COMPOSITION,
        SearchEntityType.WRITER,
        SearchEntityType.PUBLISHER,
        SearchEntityType.RECORDING,
      ];
    }

    return [...new Set(types)];
  }

  private groupIdsByType(ranks: RawRankResult[]) {
    return {
      composition: ranks
        .filter((row) => row.entityType === SearchEntityType.COMPOSITION)
        .map((row) => row.entityId),
      writer: ranks
        .filter((row) => row.entityType === SearchEntityType.WRITER)
        .map((row) => row.entityId),
      publisher: ranks
        .filter((row) => row.entityType === SearchEntityType.PUBLISHER)
        .map((row) => row.entityId),
      recording: ranks
        .filter((row) => row.entityType === SearchEntityType.RECORDING)
        .map((row) => row.entityId),
    };
  }

  private rankKey(type: SearchEntityType, id: string): string {
    return `${type}:${id}`;
  }
}
