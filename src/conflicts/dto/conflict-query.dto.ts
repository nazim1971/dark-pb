import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { ConflictStatus } from "@prisma/client";
import { PaginationQueryDto } from "../../shared/dto/pagination-query.dto";

export class ConflictQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  compositionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  song?: string;

  @IsOptional()
  @IsEnum(ConflictStatus)
  status?: ConflictStatus;
}
