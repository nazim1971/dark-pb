import { Type } from "class-transformer";
import { IsBoolean, IsEnum, IsOptional } from "class-validator";
import { PaginationQueryDto } from "../../shared/dto/pagination-query.dto";
import { NotificationCategory } from "./create-notification.dto";

export class NotificationQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isRead?: boolean;

  @IsOptional()
  @IsEnum(NotificationCategory)
  category?: NotificationCategory;
}
