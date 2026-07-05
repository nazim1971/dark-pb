import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UsePipes,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { AuthenticatedUser } from "../auth/interfaces/token-payload.interface";
import { ZodValidationPipe } from "../common/validation/zod-validation.pipe";
import { CreateNotificationDto } from "./dto/create-notification.dto";
import { NotificationQueryDto } from "./dto/notification-query.dto";
import { NotificationsService } from "./notifications.service";
import { createNotificationSchema, notificationQuerySchema } from "./schemas/notifications.zod";

@ApiTags("Notifications")
@ApiBearerAuth()
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @ApiOperation({ summary: "Create notification" })
  @ApiBody({ type: CreateNotificationDto })
  @ApiOkResponse({ description: "Notification created" })
  @Roles("ADMIN")
  @UsePipes(new ZodValidationPipe(createNotificationSchema))
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateNotificationDto) {
    return this.notificationsService.create(user, dto);
  }

  @Get()
  @ApiOperation({ summary: "List notifications" })
  @ApiOkResponse({ description: "Notifications fetched" })
  @UsePipes(new ZodValidationPipe(notificationQuerySchema))
  async list(@CurrentUser() user: AuthenticatedUser, @Query() query: NotificationQueryDto) {
    return this.notificationsService.list(user, query);
  }

  @Patch(":id/read")
  @ApiOperation({ summary: "Mark notification as read" })
  @ApiParam({ name: "id", type: String })
  @ApiOkResponse({ description: "Notification marked as read" })
  async markAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", new ParseUUIDPipe()) id: string,
  ) {
    return this.notificationsService.markAsRead(user, id);
  }

  @Patch("read-all")
  @ApiOperation({ summary: "Mark all notifications as read" })
  @ApiOkResponse({ description: "Notifications marked as read" })
  async markAllAsRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllAsRead(user);
  }
}
