import { Type } from "class-transformer";
import {
  IsDate,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { RoyaltyStatus, RoyaltyType } from "@prisma/client";
import { DSP_VALUES, DspValue } from "./create-royalty.dto";

export class UpdateRoyaltyDto {
  @IsOptional()
  @IsUUID()
  compositionId?: string;

  @IsOptional()
  @IsUUID()
  writerId?: string;

  @IsOptional()
  @IsEnum(RoyaltyType)
  type?: RoyaltyType;

  @IsOptional()
  @IsIn(DSP_VALUES)
  dsp?: DspValue;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  royaltyDate?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(0)
  totalViews?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  grossAmount?: number;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  adminSharePercentage?: number;

  @IsOptional()
  @IsEnum(RoyaltyStatus)
  status?: RoyaltyStatus;
}
