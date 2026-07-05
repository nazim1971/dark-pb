import { Injectable } from "@nestjs/common";
import { Prisma, SongStatus } from "@prisma/client";
import { AuthenticatedUser } from "../auth/interfaces/token-payload.interface";
import { PrismaService } from "../prisma/prisma.service";
import { StatementsService } from "../statements/statements.service";
import { StatementQueryDto } from "../statements/dto/statement-query.dto";
import { RoyaltiesService } from "../royalties/royalties.service";
import { RoyaltyQueryDto } from "../royalties/dto/royalty-query.dto";
import { ExportArtifact, ExportFormat } from "./export.utils";
import { buildAdminCsvExport, buildCwrArtifact } from "../admin/admin-export.utils";

export interface AdminReportFilters {
  from?: Date;
  to?: Date;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly royaltiesService: RoyaltiesService,
    private readonly statementsService: StatementsService,
  ) {}

  async getRoyaltiesReport(user: AuthenticatedUser, query: RoyaltyQueryDto) {
    const [records, analytics] = await Promise.all([
      this.royaltiesService.list(user, query),
      this.royaltiesService.analytics(user, query),
    ]);

    return {
      filters: query,
      records,
      analytics,
    };
  }

  async exportRoyaltiesReport(
    user: AuthenticatedUser,
    query: RoyaltyQueryDto,
    format: ExportFormat,
  ): Promise<ExportArtifact> {
    return this.royaltiesService.export(user, query, format);
  }

  async getStatementsReport(user: AuthenticatedUser, query: StatementQueryDto) {
    const statements = await this.statementsService.list(user, query);

    return {
      filters: query,
      statements,
    };
  }

  async exportStatementsReport(
    user: AuthenticatedUser,
    query: StatementQueryDto,
    format: ExportFormat,
  ): Promise<ExportArtifact> {
    return this.statementsService.export(user, query, format);
  }

  async getAdminReport(filters: AdminReportFilters) {
    const createdAt = this.buildCreatedAtFilter(filters);

    const [pendingKyc, submittedSongs, recentActivity, generatedReports] = await Promise.all([
      this.prisma.kYC.count({ where: { status: "PENDING" } }),
      this.prisma.composition.count({
        where: {
          songStatus: { in: [SongStatus.SUBMITTED, SongStatus.PROCESSING] },
          ...(createdAt ? { createdAt } : {}),
        },
      }),
      this.prisma.auditLog.findMany({
          where: { createdAt },
          orderBy: [{ createdAt: "desc" }],
          take: 20,
      }),
      this.prisma.auditLog.count({
        where: {
          action: "EXPORT",
          createdAt,
        },
      }),
    ]);

    return {
      summary: {
        pendingKyc,
        submittedSongs,
        generatedReports,
      },
      activity: recentActivity,
    };
  }

  async exportAdminReport(
    filters: AdminReportFilters,
    format: "csv" | "cwr",
  ): Promise<ExportArtifact> {
    if (format === "cwr") {
      return this.exportCwr(filters);
    }

    const createdAt = this.buildCreatedAtFilter(filters);
    const logs = await this.prisma.auditLog.findMany({
      where: { createdAt },
      orderBy: [{ createdAt: "desc" }],
      take: 2000,
    });

    const rows = logs.map((log) => ({
      createdAt: log.createdAt.toISOString(),
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId ?? "",
      actorId: log.actorId ?? "",
      summary: log.summary ?? "",
    }));

    return buildAdminCsvExport(rows, "admin-activity-report");
  }

  private async exportCwr(filters: AdminReportFilters): Promise<ExportArtifact> {
    const createdAt = this.buildCreatedAtFilter(filters);

    const works = await this.prisma.composition.findMany({
      where: { createdAt },
      include: {
        writers: {
          include: {
            writer: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 1000,
    });

    const cwrRows = works.map((work) => ({
      workTitle: work.songTitle,
      iswc: work.iswc,
      isrc: work.isrc,
      writers: work.writers.map((relation) => ({
        name: relation.writer.stageName ?? relation.writer.legalName,
        ipi: relation.writer.ipiNumber,
        share: Number(relation.writerShare),
      })),
      publishers: work.writers
        .filter((relation) => relation.controlledPublisher)
        .map((relation) => ({
          name: relation.controlledPublisher ?? "",
          ipi: null,
          share: relation.publisherShare ? Number(relation.publisherShare) : null,
        })),
    }));

    return buildCwrArtifact(cwrRows, "admin-cwr-report");
  }

  private buildCreatedAtFilter(filters: AdminReportFilters): Prisma.DateTimeFilter | undefined {
    if (!filters.from && !filters.to) {
      return undefined;
    }

    return {
      gte: filters.from,
      lte: filters.to,
    };
  }
}
