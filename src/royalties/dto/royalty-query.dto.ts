import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from "class-validator";
import { RoyaltyStatus, RoyaltyType } from "@prisma/client";
import { PaginationQueryDto } from "../../shared/dto/pagination-query.dto";

export class RoyaltyQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  compositionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  song?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(3000)
  year?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  dsp?: string;

  @IsOptional()
  @IsEnum(RoyaltyType)
  type?: RoyaltyType;

  @IsOptional()
  @IsEnum(RoyaltyStatus)
  status?: RoyaltyStatus;
}
