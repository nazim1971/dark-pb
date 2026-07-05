import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export enum NotificationCategory {
  ANNOUNCEMENT = "ANNOUNCEMENT",
  SYSTEM_UPDATE = "SYSTEM_UPDATE",
  STATUS_UPDATE = "STATUS_UPDATE",
}

export class CreateNotificationDto {
  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsEnum(NotificationCategory)
  category!: NotificationCategory;

  @IsString()
  @MaxLength(180)
  title!: string;

  @IsString()
  @MaxLength(2000)
  message!: string;
}
