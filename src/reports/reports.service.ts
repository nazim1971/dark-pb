import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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

  async getRoyaltiesReport(query: RoyaltyQueryDto) {
    const [records, analytics] = await Promise.all([
      this.royaltiesService.list(query),
      this.royaltiesService.analytics(query),
    ]);

    return {
      filters: query,
      records,
      analytics,
    };
  }

  async exportRoyaltiesReport(
    query: RoyaltyQueryDto,
    format: ExportFormat,
  ): Promise<ExportArtifact> {
    return this.royaltiesService.export(query, format);
  }

  async getStatementsReport(query: StatementQueryDto) {
    const statements = await this.statementsService.list(query);

    return {
      filters: query,
      statements,
    };
  }

  async exportStatementsReport(
    query: StatementQueryDto,
    format: ExportFormat,
  ): Promise<ExportArtifact> {
    return this.statementsService.export(query, format);
  }

  async getAdminReport(filters: AdminReportFilters) {
    const createdAt = this.buildCreatedAtFilter(filters);

    const [
      pendingKyc,
      submittedWorks,
      unresolvedConflicts,
      openTickets,
      recentActivity,
      generatedReports,
    ] = await Promise.all([
      this.prisma.kYC.count({ where: { status: "PENDING" } }),
      this.prisma.composition.count({
        where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] }, createdAt },
      }),
      this.prisma.conflict.count({
        where: { status: { in: ["OPEN", "UNDER_REVIEW"] }, createdAt },
      }),
      this.prisma.ticket.count({
        where: { status: { in: ["OPEN", "IN_PROGRESS", "WAITING_FOR_USER"] }, createdAt },
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
        submittedWorks,
        unresolvedConflicts,
        openTickets,
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
        publishers: {
          include: {
            publisher: true,
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
      publishers: work.publishers.map((relation) => ({
        name: relation.publisher.publisherName,
        ipi: relation.publisher.ipi,
        share: relation.sharePercentage ? Number(relation.sharePercentage) : null,
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
