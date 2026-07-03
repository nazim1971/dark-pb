import { Type } from "class-transformer";
import { IsEnum, IsOptional, IsString, IsUUID, Length, MaxLength } from "class-validator";
import { RoyaltyStatus, RoyaltyType } from "@prisma/client";

export class GenerateStatementDto {
  @Type(() => Date)
  periodStart!: Date;

  @Type(() => Date)
  periodEnd!: Date;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsUUID()
  compositionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  song?: string;

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

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;
}
