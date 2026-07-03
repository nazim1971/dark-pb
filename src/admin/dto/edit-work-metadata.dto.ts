import { Type } from "class-transformer";
import { IsDate, IsOptional, IsString, IsUrl, MaxLength } from "class-validator";

export class EditWorkMetadataDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  songTitle?: string;

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
  @MaxLength(32)
  isrc?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  spotifyUrl?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  appleMusicUrl?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  youtubeUrl?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  releaseDate?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  version?: string;
}
