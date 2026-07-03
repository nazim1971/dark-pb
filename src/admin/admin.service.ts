import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  AuditAction,
  AuditEntityType,
  ConflictStatus,
  KycStatus,
  PublishingStatus,
  Prisma,
} from "@prisma/client";
import { AuthenticatedUser } from "../auth/interfaces/token-payload.interface";
import { PrismaService } from "../prisma/prisma.service";
import { ReportsService } from "../reports/reports.service";
import { AdminActionDto } from "./dto/admin-action.dto";
import { AddIpiDto } from "./dto/add-ipi.dto";
import { AddIswcDto } from "./dto/add-iswc.dto";
import { AdminActivityQueryDto } from "./dto/admin-activity-query.dto";
import { AdminReportQueryDto } from "./dto/admin-report-query.dto";
import { EditWorkMetadataDto } from "./dto/edit-work-metadata.dto";

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportsService: ReportsService,
  ) {}

  async approveKyc(adminUser: AuthenticatedUser, kycId: string, dto: AdminActionDto) {
    const kyc = await this.prisma.kYC.findUnique({ where: { id: kycId } });

    if (!kyc) {
      throw new NotFoundException("KYC record not found");
    }

    const updated = await this.prisma.kYC.update({
      where: { id: kycId },
      data: {
        status: KycStatus.APPROVED,
        reviewedAt: new Date(),
        reviewedById: adminUser.userId,
        notes: dto.note,
      },
    });

    await this.logAudit(
      adminUser,
      AuditAction.APPROVE,
      AuditEntityType.KYC,
      kycId,
      dto.note ?? "KYC approved",
      {
        status: KycStatus.APPROVED,
      },
    );

    return updated;
  }

  async rejectKyc(adminUser: AuthenticatedUser, kycId: string, dto: AdminActionDto) {
    const kyc = await this.prisma.kYC.findUnique({ where: { id: kycId } });

    if (!kyc) {
      throw new NotFoundException("KYC record not found");
    }

    const updated = await this.prisma.kYC.update({
      where: { id: kycId },
      data: {
        status: KycStatus.REJECTED,
        reviewedAt: new Date(),
        reviewedById: adminUser.userId,
        notes: dto.note,
      },
    });

    await this.logAudit(
      adminUser,
      AuditAction.REJECT,
      AuditEntityType.KYC,
      kycId,
      dto.note ?? "KYC rejected",
      {
        status: KycStatus.REJECTED,
      },
    );

    return updated;
  }

  async approveWork(adminUser: AuthenticatedUser, compositionId: string, dto: AdminActionDto) {
    const composition = await this.prisma.composition.findUnique({ where: { id: compositionId } });

    if (!composition) {
      throw new NotFoundException("Composition not found");
    }

    if (
      composition.status !== PublishingStatus.SUBMITTED &&
      composition.status !== PublishingStatus.UNDER_REVIEW
    ) {
      throw new BadRequestException("Only submitted works can be approved");
    }

    const updated = await this.prisma.composition.update({
      where: { id: compositionId },
      data: { status: PublishingStatus.PUBLISHED },
    });

    await this.logAudit(
      adminUser,
      AuditAction.APPROVE,
      AuditEntityType.COMPOSITION,
      compositionId,
      dto.note ?? "Work approved",
      { status: PublishingStatus.PUBLISHED },
    );

    return updated;
  }

  async rejectWork(adminUser: AuthenticatedUser, compositionId: string, dto: AdminActionDto) {
    const composition = await this.prisma.composition.findUnique({ where: { id: compositionId } });

    if (!composition) {
      throw new NotFoundException("Composition not found");
    }

    if (
      composition.status !== PublishingStatus.SUBMITTED &&
      composition.status !== PublishingStatus.UNDER_REVIEW
    ) {
      throw new BadRequestException("Only submitted works can be rejected");
    }

    const updated = await this.prisma.composition.update({
      where: { id: compositionId },
      data: { status: PublishingStatus.REJECTED },
    });

    await this.logAudit(
      adminUser,
      AuditAction.REJECT,
      AuditEntityType.COMPOSITION,
      compositionId,
      dto.note ?? "Work rejected",
      { status: PublishingStatus.REJECTED },
    );

    return updated;
  }

  async editWorkMetadata(
    adminUser: AuthenticatedUser,
    compositionId: string,
    dto: EditWorkMetadataDto,
  ) {
    const composition = await this.prisma.composition.findUnique({ where: { id: compositionId } });

    if (!composition) {
      throw new NotFoundException("Composition not found");
    }

    const updated = await this.prisma.composition.update({
      where: { id: compositionId },
      data: {
        songTitle: dto.songTitle,
        alternativeTitle: dto.alternativeTitle,
        language: dto.language,
        genre: dto.genre,
        isrc: dto.isrc,
        spotifyUrl: dto.spotifyUrl,
        appleMusicUrl: dto.appleMusicUrl,
        youtubeUrl: dto.youtubeUrl,
        releaseDate: dto.releaseDate,
        version: dto.version,
      },
    });

    await this.logAudit(
      adminUser,
      AuditAction.UPDATE,
      AuditEntityType.COMPOSITION,
      compositionId,
      "Work metadata updated",
      dto as unknown as Record<string, unknown>,
    );

    return updated;
  }

  async addIswc(adminUser: AuthenticatedUser, compositionId: string, dto: AddIswcDto) {
    const composition = await this.prisma.composition.findUnique({ where: { id: compositionId } });

    if (!composition) {
      throw new NotFoundException("Composition not found");
    }

    const updated = await this.prisma.composition.update({
      where: { id: compositionId },
      data: { iswc: dto.iswc },
    });

    await this.logAudit(
      adminUser,
      AuditAction.UPDATE,
      AuditEntityType.COMPOSITION,
      compositionId,
      "ISWC added",
      {
        iswc: dto.iswc,
      },
    );

    return updated;
  }

  async addWriterIpi(adminUser: AuthenticatedUser, writerId: string, dto: AddIpiDto) {
    const writer = await this.prisma.writer.findUnique({ where: { id: writerId } });

    if (!writer) {
      throw new NotFoundException("Writer not found");
    }

    const updated = await this.prisma.writer.update({
      where: { id: writerId },
      data: { ipiNumber: dto.ipi },
    });

    await this.logAudit(
      adminUser,
      AuditAction.UPDATE,
      AuditEntityType.WRITER,
      writerId,
      "Writer IPI added",
      {
        ipi: dto.ipi,
      },
    );

    return updated;
  }

  async addPublisherIpi(adminUser: AuthenticatedUser, publisherId: string, dto: AddIpiDto) {
    const publisher = await this.prisma.publisher.findUnique({ where: { id: publisherId } });

    if (!publisher) {
      throw new NotFoundException("Publisher not found");
    }

    const updated = await this.prisma.publisher.update({
      where: { id: publisherId },
      data: { ipi: dto.ipi },
    });

    await this.logAudit(
      adminUser,
      AuditAction.UPDATE,
      AuditEntityType.PUBLISHER,
      publisherId,
      "Publisher IPI added",
      {
        ipi: dto.ipi,
      },
    );

    return updated;
  }

  async getDashboardReport(query: AdminReportQueryDto) {
    return this.reportsService.getAdminReport({
      from: query.from,
      to: query.to,
    });
  }

  async exportDashboardReport(adminUser: AuthenticatedUser, query: AdminReportQueryDto) {
    const artifact = await this.reportsService.exportAdminReport(
      {
        from: query.from,
        to: query.to,
      },
      query.format,
    );

    await this.logAudit(
      adminUser,
      AuditAction.EXPORT,
      AuditEntityType.NOTIFICATION,
      null,
      `Admin report exported (${query.format})`,
      {
        format: query.format,
        from: query.from?.toISOString() ?? null,
        to: query.to?.toISOString() ?? null,
      },
    );

    return artifact;
  }

  async getActivity(query: AdminActivityQueryDto) {
    const where: Prisma.AuditLogWhereInput = {
      action: query.action,
      entityType: query.entityType,
    };

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: rows,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
      },
    };
  }

  private async logAudit(
    adminUser: AuthenticatedUser,
    action: AuditAction,
    entityType: AuditEntityType,
    entityId: string | null,
    summary: string,
    changes: Record<string, unknown>,
  ): Promise<void> {
    const actor = await this.prisma.user.findUnique({
      where: { id: adminUser.userId },
      select: { companyId: true },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminUser.userId,
        companyId: actor?.companyId ?? null,
        action,
        entityType,
        entityId,
        summary,
        changes: changes as Prisma.InputJsonValue,
      },
    });
  }
}
