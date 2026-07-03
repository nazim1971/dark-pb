import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditAction, AuditEntityType, ConflictStatus, Prisma, Role } from "@prisma/client";
import { AuthenticatedUser } from "../auth/interfaces/token-payload.interface";
import { PrismaService } from "../prisma/prisma.service";
import { buildPagination } from "../prisma/query-helpers";
import { ConflictQueryDto } from "./dto/conflict-query.dto";
import { CreateConflictDto } from "./dto/create-conflict.dto";
import { DetectConflictDto } from "./dto/detect-conflict.dto";
import { ResolveConflictDto } from "./dto/resolve-conflict.dto";
import { ReviewConflictDto } from "./dto/review-conflict.dto";
import { UpdateConflictDto } from "./dto/update-conflict.dto";

type ConflictWithRelations = Prisma.ConflictGetPayload<{
  include: {
    composition: { select: { id: true; songTitle: true } };
    reporter: { select: { id: true; firstName: true; lastName: true; email: true } };
  };
}>;

export interface ConflictTimelineEvent {
  event: string;
  note: string;
  status: ConflictStatus;
  at: Date;
  actorId: string | null;
}

@Injectable()
export class ConflictsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateConflictDto) {
    await this.ensureCompositionExists(dto.compositionId);

    const conflict = await this.prisma.conflict.create({
      data: {
        compositionId: dto.compositionId,
        reportingUserId: user.userId,
        conflictReason: dto.conflictReason,
        currentClaim: this.toDecimal(dto.currentClaim),
        ourClaim: this.toDecimal(dto.ourClaim),
        status: dto.status ?? ConflictStatus.OPEN,
      },
      include: this.conflictInclude,
    });

    await this.logAudit(user, AuditAction.CREATE, conflict.id, "Conflict created", {
      currentClaim: dto.currentClaim,
      ourClaim: dto.ourClaim,
      status: conflict.status,
    });

    return this.mapConflict(conflict);
  }

  async detect(user: AuthenticatedUser, dto: DetectConflictDto) {
    const composition = await this.prisma.composition.findUnique({
      where: { id: dto.compositionId },
      select: { id: true, songTitle: true },
    });

    if (!composition) {
      throw new NotFoundException("Composition not found");
    }

    const writerShares = await this.prisma.compositionWriter.aggregate({
      where: { compositionId: dto.compositionId },
      _sum: { writerShare: true },
    });
    const ourClaim = Number(writerShares._sum.writerShare ?? 0);
    const threshold = dto.threshold ?? 0.01;
    const diff = Math.abs(dto.currentClaim - ourClaim);
    const hasConflict = diff > threshold;

    if (!hasConflict) {
      return {
        detected: false,
        compositionId: composition.id,
        song: composition.songTitle,
        currentClaim: dto.currentClaim,
        ourClaim,
        difference: diff,
        threshold,
      };
    }

    const reason =
      dto.reason ??
      `Detected claim mismatch for ${composition.songTitle}: external ${dto.currentClaim}% vs internal ${ourClaim}%.`;

    const conflict = await this.prisma.conflict.create({
      data: {
        compositionId: dto.compositionId,
        reportingUserId: user.userId,
        conflictReason: reason,
        currentClaim: this.toDecimal(dto.currentClaim),
        ourClaim: this.toDecimal(ourClaim),
        status: ConflictStatus.OPEN,
      },
      include: this.conflictInclude,
    });

    await this.logAudit(user, AuditAction.CREATE, conflict.id, "Conflict auto-detected", {
      currentClaim: dto.currentClaim,
      ourClaim,
      difference: diff,
      threshold,
    });

    return {
      detected: true,
      difference: diff,
      threshold,
      conflict: this.mapConflict(conflict),
    };
  }

  async list(user: AuthenticatedUser, query: ConflictQueryDto) {
    const where = this.buildWhere(user, query);
    const pagination = buildPagination(query);

    const [rows, total] = await Promise.all([
      this.prisma.conflict.findMany({
        where,
        include: this.conflictInclude,
        orderBy: [{ createdAt: "desc" }],
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.conflict.count({ where }),
    ]);

    return {
      data: rows.map((row) => this.mapConflict(row)),
      meta: {
        page: query.page ?? 1,
        limit: query.limit ?? 20,
        total,
      },
    };
  }

  async getById(user: AuthenticatedUser, id: string) {
    const conflict = await this.prisma.conflict.findUnique({
      where: { id },
      include: this.conflictInclude,
    });

    if (!conflict) {
      throw new NotFoundException("Conflict not found");
    }

    this.assertCanAccess(user, conflict.reportingUserId);

    return {
      ...this.mapConflict(conflict),
      timeline: await this.getTimeline(id),
    };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateConflictDto) {
    const existing = await this.prisma.conflict.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException("Conflict not found");
    }

    this.assertCanModifyByReporter(user, existing.reportingUserId);

    if (existing.status !== ConflictStatus.OPEN) {
      throw new BadRequestException("Only open conflicts can be updated by reporter");
    }

    const updated = await this.prisma.conflict.update({
      where: { id },
      data: {
        conflictReason: dto.conflictReason,
        currentClaim: dto.currentClaim === undefined ? undefined : this.toDecimal(dto.currentClaim),
        ourClaim: dto.ourClaim === undefined ? undefined : this.toDecimal(dto.ourClaim),
      },
      include: this.conflictInclude,
    });

    await this.logAudit(user, AuditAction.UPDATE, id, "Conflict updated", {
      conflictReason: dto.conflictReason,
      currentClaim: dto.currentClaim,
      ourClaim: dto.ourClaim,
    });

    return this.mapConflict(updated);
  }

  async review(user: AuthenticatedUser, id: string, dto: ReviewConflictDto) {
    this.assertAdmin(user);

    const existing = await this.prisma.conflict.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Conflict not found");
    }

    if (
      existing.status === ConflictStatus.RESOLVED ||
      existing.status === ConflictStatus.REJECTED
    ) {
      throw new BadRequestException("Resolved conflicts cannot move back to review");
    }

    const reviewed = await this.prisma.conflict.update({
      where: { id },
      data: {
        status: ConflictStatus.UNDER_REVIEW,
      },
      include: this.conflictInclude,
    });

    await this.logAudit(
      user,
      AuditAction.UPDATE,
      id,
      dto.note?.trim() || "Conflict moved to under review",
      {
        status: ConflictStatus.UNDER_REVIEW,
      },
    );

    return this.mapConflict(reviewed);
  }

  async resolve(user: AuthenticatedUser, id: string, dto: ResolveConflictDto) {
    this.assertAdmin(user);

    const existing = await this.prisma.conflict.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Conflict not found");
    }

    if (dto.status !== ConflictStatus.RESOLVED && dto.status !== ConflictStatus.REJECTED) {
      throw new BadRequestException("Resolution status must be RESOLVED or REJECTED");
    }

    const resolved = await this.prisma.conflict.update({
      where: { id },
      data: {
        status: dto.status,
        resolutionNote: dto.resolutionNote,
        resolvedAt: new Date(),
      },
      include: this.conflictInclude,
    });

    await this.logAudit(
      user,
      dto.status === ConflictStatus.RESOLVED ? AuditAction.APPROVE : AuditAction.REJECT,
      id,
      dto.resolutionNote,
      {
        status: dto.status,
      },
    );

    return {
      ...this.mapConflict(resolved),
      timeline: await this.getTimeline(id),
    };
  }

  async getTimeline(id: string): Promise<ConflictTimelineEvent[]> {
    const conflict = await this.prisma.conflict.findUnique({ where: { id } });

    if (!conflict) {
      throw new NotFoundException("Conflict not found");
    }

    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        entityType: AuditEntityType.CONFLICT,
        entityId: id,
      },
      orderBy: [{ createdAt: "asc" }],
    });

    const timeline: ConflictTimelineEvent[] = [
      {
        event: "CONFLICT_CREATED",
        note: conflict.conflictReason,
        status: ConflictStatus.OPEN,
        at: conflict.createdAt,
        actorId: conflict.reportingUserId ?? null,
      },
      ...auditLogs.map((log) => ({
        event: `AUDIT_${log.action}`,
        note: log.summary ?? "Conflict updated",
        status: this.extractStatusFromAudit(log.changes, conflict.status),
        at: log.createdAt,
        actorId: log.actorId ?? null,
      })),
    ];

    if (conflict.resolvedAt) {
      timeline.push({
        event: "CONFLICT_RESOLVED",
        note: conflict.resolutionNote ?? "Conflict resolved",
        status: conflict.status,
        at: conflict.resolvedAt,
        actorId: null,
      });
    }

    return timeline.sort((a, b) => a.at.getTime() - b.at.getTime());
  }

  private readonly conflictInclude = {
    composition: { select: { id: true, songTitle: true } },
    reporter: { select: { id: true, firstName: true, lastName: true, email: true } },
  } satisfies Prisma.ConflictInclude;

  private async ensureCompositionExists(compositionId: string): Promise<void> {
    const composition = await this.prisma.composition.findUnique({
      where: { id: compositionId },
      select: { id: true },
    });

    if (!composition) {
      throw new NotFoundException("Composition not found");
    }
  }

  private buildWhere(user: AuthenticatedUser, query: ConflictQueryDto): Prisma.ConflictWhereInput {
    const where: Prisma.ConflictWhereInput = {};

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

    if (query.status) {
      where.status = query.status;
    }

    if (user.role !== Role.ADMIN) {
      where.reportingUserId = user.userId;
    }

    return where;
  }

  private mapConflict(conflict: ConflictWithRelations) {
    return {
      id: conflict.id,
      compositionId: conflict.compositionId,
      song: conflict.composition.songTitle,
      conflictReason: conflict.conflictReason,
      currentClaim: Number(conflict.currentClaim),
      ourClaim: Number(conflict.ourClaim),
      difference: Number(conflict.currentClaim) - Number(conflict.ourClaim),
      status: conflict.status,
      resolutionNote: conflict.resolutionNote,
      resolvedAt: conflict.resolvedAt,
      reporter: conflict.reporter
        ? {
            id: conflict.reporter.id,
            name: `${conflict.reporter.firstName} ${conflict.reporter.lastName}`.trim(),
            email: conflict.reporter.email,
          }
        : null,
      createdAt: conflict.createdAt,
      updatedAt: conflict.updatedAt,
    };
  }

  private assertAdmin(user: AuthenticatedUser): void {
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException("Admin role is required for this action");
    }
  }

  private assertCanAccess(user: AuthenticatedUser, reportingUserId: string | null): void {
    if (user.role === Role.ADMIN) {
      return;
    }

    if (!reportingUserId || reportingUserId !== user.userId) {
      throw new ForbiddenException("You can only access your own conflicts");
    }
  }

  private assertCanModifyByReporter(user: AuthenticatedUser, reportingUserId: string | null): void {
    if (user.role === Role.ADMIN) {
      return;
    }

    if (!reportingUserId || reportingUserId !== user.userId) {
      throw new ForbiddenException("You can only modify your own conflicts");
    }
  }

  private toDecimal(value: number): Prisma.Decimal {
    return new Prisma.Decimal(value.toFixed(2));
  }

  private extractStatusFromAudit(
    changes: Prisma.JsonValue | null,
    fallback: ConflictStatus,
  ): ConflictStatus {
    if (!changes || typeof changes !== "object" || Array.isArray(changes)) {
      return fallback;
    }

    const record = changes as Record<string, unknown>;
    const status = record.status;

    if (typeof status === "string") {
      if (
        status === ConflictStatus.OPEN ||
        status === ConflictStatus.UNDER_REVIEW ||
        status === ConflictStatus.RESOLVED ||
        status === ConflictStatus.REJECTED
      ) {
        return status;
      }
    }

    return fallback;
  }

  private async logAudit(
    user: AuthenticatedUser,
    action: AuditAction,
    entityId: string,
    summary: string,
    changes: Record<string, unknown>,
  ): Promise<void> {
    const userRecord = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { companyId: true },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: user.userId,
        companyId: userRecord?.companyId ?? null,
        action,
        entityType: AuditEntityType.CONFLICT,
        entityId,
        summary,
        changes: changes as Prisma.InputJsonValue,
      },
    });
  }
}
