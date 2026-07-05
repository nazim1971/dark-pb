import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, Role, RoyaltyStatus, RoyaltyType } from "@prisma/client";
import { AuthenticatedUser } from "../auth/interfaces/token-payload.interface";
import { buildPaginatedDataResponse } from "../common/helpers/response.helper";
import { PrismaService } from "../prisma/prisma.service";
import { buildPagination } from "../prisma/query-helpers";
import {
  buildExportArtifact,
  ExportArtifact,
  ExportFormat,
  ExportRow,
} from "../reports/export.utils";
import { CreateRoyaltyDto } from "./dto/create-royalty.dto";
import { RoyaltyQueryDto } from "./dto/royalty-query.dto";
import { UpdateRoyaltyDto } from "./dto/update-royalty.dto";

type RoyaltyWithRelations = Prisma.RoyaltyGetPayload<{
  include: {
    composition: { select: { id: true; ownerId: true; songTitle: true } };
    writer: { select: { id: true; legalName: true; stageName: true } };
  };
}>;

export interface RoyaltySummary {
  totalGrossAmount: number;
  totalAdminIncome: number;
  totalOwnerIncome: number;
  currency: string | null;
  recordCount: number;
}

export interface RoyaltyBreakdown {
  grossAmount: number;
  adminIncome: number;
  ownerIncome: number;
}

@Injectable()
export class RoyaltiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateRoyaltyDto) {
    this.assertAdmin(user);
    const royaltyDate = dto.royaltyDate ?? new Date();
    const periodYear = royaltyDate.getUTCFullYear();
    const periodMonth = royaltyDate.getUTCMonth() + 1;
    const sharePercentage = dto.adminSharePercentage;
    const royaltyType = dto.type ?? RoyaltyType.OTHER;

    const composition = await this.prisma.composition.findFirst({
      where: { id: dto.compositionId, deletedAt: null },
      select: { id: true },
    });

    if (!composition) {
      throw new BadRequestException("Song not found");
    }

    const royalty = await this.prisma.royalty.create({
      data: {
        compositionId: dto.compositionId,
        writerId: dto.writerId,
        type: royaltyType,
        sourceDsp: dto.dsp,
        country: dto.country,
        usageDate: royaltyDate,
        periodYear,
        periodMonth,
        amount: new Prisma.Decimal(dto.grossAmount.toFixed(4)),
        sharePercentage: new Prisma.Decimal(sharePercentage.toFixed(2)),
        currency: dto.currency?.toUpperCase() ?? "USD",
      },
      include: this.royaltyInclude,
    });

    return this.mapRoyalty(royalty);
  }

  async list(user: AuthenticatedUser, query: RoyaltyQueryDto) {
    const where = this.buildWhere(user, query);
    const pagination = buildPagination(query);

    const [rows, total, aggregate] = await Promise.all([
      this.prisma.royalty.findMany({
        where,
        include: this.royaltyInclude,
        orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }, { createdAt: "desc" }],
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.royalty.count({ where }),
      this.prisma.royalty.aggregate({
        where,
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]);

    const mappedRows = rows.map((row) => this.mapRoyalty(row));

    return {
      ...buildPaginatedDataResponse(mappedRows, pagination.page, pagination.limit, total),
      summary: this.buildSummary(rows, aggregate._sum.amount),
    };
  }

  async analytics(user: AuthenticatedUser, query: RoyaltyQueryDto) {
    const where = this.buildWhere(user, query);

    const [aggregate, byType, byCountry, byDsp, byMonth] = await Promise.all([
      this.prisma.royalty.aggregate({
        where,
        _sum: { amount: true },
        _avg: { sharePercentage: true },
        _count: { _all: true },
      }),
      this.prisma.royalty.groupBy({
        where,
        by: ["type"],
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.royalty.groupBy({
        where,
        by: ["country"],
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.royalty.groupBy({
        where,
        by: ["sourceDsp"],
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.royalty.groupBy({
        where,
        by: ["periodYear", "periodMonth"],
        _sum: { amount: true },
        _count: { _all: true },
        orderBy: [{ periodYear: "asc" }, { periodMonth: "asc" }],
      }),
    ]);

    return {
      totals: {
        grossAmount: this.decimalToNumber(aggregate._sum.amount),
        averageAdminSharePercentage: this.decimalToNumber(aggregate._avg.sharePercentage),
        recordCount: aggregate._count._all,
      },
      byType: byType.map((item) => ({
        type: item.type,
        amount: this.decimalToNumber(item._sum.amount),
        count: item._count._all,
      })),
      byCountry: byCountry.map((item) => ({
        country: item.country ?? "Unknown",
        amount: this.decimalToNumber(item._sum.amount),
        count: item._count._all,
      })),
      byDsp: byDsp.map((item) => ({
        dsp: item.sourceDsp ?? "Unknown",
        amount: this.decimalToNumber(item._sum.amount),
        count: item._count._all,
      })),
      monthlyTrend: byMonth.map((item) => ({
        year: item.periodYear,
        month: item.periodMonth,
        amount: this.decimalToNumber(item._sum.amount),
        count: item._count._all,
      })),
    };
  }

  async export(
    user: AuthenticatedUser,
    query: RoyaltyQueryDto,
    format: ExportFormat,
  ): Promise<ExportArtifact> {
    const rows = await this.prisma.royalty.findMany({
      where: this.buildWhere(user, query),
      include: this.royaltyInclude,
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }, { createdAt: "desc" }],
    });

    const exportRows = rows.map((row) => this.mapRoyaltyToExportRow(row));
    return buildExportArtifact("Royalties", this.buildRoyaltyFileName(query), exportRows, format);
  }

  async getById(user: AuthenticatedUser, id: string) {
    const row = await this.prisma.royalty.findUnique({
      where: { id },
      include: this.royaltyInclude,
    });

    if (!row || row.deletedAt) {
      throw new NotFoundException("Royalty not found");
    }

    this.assertCanAccessRoyalty(user, row.composition?.ownerId ?? null);
    return this.mapRoyalty(row);
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateRoyaltyDto) {
    this.assertAdmin(user);
    const existing = await this.prisma.royalty.findUnique({ where: { id } });

    if (!existing || existing.deletedAt) {
      throw new NotFoundException("Royalty not found");
    }

    const royaltyDate = dto.royaltyDate ?? existing.usageDate ?? new Date();
    const periodYear = royaltyDate.getUTCFullYear();
    const periodMonth = royaltyDate.getUTCMonth() + 1;

    const updated = await this.prisma.royalty.update({
      where: { id },
      data: {
        compositionId: dto.compositionId,
        writerId: dto.writerId,
        type: dto.type,
        sourceDsp: dto.dsp,
        country: dto.country,
        usageDate: dto.royaltyDate,
        periodYear,
        periodMonth,
        amount:
          dto.grossAmount !== undefined
            ? new Prisma.Decimal(dto.grossAmount.toFixed(4))
            : undefined,
        sharePercentage:
          dto.adminSharePercentage !== undefined
            ? new Prisma.Decimal(dto.adminSharePercentage.toFixed(2))
            : undefined,
        currency: dto.currency?.toUpperCase(),
        status: dto.status,
      },
      include: this.royaltyInclude,
    });

    return this.mapRoyalty(updated);
  }

  async remove(user: AuthenticatedUser, id: string) {
    this.assertAdmin(user);
    const existing = await this.prisma.royalty.findUnique({ where: { id } });

    if (!existing || existing.deletedAt) {
      throw new NotFoundException("Royalty not found");
    }

    const deleted = await this.prisma.royalty.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: this.royaltyInclude,
    });

    return this.mapRoyalty(deleted);
  }

  async getStatementCandidateRoyalties(filters: {
    userId?: string;
    includeProcessed?: boolean;
    compositionId?: string;
    song?: string;
    country?: string;
    dsp?: string;
    type?: RoyaltyType;
    status?: RoyaltyStatus;
    periodKeys?: Array<{ periodYear: number; periodMonth: number }>;
  }) {
    return this.prisma.royalty.findMany({
      where: this.buildWhere(
        undefined,
        {
          userId: filters.userId,
          compositionId: filters.compositionId,
          song: filters.song,
          country: filters.country,
          dsp: filters.dsp,
          type: filters.type,
          status: filters.status ?? (filters.includeProcessed ? undefined : RoyaltyStatus.PENDING),
        },
        filters.periodKeys,
      ),
      include: this.royaltyInclude,
      orderBy: [{ periodYear: "asc" }, { periodMonth: "asc" }, { createdAt: "asc" }],
    });
  }

  private readonly royaltyInclude = {
    composition: { select: { id: true, ownerId: true, songTitle: true } },
    writer: { select: { id: true, legalName: true, stageName: true } },
  } satisfies Prisma.RoyaltyInclude;

  private buildWhere(
    user: AuthenticatedUser | undefined,
    query: Partial<RoyaltyQueryDto & { userId?: string }>,
    periodKeys?: Array<{ periodYear: number; periodMonth: number }>,
  ): Prisma.RoyaltyWhereInput {
    const where: Prisma.RoyaltyWhereInput = {
      deletedAt: null,
    };

    if (query.compositionId) {
      where.compositionId = query.compositionId;
    }

    if (query.song) {
      where.composition = {
        is: {
          songTitle: {
            contains: query.song,
            mode: "insensitive",
          },
        },
      };
    }

    if (query.userId) {
      where.composition = {
        is: {
          ...(where.composition?.is ?? {}),
          ownerId: query.userId,
        },
      };
    }

    if (user && user.role !== Role.ADMIN) {
      where.composition = {
        is: {
          ...(where.composition?.is ?? {}),
          ownerId: user.userId,
        },
      };
    }

    if (query.month) {
      where.periodMonth = query.month;
    }

    if (query.year) {
      where.periodYear = query.year;
    }

    if (periodKeys && periodKeys.length > 0) {
      where.OR = periodKeys.map((periodKey) => ({
        periodYear: periodKey.periodYear,
        periodMonth: periodKey.periodMonth,
      }));
    }

    if (query.country) {
      where.country = {
        contains: query.country,
        mode: "insensitive",
      };
    }

    if (query.dsp) {
      where.sourceDsp = {
        contains: query.dsp,
        mode: "insensitive",
      };
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.status) {
      where.status = query.status;
    }

    return where;
  }

  private buildSummary(
    rows: RoyaltyWithRelations[],
    summedAmount: Prisma.Decimal | null,
  ): RoyaltySummary {
    const totals = rows.reduce(
      (acc, row) => {
        const breakdown = this.calculateRoyaltyBreakdown(row.amount, row.sharePercentage);
        acc.admin += breakdown.adminIncome;
        acc.owner += breakdown.ownerIncome;
        return acc;
      },
      { admin: 0, owner: 0 },
    );

    return {
      totalGrossAmount: this.decimalToNumber(summedAmount),
      totalAdminIncome: totals.admin,
      totalOwnerIncome: totals.owner,
      currency: rows[0]?.currency ?? null,
      recordCount: rows.length,
    };
  }

  private mapRoyalty(row: RoyaltyWithRelations) {
    return {
      id: row.id,
      type: row.type,
      status: row.status,
      song: row.composition?.songTitle ?? null,
      compositionId: row.compositionId,
      writerName: row.writer?.stageName ?? row.writer?.legalName ?? null,
      sourceDsp: row.sourceDsp,
      royaltyDate: row.usageDate,
      totalViews: null,
      country: row.country,
      periodYear: row.periodYear,
      periodMonth: row.periodMonth,
      grossAmount: this.decimalToNumber(row.amount),
      adminSharePercentage: this.decimalToNumber(row.sharePercentage),
      adminIncome: this.calculateRoyaltyBreakdown(row.amount, row.sharePercentage).adminIncome,
      ownerIncome: this.calculateRoyaltyBreakdown(row.amount, row.sharePercentage).ownerIncome,
      currency: row.currency,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapRoyaltyToExportRow(row: RoyaltyWithRelations): ExportRow {
    return {
      id: row.id,
      song: row.composition?.songTitle ?? "",
      type: row.type,
      status: row.status,
      month: row.periodMonth,
      year: row.periodYear,
      country: row.country ?? "",
      dsp: row.sourceDsp ?? "",
      grossAmount: this.decimalToNumber(row.amount).toFixed(4),
      adminIncome: this.calculateRoyaltyBreakdown(
        row.amount,
        row.sharePercentage,
      ).adminIncome.toFixed(4),
      ownerIncome: this.calculateRoyaltyBreakdown(
        row.amount,
        row.sharePercentage,
      ).ownerIncome.toFixed(4),
      currency: row.currency,
      adminSharePercentage: this.decimalToNumber(row.sharePercentage).toFixed(2),
      writer: row.writer?.stageName ?? row.writer?.legalName ?? "",
    };
  }

  private buildRoyaltyFileName(query: Partial<RoyaltyQueryDto>): string {
    const segments = ["royalties"];

    if (query.year) {
      segments.push(String(query.year));
    }

    if (query.month) {
      segments.push(String(query.month).padStart(2, "0"));
    }

    if (query.country) {
      segments.push(query.country.toLowerCase().replace(/\s+/g, "-"));
    }

    return segments.join("-");
  }

  private decimalToNumber(value: Prisma.Decimal | null | undefined): number {
    if (!value) {
      return 0;
    }

    return Number(value);
  }

  private calculateRoyaltyBreakdown(
    grossAmount: Prisma.Decimal,
    adminSharePercentage: Prisma.Decimal,
  ): RoyaltyBreakdown {
    const gross = Number(grossAmount);
    const adminIncome = (gross * Number(adminSharePercentage)) / 100;

    return {
      grossAmount: gross,
      adminIncome,
      ownerIncome: gross - adminIncome,
    };
  }

  private assertAdmin(user: AuthenticatedUser): void {
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException("Only admins can manage royalties");
    }
  }

  private assertCanAccessRoyalty(user: AuthenticatedUser, ownerId: string | null): void {
    if (user.role === Role.ADMIN) {
      return;
    }

    if (!ownerId || ownerId !== user.userId) {
      throw new ForbiddenException("You can only view your own royalties");
    }
  }
}
