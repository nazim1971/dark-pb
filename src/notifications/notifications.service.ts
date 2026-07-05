import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { NotificationType, Prisma, Role } from "@prisma/client";
import { AuthenticatedUser } from "../auth/interfaces/token-payload.interface";
import { buildPaginatedDataResponse } from "../common/helpers/response.helper";
import { buildPagination } from "../prisma/query-helpers";
import { PrismaService } from "../prisma/prisma.service";
import { CreateNotificationDto, NotificationCategory } from "./dto/create-notification.dto";
import { NotificationQueryDto } from "./dto/notification-query.dto";

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateNotificationDto) {
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException("Only admins can create notifications");
    }

    const created = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        companyId: dto.companyId,
        title: dto.title.trim(),
        message: dto.message.trim(),
        type: this.mapCategoryToType(dto.category),
        metadata: {
          category: dto.category,
        },
      },
    });

    return this.mapNotification(created);
  }

  async list(user: AuthenticatedUser, query: NotificationQueryDto) {
    const pagination = buildPagination(query);
    const where: Prisma.NotificationWhereInput = {
      userId: user.userId,
      deletedAt: null,
    };

    if (query.isRead !== undefined) {
      where.isRead = query.isRead;
    }

    if (query.category) {
      where.metadata = {
        path: ["category"],
        equals: query.category,
      };
    }

    const [rows, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return buildPaginatedDataResponse(
      rows.map((row) => this.mapNotification(row)),
      pagination.page,
      pagination.limit,
      total,
    );
  }

  async markAsRead(user: AuthenticatedUser, id: string) {
    const row = await this.prisma.notification.findUnique({ where: { id } });
    if (!row || row.deletedAt) {
      throw new NotFoundException("Notification not found");
    }

    if (row.userId && row.userId !== user.userId && user.role !== Role.ADMIN) {
      throw new ForbiddenException("You can only mark your own notification as read");
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return this.mapNotification(updated);
  }

  async markAllAsRead(user: AuthenticatedUser) {
    await this.prisma.notification.updateMany({
      where: {
        userId: user.userId,
        isRead: false,
        deletedAt: null,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { success: true };
  }

  private mapCategoryToType(category: NotificationCategory): NotificationType {
    if (category === NotificationCategory.STATUS_UPDATE) {
      return NotificationType.SUCCESS;
    }

    if (category === NotificationCategory.SYSTEM_UPDATE) {
      return NotificationType.WARNING;
    }

    return NotificationType.INFO;
  }

  private mapNotification(notification: Prisma.NotificationGetPayload<Record<string, never>>) {
    return {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      category:
        (notification.metadata as { category?: NotificationCategory } | null)?.category ??
        NotificationCategory.ANNOUNCEMENT,
      type: notification.type,
      isRead: notification.isRead,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    };
  }
}
