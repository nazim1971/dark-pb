import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { PublishingStatus } from "@prisma/client";

export class CompositionQueryDto {
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
  songTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  language?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  genre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  iswc?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  isrc?: string;

  @IsOptional()
  @IsEnum(PublishingStatus)
  status?: PublishingStatus;
}
