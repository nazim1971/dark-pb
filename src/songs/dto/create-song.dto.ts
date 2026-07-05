import { SongStatus } from "@prisma/client";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class SongWriterSplitDto {
  @IsUUID()
  writerId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  splitPercentage!: number;
}

export class CreateSongDto {
  @IsBoolean()
  released!: boolean;

  @IsOptional()
  @IsUrl()
  spotifyUrl?: string;

  @IsString()
  @MaxLength(200)
  songTitle!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  alternativeTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  artistName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  language?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  ipiNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  isrc?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  duration?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  lyrics?: string;

  @IsOptional()
  @IsDateString()
  releaseDate?: string;

  @IsOptional()
  @IsEnum(SongStatus)
  status?: SongStatus;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SongWriterSplitDto)
  writers!: SongWriterSplitDto[];
}
