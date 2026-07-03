import { Type } from "class-transformer";
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { RoyaltyType } from "@prisma/client";

export class CreateRoyaltyDto {
  @IsOptional()
  @IsUUID()
  compositionId?: string;

  @IsOptional()
  @IsUUID()
  recordingId?: string;

  @IsOptional()
  @IsUUID()
  writerId?: string;

  @IsOptional()
  @IsUUID()
  publisherId?: string;

  @IsOptional()
  @IsUUID()
  contractId?: string;

  @IsEnum(RoyaltyType)
  type!: RoyaltyType;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  sourceDsp?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @IsOptional()
  @Type(() => Date)
  usageDate?: Date;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(1900)
  @Max(3000)
  periodYear!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(1)
  @Max(12)
  periodMonth!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  sharePercentage!: number;
}
