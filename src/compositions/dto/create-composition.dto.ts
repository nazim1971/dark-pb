import { PublishingStatus } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsString, IsUrl, MaxLength } from "class-validator";

export class CreateCompositionDto {
  @IsString()
  @MaxLength(200)
  songTitle!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  alternativeTitle?: string;

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
  @MaxLength(10000)
  lyrics?: string;

  @IsOptional()
  @IsUrl()
  spotifyUrl?: string;

  @IsOptional()
  @IsUrl()
  appleMusicUrl?: string;

  @IsOptional()
  @IsUrl()
  youtubeUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  iswc?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  isrc?: string;

  @IsOptional()
  @IsDateString()
  releaseDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  version?: string;

  @IsOptional()
  @IsEnum(PublishingStatus)
  status?: PublishingStatus;
}
