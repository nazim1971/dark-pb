import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  AuditAction,
  AuditEntityType,
  KycStatus,
  Prisma,
  Role,
  SongStatus,
  StatementStatus,
  UserStatus,
} from "@prisma/client";
import { AuthenticatedUser } from "../auth/interfaces/token-payload.interface";
import { buildPaginatedDataResponse } from "../common/helpers/response.helper";
import {
  buildPagination,
  buildPrismaDateRangeFilter,
  buildSearchContainsFilter,
} from "../prisma/query-helpers";
import { PrismaService } from "../prisma/prisma.service";
import { ReportsService } from "../reports/reports.service";
import { RoyaltyQueryDto } from "../royalties/dto/royalty-query.dto";
import { RoyaltiesService } from "../royalties/royalties.service";
import { StatementQueryDto } from "../statements/dto/statement-query.dto";
import { StatementsService } from "../statements/statements.service";
import { AdminActionDto } from "./dto/admin-action.dto";
import { AddIpiDto } from "./dto/add-ipi.dto";
import { AddIswcDto } from "./dto/add-iswc.dto";
import { AdminActivityQueryDto } from "./dto/admin-activity-query.dto";
import { AdminDashboardQueryDto } from "./dto/admin-dashboard-query.dto";
import { AdminKycQueryDto } from "./dto/admin-kyc-query.dto";
import { AdminReportQueryDto } from "./dto/admin-report-query.dto";
import { AdminSongsQueryDto } from "./dto/admin-songs-query.dto";
import { AdminUsersQueryDto } from "./dto/admin-users-query.dto";
import { EditWorkMetadataDto } from "./dto/edit-work-metadata.dto";
import { UpdateSongStatusDto } from "./dto/update-song-status.dto";
import { UpdateStatementStatusDto } from "./dto/update-statement-status.dto";

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reportsService: ReportsService,
    private readonly royaltiesService: RoyaltiesService,
    private readonly statementsService: StatementsService,
  ) {}

  async getDashboardStats(query: AdminDashboardQueryDto) {
    const createdAt = buildPrismaDateRangeFilter(query.from, query.to);
    const createdAtFilter = createdAt ? { createdAt } : {};

    const [
      totalUsers,
      songwriters,
      publishers,
      recordLabels,
      pendingKyc,
      verifiedKyc,
      songs,
      royalties,
      statements,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { deletedAt: null, role: Role.SONGWRITER } }),
      this.prisma.user.count({ where: { deletedAt: null, role: Role.PUBLISHER } }),
      this.prisma.user.count({ where: { deletedAt: null, role: Role.RECORD_LABEL } }),
      this.prisma.kYC.count({ where: { deletedAt: null, status: KycStatus.PENDING } }),
      this.prisma.kYC.count({ where: { deletedAt: null, status: KycStatus.VERIFIED } }),
      this.prisma.composition.count({ where: { deletedAt: null, ...createdAtFilter } }),
      this.prisma.royalty.count({ where: { deletedAt: null, ...createdAtFilter } }),
      this.prisma.statement.count({ where: { deletedAt: null, ...createdAtFilter } }),
    ]);

    return {
      stats: {
        totalUsers,
        songwriters,
        publishers,
        recordLabels,
        pendingKyc,
        verifiedKyc,
        songs,
        royalties,
        statements,
      },
      filters: {
        from: query.from ?? null,
        to: query.to ?? null,
      },
    };
  }

  async getDashboardAnalytics(query: AdminDashboardQueryDto) {
    const from = query.from ?? new Date(new Date().setUTCMonth(new Date().getUTCMonth() - 11));
    const to = query.to ?? new Date();
    const createdAt = buildPrismaDateRangeFilter(from, to);

    const [songRows, royaltyRows, statementRows] = await Promise.all([
      this.prisma.composition.findMany({
        where: {
          deletedAt: null,
          ...(createdAt ? { createdAt } : {}),
        },
        select: { createdAt: true },
      }),
      this.prisma.royalty.findMany({
        where: {
          deletedAt: null,
          ...(createdAt ? { createdAt } : {}),
        },
        select: { createdAt: true, amount: true },
      }),
      this.prisma.statement.findMany({
        where: {
          deletedAt: null,
          ...(createdAt ? { createdAt } : {}),
        },
        select: { createdAt: true, totalAmount: true },
      }),
    ]);

    const songSeries = this.aggregateByMonth(songRows, () => 0);
    const royaltySeries = this.aggregateByMonth(royaltyRows, (row) => Number(row.amount));
    const statementSeries = this.aggregateByMonth(statementRows, (row) => Number(row.totalAmount));

    return {
      from,
      to,
      songs: songSeries.map((row) => ({
        year: row.year,
        month: row.month,
        count: row.count,
      })),
      royalties: royaltySeries.map((row) => ({
        year: row.year,
        month: row.month,
        count: row.count,
        grossAmount: row.totalAmount,
      })),
      statements: statementSeries.map((row) => ({
        year: row.year,
        month: row.month,
        count: row.count,
        totalAmount: row.totalAmount,
      })),
    };
  }

  private aggregateByMonth<T extends { createdAt: Date }>(
    rows: T[],
    getAmount: (row: T) => number,
  ): Array<{ year: number; month: number; count: number; totalAmount: number }> {
    const bucket = new Map<
      string,
      { year: number; month: number; count: number; totalAmount: number }
    >();

    for (const row of rows) {
      const year = row.createdAt.getUTCFullYear();
      const month = row.createdAt.getUTCMonth() + 1;
      const key = `${year}-${String(month).padStart(2, "0")}`;
      const current = bucket.get(key) ?? { year, month, count: 0, totalAmount: 0 };
      current.count += 1;
      current.totalAmount += getAmount(row);
      bucket.set(key, current);
    }

    return Array.from(bucket.values()).sort((a, b) =>
      a.year === b.year ? a.month - b.month : a.year - b.year,
    );
  }

  async listUsers(query: AdminUsersQueryDto) {
    const pagination = buildPagination(query);

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(query.role ? { role: query.role } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.registrationType ? { registrationType: query.registrationType } : {}),
      ...buildSearchContainsFilter(
        ["email", "firstName", "lastName", "legalName", "stageName"],
        query.search,
      ),
    };

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip: pagination.skip,
        take: pagination.take,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          legalName: true,
          stageName: true,
          role: true,
          status: true,
          registrationType: true,
          country: true,
          phone: true,
          createdAt: true,
          updatedAt: true,
          kycProfile: {
            select: {
              id: true,
              status: true,
              submittedAt: true,
              reviewedAt: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return buildPaginatedDataResponse(rows, pagination.page, pagination.limit, total);
  }

  async activateUser(adminUser: AuthenticatedUser, userId: string, dto: AdminActionDto) {
    return this.setUserStatus(adminUser, userId, UserStatus.ACTIVE, dto.note);
  }

  async suspendUser(adminUser: AuthenticatedUser, userId: string, dto: AdminActionDto) {
    return this.setUserStatus(adminUser, userId, UserStatus.SUSPENDED, dto.note);
  }

  async listKyc(query: AdminKycQueryDto) {
    const pagination = buildPagination(query);
    const where: Prisma.KYCWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              ...(buildSearchContainsFilter(["documentType", "documentNumber"], query.search).OR as
                Prisma.KYCWhereInput[]),
              {
                user: {
                  is: buildSearchContainsFilter(
                    ["email", "firstName", "lastName"],
                    query.search,
                  ) as Prisma.UserWhereInput,
                },
              },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.kYC.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
          reviewedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: [{ submittedAt: "desc" }],
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.kYC.count({ where }),
    ]);

    return buildPaginatedDataResponse(rows, pagination.page, pagination.limit, total);
  }

  async listSongs(query: AdminSongsQueryDto) {
    const pagination = buildPagination(query);

    const where: Prisma.CompositionWhereInput = {
      deletedAt: null,
      ...(query.status ? { songStatus: query.status } : {}),
      ...(query.released !== undefined ? { released: query.released } : {}),
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
      ...buildSearchContainsFilter(
        ["songTitle", "alternativeTitle", "artistName", "isrc", "dlrpId"],
        query.search,
      ),
    };

    const [rows, total] = await Promise.all([
      this.prisma.composition.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          writers: {
            where: { deletedAt: null },
            include: {
              writer: {
                select: {
                  id: true,
                  legalName: true,
                  stageName: true,
                  ipiNumber: true,
                },
              },
            },
          },
        },
        orderBy: [{ updatedAt: "desc" }],
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.composition.count({ where }),
    ]);

    return buildPaginatedDataResponse(rows, pagination.page, pagination.limit, total);
  }

  async updateSongStatus(adminUser: AuthenticatedUser, songId: string, dto: UpdateSongStatusDto) {
    const song = await this.prisma.composition.findUnique({ where: { id: songId } });

    if (!song || song.deletedAt) {
      throw new NotFoundException("Song not found");
    }

    const updated = await this.prisma.composition.update({
      where: { id: songId },
      data: {
        songStatus: dto.status,
      },
    });

    await this.logAudit(
      adminUser,
      AuditAction.UPDATE,
      AuditEntityType.COMPOSITION,
      songId,
      dto.note?.trim() || `Song status updated to ${dto.status}`,
      {
        previousStatus: song.songStatus,
        nextStatus: dto.status,
      },
    );

    return updated;
  }

  async listRoyalties(adminUser: AuthenticatedUser, query: RoyaltyQueryDto) {
    return this.royaltiesService.list(adminUser, query);
  }

  async listStatements(adminUser: AuthenticatedUser, query: StatementQueryDto) {
    return this.statementsService.list(adminUser, query);
  }

  async updateStatementStatus(
    adminUser: AuthenticatedUser,
    statementId: string,
    dto: UpdateStatementStatusDto,
  ) {
    const statement = await this.prisma.statement.findUnique({ where: { id: statementId } });

    if (!statement || statement.deletedAt) {
      throw new NotFoundException("Statement not found");
    }

    const updated = await this.prisma.statement.update({
      where: { id: statementId },
      data: {
        status: dto.status,
      },
    });

    await this.logAudit(
      adminUser,
      AuditAction.UPDATE,
      AuditEntityType.STATEMENT,
      statementId,
      dto.note?.trim() || `Statement status updated to ${dto.status}`,
      {
        previousStatus: statement.status,
        nextStatus: dto.status,
      },
    );

    return updated;
  }

  async approveKyc(adminUser: AuthenticatedUser, kycId: string, dto: AdminActionDto) {
    const kyc = await this.prisma.kYC.findUnique({ where: { id: kycId } });

    if (!kyc) {
      throw new NotFoundException("KYC record not found");
    }

    const updated = await this.prisma.kYC.update({
      where: { id: kycId },
      data: {
        status: KycStatus.VERIFIED,
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
      { status: KycStatus.VERIFIED },
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
      { status: KycStatus.REJECTED },
    );

    return updated;
  }

  async editSongMetadata(
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
      "Song metadata updated",
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
      { iswc: dto.iswc },
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
      { ipi: dto.ipi },
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
    const pagination = buildPagination(query);
    const where: Prisma.AuditLogWhereInput = {
      action: query.action,
      entityType: query.entityType,
    };

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return buildPaginatedDataResponse(rows, pagination.page, pagination.limit, total);
  }

  async getAllUsers(query: { page: number; limit: number }) {
    return this.listUsers({
      page: Math.max(1, query.page || 1),
      limit: Math.min(100, Math.max(1, query.limit || 10)),
    });
  }

  private async setUserStatus(
    adminUser: AuthenticatedUser,
    userId: string,
    nextStatus: UserStatus,
    note?: string,
  ) {
    if (adminUser.userId === userId) {
      throw new BadRequestException("You cannot change your own status");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { status: nextStatus },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    await this.logAudit(
      adminUser,
      AuditAction.UPDATE,
      AuditEntityType.USER,
      userId,
      note?.trim() || `User status changed to ${nextStatus}`,
      {
        previousStatus: user.status,
        nextStatus,
      },
    );

    return updated;
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
