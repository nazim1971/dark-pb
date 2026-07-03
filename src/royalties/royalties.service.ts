import { Injectable } from "@nestjs/common";
import { Prisma, RoyaltyStatus, RoyaltyType } from "@prisma/client";
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

type RoyaltyWithRelations = Prisma.RoyaltyGetPayload<{
  include: {
    composition: { select: { id: true; songTitle: true } };
    recording: { select: { id: true; artist: true; isrc: true } };
    writer: { select: { id: true; legalName: true; stageName: true } };
    publisher: { select: { id: true; publisherName: true } };
    contract: { select: { id: true; contractNo: true; title: true } };
  };
}>;

export interface RoyaltySummary {
  totalGrossAmount: number;
  totalNetAmount: number;
  currency: string | null;
  recordCount: number;
}

@Injectable()
export class RoyaltiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRoyaltyDto) {
    const royalty = await this.prisma.royalty.create({
      data: {
        ...dto,
        currency: dto.currency?.toUpperCase() ?? "USD",
      },
      include: this.royaltyInclude,
    });

    return this.mapRoyalty(royalty);
  }

  async list(query: RoyaltyQueryDto) {
    const where = this.buildWhere(query);
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
      data: mappedRows,
      meta: {
        page: query.page ?? 1,
        limit: query.limit ?? 20,
        total,
      },
      summary: this.buildSummary(rows, aggregate._sum.amount),
    };
  }

  async analytics(query: RoyaltyQueryDto) {
    const where = this.buildWhere(query);

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
        averageSharePercentage: this.decimalToNumber(aggregate._avg.sharePercentage),
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

  async export(query: RoyaltyQueryDto, format: ExportFormat): Promise<ExportArtifact> {
    const rows = await this.prisma.royalty.findMany({
      where: this.buildWhere(query),
      include: this.royaltyInclude,
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }, { createdAt: "desc" }],
    });

    const exportRows = rows.map((row) => this.mapRoyaltyToExportRow(row));
    return buildExportArtifact("Royalties", this.buildRoyaltyFileName(query), exportRows, format);
  }

  async getStatementCandidateRoyalties(filters: {
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
        {
          compositionId: filters.compositionId,
          song: filters.song,
          country: filters.country,
          dsp: filters.dsp,
          type: filters.type,
          status: filters.status,
        },
        filters.periodKeys,
      ),
      include: this.royaltyInclude,
      orderBy: [{ periodYear: "asc" }, { periodMonth: "asc" }, { createdAt: "asc" }],
    });
  }

  private readonly royaltyInclude = {
    composition: { select: { id: true, songTitle: true } },
    recording: { select: { id: true, artist: true, isrc: true } },
    writer: { select: { id: true, legalName: true, stageName: true } },
    publisher: { select: { id: true, publisherName: true } },
    contract: { select: { id: true, contractNo: true, title: true } },
  } satisfies Prisma.RoyaltyInclude;

  private buildWhere(
    query: Partial<RoyaltyQueryDto>,
    periodKeys?: Array<{ periodYear: number; periodMonth: number }>,
  ): Prisma.RoyaltyWhereInput {
    const where: Prisma.RoyaltyWhereInput = {};

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
    return {
      totalGrossAmount: this.decimalToNumber(summedAmount),
      totalNetAmount: rows.reduce(
        (sum, row) => sum + this.getNetAmount(row.amount, row.sharePercentage),
        0,
      ),
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
      recordingArtist: row.recording?.artist ?? null,
      writerName: row.writer?.stageName ?? row.writer?.legalName ?? null,
      publisherName: row.publisher?.publisherName ?? null,
      contractNo: row.contract?.contractNo ?? null,
      sourceDsp: row.sourceDsp,
      country: row.country,
      usageDate: row.usageDate,
      periodYear: row.periodYear,
      periodMonth: row.periodMonth,
      amount: this.decimalToNumber(row.amount),
      netAmount: this.getNetAmount(row.amount, row.sharePercentage),
      currency: row.currency,
      sharePercentage: this.decimalToNumber(row.sharePercentage),
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
      netAmount: this.getNetAmount(row.amount, row.sharePercentage).toFixed(4),
      currency: row.currency,
      sharePercentage: this.decimalToNumber(row.sharePercentage).toFixed(2),
      writer: row.writer?.stageName ?? row.writer?.legalName ?? "",
      publisher: row.publisher?.publisherName ?? "",
      contractNo: row.contract?.contractNo ?? "",
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

  private getNetAmount(amount: Prisma.Decimal, sharePercentage: Prisma.Decimal): number {
    return (Number(amount) * Number(sharePercentage)) / 100;
  }
}
