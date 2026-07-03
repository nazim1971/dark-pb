import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, RoyaltyStatus, StatementStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { buildPagination } from "../prisma/query-helpers";
import {
  buildExportArtifact,
  ExportArtifact,
  ExportFormat,
  ExportRow,
} from "../reports/export.utils";
import { RoyaltiesService } from "../royalties/royalties.service";
import { GenerateStatementDto } from "./dto/generate-statement.dto";
import { StatementQueryDto } from "./dto/statement-query.dto";

type StatementWithRelations = Prisma.StatementGetPayload<{
  include: {
    user: { select: { id: true; firstName: true; lastName: true; email: true } };
    company: { select: { id: true; name: true } };
    royalties: {
      include: {
        royalty: {
          include: {
            composition: { select: { songTitle: true } };
            writer: { select: { legalName: true; stageName: true } };
            publisher: { select: { publisherName: true } };
          };
        };
      };
    };
  };
}>;

@Injectable()
export class StatementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly royaltiesService: RoyaltiesService,
  ) {}

  async generate(requestUserId: string, dto: GenerateStatementDto) {
    const statementUserId = dto.userId ?? requestUserId;
    const statementUser = await this.prisma.user.findUnique({ where: { id: statementUserId } });

    if (!statementUser) {
      throw new NotFoundException("Statement user not found");
    }

    const periodKeys = this.buildPeriodKeys(dto.periodStart, dto.periodEnd);
    const royalties = await this.royaltiesService.getStatementCandidateRoyalties({
      compositionId: dto.compositionId,
      song: dto.song,
      country: dto.country,
      dsp: dto.dsp,
      type: dto.type,
      status: dto.status,
      periodKeys,
    });

    if (royalties.length === 0) {
      throw new BadRequestException("No royalties matched the supplied statement filters");
    }

    const currency = dto.currency?.toUpperCase() ?? royalties[0].currency ?? "USD";
    const totalAmount = royalties.reduce(
      (sum, royalty) => sum + this.getNetAmount(royalty.amount, royalty.sharePercentage),
      0,
    );
    const pendingRoyaltyIds = royalties
      .filter((royalty) => royalty.status === RoyaltyStatus.PENDING)
      .map((royalty) => royalty.id);

    const statement = await this.prisma.runInTransaction(async (tx) => {
      const createdStatement = await tx.statement.create({
        data: {
          statementNo: this.generateStatementNo(),
          userId: statementUserId,
          companyId: dto.companyId ?? statementUser.companyId ?? null,
          periodStart: dto.periodStart,
          periodEnd: dto.periodEnd,
          status: StatementStatus.DRAFT,
          totalAmount: new Prisma.Decimal(totalAmount.toFixed(4)),
          currency,
        },
      });

      await tx.statementRoyalty.createMany({
        data: royalties.map((royalty) => ({
          statementId: createdStatement.id,
          royaltyId: royalty.id,
          allocatedAmount: new Prisma.Decimal(
            this.getNetAmount(royalty.amount, royalty.sharePercentage).toFixed(4),
          ),
        })),
      });

      if (pendingRoyaltyIds.length > 0) {
        await tx.royalty.updateMany({
          where: { id: { in: pendingRoyaltyIds } },
          data: { status: RoyaltyStatus.PROCESSED },
        });
      }

      return createdStatement;
    });

    return this.getById(statement.id);
  }

  async list(query: StatementQueryDto) {
    const where = this.buildWhere(query);
    const pagination = buildPagination(query);

    const [rows, total, aggregate] = await Promise.all([
      this.prisma.statement.findMany({
        where,
        include: this.statementInclude,
        orderBy: [{ generatedAt: "desc" }, { createdAt: "desc" }],
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.statement.count({ where }),
      this.prisma.statement.aggregate({
        where,
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
    ]);

    return {
      data: rows.map((row) => this.mapStatement(row)),
      meta: {
        page: query.page ?? 1,
        limit: query.limit ?? 20,
        total,
      },
      summary: {
        totalAmount: this.decimalToNumber(aggregate._sum.totalAmount),
        statementCount: aggregate._count._all,
      },
    };
  }

  async getById(id: string) {
    const statement = await this.prisma.statement.findUnique({
      where: { id },
      include: this.statementInclude,
    });

    if (!statement) {
      throw new NotFoundException("Statement not found");
    }

    return this.mapStatement(statement);
  }

  async export(query: StatementQueryDto, format: ExportFormat): Promise<ExportArtifact> {
    const rows = await this.prisma.statement.findMany({
      where: this.buildWhere(query),
      include: this.statementInclude,
      orderBy: [{ generatedAt: "desc" }, { createdAt: "desc" }],
    });

    return buildExportArtifact(
      "Statements",
      this.buildStatementListFileName(query),
      rows.map((row) => this.mapStatementToExportRow(row)),
      format,
    );
  }

  async exportById(id: string, format: ExportFormat): Promise<ExportArtifact> {
    const statement = await this.prisma.statement.findUnique({
      where: { id },
      include: this.statementInclude,
    });

    if (!statement) {
      throw new NotFoundException("Statement not found");
    }

    const rows = statement.royalties.map((entry) => ({
      statementNo: statement.statementNo,
      song: entry.royalty.composition?.songTitle ?? "",
      type: entry.royalty.type,
      status: entry.royalty.status,
      month: entry.royalty.periodMonth,
      year: entry.royalty.periodYear,
      country: entry.royalty.country ?? "",
      dsp: entry.royalty.sourceDsp ?? "",
      writer: entry.royalty.writer?.stageName ?? entry.royalty.writer?.legalName ?? "",
      publisher: entry.royalty.publisher?.publisherName ?? "",
      grossAmount: this.decimalToNumber(entry.royalty.amount).toFixed(4),
      allocatedAmount: this.decimalToNumber(entry.allocatedAmount).toFixed(4),
      currency: statement.currency,
    }));

    return buildExportArtifact(
      `Statement ${statement.statementNo}`,
      `statement-${statement.statementNo.toLowerCase()}`,
      rows,
      format,
    );
  }

  private readonly statementInclude = {
    user: { select: { id: true, firstName: true, lastName: true, email: true } },
    company: { select: { id: true, name: true } },
    royalties: {
      include: {
        royalty: {
          include: {
            composition: { select: { songTitle: true } },
            writer: { select: { legalName: true, stageName: true } },
            publisher: { select: { publisherName: true } },
          },
        },
      },
    },
  } satisfies Prisma.StatementInclude;

  private buildWhere(query: Partial<StatementQueryDto>): Prisma.StatementWhereInput {
    const where: Prisma.StatementWhereInput = {};
    const royaltyFilter: Prisma.RoyaltyWhereInput = {};

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.companyId) {
      where.companyId = query.companyId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.song) {
      royaltyFilter.composition = {
        is: {
          songTitle: {
            contains: query.song,
            mode: "insensitive",
          },
        },
      };
    }

    if (query.country) {
      royaltyFilter.country = {
        contains: query.country,
        mode: "insensitive",
      };
    }

    if (query.dsp) {
      royaltyFilter.sourceDsp = {
        contains: query.dsp,
        mode: "insensitive",
      };
    }

    if (query.month) {
      royaltyFilter.periodMonth = query.month;
    }

    if (query.year) {
      royaltyFilter.periodYear = query.year;
    }

    if (Object.keys(royaltyFilter).length > 0) {
      where.royalties = {
        some: {
          royalty: royaltyFilter,
        },
      };
    }

    return where;
  }

  private buildPeriodKeys(
    periodStart: Date,
    periodEnd: Date,
  ): Array<{ periodYear: number; periodMonth: number }> {
    const cursor = new Date(Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth(), 1));
    const end = new Date(Date.UTC(periodEnd.getUTCFullYear(), periodEnd.getUTCMonth(), 1));
    const keys: Array<{ periodYear: number; periodMonth: number }> = [];

    while (cursor <= end) {
      keys.push({
        periodYear: cursor.getUTCFullYear(),
        periodMonth: cursor.getUTCMonth() + 1,
      });
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }

    return keys;
  }

  private generateStatementNo(): string {
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:TZ.]/g, "")
      .slice(0, 14);
    const suffix = Math.floor(Math.random() * 9000 + 1000);
    return `STM-${timestamp}-${suffix}`;
  }

  private mapStatement(statement: StatementWithRelations) {
    return {
      id: statement.id,
      statementNo: statement.statementNo,
      userId: statement.userId,
      user: {
        id: statement.user.id,
        name: `${statement.user.firstName} ${statement.user.lastName}`.trim(),
        email: statement.user.email,
      },
      company: statement.company,
      periodStart: statement.periodStart,
      periodEnd: statement.periodEnd,
      status: statement.status,
      totalAmount: this.decimalToNumber(statement.totalAmount),
      currency: statement.currency,
      generatedAt: statement.generatedAt,
      createdAt: statement.createdAt,
      royaltyCount: statement.royalties.length,
      royalties: statement.royalties.map((entry) => ({
        id: entry.royalty.id,
        song: entry.royalty.composition?.songTitle ?? null,
        type: entry.royalty.type,
        status: entry.royalty.status,
        periodMonth: entry.royalty.periodMonth,
        periodYear: entry.royalty.periodYear,
        country: entry.royalty.country,
        dsp: entry.royalty.sourceDsp,
        grossAmount: this.decimalToNumber(entry.royalty.amount),
        allocatedAmount: this.decimalToNumber(entry.allocatedAmount),
      })),
    };
  }

  private mapStatementToExportRow(statement: StatementWithRelations): ExportRow {
    return {
      statementNo: statement.statementNo,
      user: `${statement.user.firstName} ${statement.user.lastName}`.trim(),
      email: statement.user.email,
      company: statement.company?.name ?? "",
      periodStart: statement.periodStart.toISOString().slice(0, 10),
      periodEnd: statement.periodEnd.toISOString().slice(0, 10),
      status: statement.status,
      totalAmount: this.decimalToNumber(statement.totalAmount).toFixed(4),
      currency: statement.currency,
      royaltyCount: statement.royalties.length,
      generatedAt: statement.generatedAt.toISOString(),
    };
  }

  private buildStatementListFileName(query: Partial<StatementQueryDto>): string {
    const segments = ["statements"];

    if (query.year) {
      segments.push(String(query.year));
    }

    if (query.month) {
      segments.push(String(query.month).padStart(2, "0"));
    }

    if (query.status) {
      segments.push(query.status.toLowerCase());
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
