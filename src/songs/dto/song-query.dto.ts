import { Type } from "class-transformer";
import { SongStatus } from "@prisma/client";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class SongQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  released?: boolean;

  @IsOptional()
  @IsEnum(SongStatus)
  status?: SongStatus;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  language?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  artistName?: string;

  @IsOptional()
  @IsUUID()
  writerId?: string;

  @IsOptional()
  @IsUUID()
  ownerId?: string;
}
