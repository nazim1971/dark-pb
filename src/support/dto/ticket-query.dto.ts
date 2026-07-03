import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { TicketCategory, TicketPriority, TicketStatus } from "@prisma/client";
import { PaginationQueryDto } from "../../shared/dto/pagination-query.dto";

export class TicketQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsEnum(TicketCategory)
  category?: TicketCategory;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}
