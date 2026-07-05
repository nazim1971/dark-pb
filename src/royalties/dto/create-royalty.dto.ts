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
import { RoyaltyType } from "@prisma/client";

export const DSP_VALUES = ["Spotify", "Apple Music", "YouTube", "TikTok", "Meta", "Other"];
export type DspValue = (typeof DSP_VALUES)[number];

export class CreateRoyaltyDto {
  @IsUUID()
  compositionId!: string;

  @IsOptional()
  @IsUUID()
  writerId?: string;

  @IsOptional()
  @IsEnum(RoyaltyType)
  type?: RoyaltyType;

  @IsIn(DSP_VALUES)
  dsp!: DspValue;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  royaltyDate?: Date;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(0)
  totalViews!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  grossAmount!: number;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  adminSharePercentage!: number;
}
