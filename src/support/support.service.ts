import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditAction, AuditEntityType, Prisma, Role, TicketStatus } from "@prisma/client";
import { AuthenticatedUser } from "../auth/interfaces/token-payload.interface";
import { PrismaService } from "../prisma/prisma.service";
import { buildPagination } from "../prisma/query-helpers";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { TicketQueryDto } from "./dto/ticket-query.dto";
import { TicketReplyDto } from "./dto/ticket-reply.dto";
import { UpdateTicketStatusDto } from "./dto/update-ticket-status.dto";

type TicketWithRelations = Prisma.TicketGetPayload<{
  include: {
    user: { select: { id: true; firstName: true; lastName: true; email: true } };
    assignedTo: { select: { id: true; firstName: true; lastName: true; email: true } };
    replies: {
      include: {
        user: { select: { id: true; firstName: true; lastName: true; email: true } };
      };
    };
  };
}>;

export interface TicketHistoryEvent {
  event: string;
  message: string;
  actorId: string | null;
  at: Date;
}

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async createTicket(user: AuthenticatedUser, dto: CreateTicketDto) {
    const ticket = await this.prisma.ticket.create({
      data: {
        ticketNo: this.generateTicketNo(),
        userId: user.userId,
        subject: dto.subject,
        message: dto.message,
        category: dto.category,
        priority: dto.priority,
        status: TicketStatus.OPEN,
      },
      include: this.ticketInclude,
    });

    await this.logAudit(user, AuditAction.CREATE, ticket.id, "Support ticket created", {
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
    });

    return this.mapTicket(ticket);
  }

  async listTickets(user: AuthenticatedUser, query: TicketQueryDto) {
    const where = this.buildWhere(user, query);
    const pagination = buildPagination(query);

    const [rows, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        include: this.ticketInclude,
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      data: rows.map((row) => this.mapTicket(row)),
      meta: {
        page: query.page ?? 1,
        limit: query.limit ?? 20,
        total,
      },
    };
  }

  async getTicketById(user: AuthenticatedUser, id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: this.ticketInclude,
    });

    if (!ticket) {
      throw new NotFoundException("Ticket not found");
    }

    this.assertCanAccess(user, ticket.userId, ticket.assignedToId);

    return {
      ...this.mapTicket(ticket),
      history: await this.getTicketHistory(user, id),
    };
  }

  async addReply(user: AuthenticatedUser, id: string, dto: TicketReplyDto) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        assignedToId: true,
        status: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException("Ticket not found");
    }

    this.assertCanReply(user, ticket.userId, ticket.assignedToId);

    const isAdminReply = user.role === Role.ADMIN;

    await this.prisma.runInTransaction(async (tx) => {
      await tx.ticketReply.create({
        data: {
          ticketId: id,
          userId: user.userId,
          message: dto.message,
          isAdminReply,
        },
      });

      if (ticket.status !== TicketStatus.CLOSED) {
        await tx.ticket.update({
          where: { id },
          data: {
            status: isAdminReply ? TicketStatus.WAITING_FOR_USER : TicketStatus.IN_PROGRESS,
          },
        });
      }
    });

    await this.logAudit(
      user,
      AuditAction.UPDATE,
      id,
      isAdminReply ? "Admin replied to ticket" : "User replied to ticket",
      {
        status:
          ticket.status !== TicketStatus.CLOSED
            ? isAdminReply
              ? TicketStatus.WAITING_FOR_USER
              : TicketStatus.IN_PROGRESS
            : ticket.status,
      },
    );

    return this.getTicketById(user, id);
  }

  async updateStatus(user: AuthenticatedUser, id: string, dto: UpdateTicketStatusDto) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        assignedToId: true,
        status: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException("Ticket not found");
    }

    if (user.role === Role.ADMIN) {
      await this.prisma.ticket.update({
        where: { id },
        data: {
          status: dto.status,
          assignedToId: ticket.assignedToId ?? user.userId,
        },
      });
    } else {
      if (ticket.userId !== user.userId) {
        throw new ForbiddenException("You can only update your own tickets");
      }

      if (dto.status !== TicketStatus.RESOLVED && dto.status !== TicketStatus.CLOSED) {
        throw new BadRequestException("Users can only set ticket status to RESOLVED or CLOSED");
      }

      await this.prisma.ticket.update({
        where: { id },
        data: {
          status: dto.status,
        },
      });
    }

    await this.logAudit(
      user,
      AuditAction.UPDATE,
      id,
      dto.note?.trim() || `Ticket status changed to ${dto.status}`,
      { status: dto.status },
    );

    return this.getTicketById(user, id);
  }

  async getTicketHistory(user: AuthenticatedUser, id: string): Promise<TicketHistoryEvent[]> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        replies: {
          orderBy: [{ createdAt: "asc" }],
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException("Ticket not found");
    }

    this.assertCanAccess(user, ticket.userId, ticket.assignedToId);

    const audits = await this.prisma.auditLog.findMany({
      where: {
        entityType: AuditEntityType.TICKET,
        entityId: id,
      },
      orderBy: [{ createdAt: "asc" }],
    });

    const events: TicketHistoryEvent[] = [
      {
        event: "TICKET_CREATED",
        message: ticket.message,
        actorId: ticket.userId,
        at: ticket.createdAt,
      },
      ...ticket.replies.map((reply) => ({
        event: reply.isAdminReply ? "ADMIN_REPLIED" : "USER_REPLIED",
        message: reply.message,
        actorId: reply.userId,
        at: reply.createdAt,
      })),
      ...audits.map((log) => ({
        event: `AUDIT_${log.action}`,
        message: log.summary ?? "Ticket updated",
        actorId: log.actorId,
        at: log.createdAt,
      })),
    ];

    return events.sort((a, b) => a.at.getTime() - b.at.getTime());
  }

  private readonly ticketInclude = {
    user: { select: { id: true, firstName: true, lastName: true, email: true } },
    assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
    replies: {
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    },
  } satisfies Prisma.TicketInclude;

  private buildWhere(user: AuthenticatedUser, query: TicketQueryDto): Prisma.TicketWhereInput {
    const where: Prisma.TicketWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.search) {
      where.OR = [
        {
          subject: {
            contains: query.search,
            mode: "insensitive",
          },
        },
        {
          message: {
            contains: query.search,
            mode: "insensitive",
          },
        },
      ];
    }

    if (user.role !== Role.ADMIN) {
      where.userId = user.userId;
    }

    return where;
  }

  private assertCanAccess(
    user: AuthenticatedUser,
    ticketUserId: string,
    assignedToId: string | null,
  ): void {
    if (user.role === Role.ADMIN) {
      return;
    }

    if (ticketUserId !== user.userId && assignedToId !== user.userId) {
      throw new ForbiddenException("You can only access your own tickets");
    }
  }

  private assertCanReply(
    user: AuthenticatedUser,
    ticketUserId: string,
    assignedToId: string | null,
  ): void {
    if (user.role === Role.ADMIN) {
      return;
    }

    if (ticketUserId !== user.userId && assignedToId !== user.userId) {
      throw new ForbiddenException("You can only reply to your own tickets");
    }
  }

  private generateTicketNo(): string {
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:TZ.]/g, "")
      .slice(0, 14);
    const suffix = Math.floor(Math.random() * 9000 + 1000);
    return `TKT-${timestamp}-${suffix}`;
  }

  private mapTicket(ticket: TicketWithRelations) {
    return {
      id: ticket.id,
      ticketNo: ticket.ticketNo,
      subject: ticket.subject,
      message: ticket.message,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      requester: {
        id: ticket.user.id,
        name: `${ticket.user.firstName} ${ticket.user.lastName}`.trim(),
        email: ticket.user.email,
      },
      assignedTo: ticket.assignedTo
        ? {
            id: ticket.assignedTo.id,
            name: `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`.trim(),
            email: ticket.assignedTo.email,
          }
        : null,
      replies: ticket.replies.map((reply) => ({
        id: reply.id,
        message: reply.message,
        isAdminReply: reply.isAdminReply,
        author: {
          id: reply.user.id,
          name: `${reply.user.firstName} ${reply.user.lastName}`.trim(),
          email: reply.user.email,
        },
        createdAt: reply.createdAt,
      })),
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    };
  }

  private async logAudit(
    user: AuthenticatedUser,
    action: AuditAction,
    entityId: string,
    summary: string,
    changes: Record<string, unknown>,
  ): Promise<void> {
    const actor = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { companyId: true },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: user.userId,
        companyId: actor?.companyId ?? null,
        action,
        entityType: AuditEntityType.TICKET,
        entityId,
        summary,
        changes: changes as Prisma.InputJsonValue,
      },
    });
  }
}
