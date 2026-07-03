import { Type } from "class-transformer";
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export enum SearchEntityType {
  COMPOSITION = "composition",
  WRITER = "writer",
  PUBLISHER = "publisher",
  RECORDING = "recording",
}

export enum SearchSortBy {
  RELEVANCE = "relevance",
  CREATED_AT = "createdAt",
  UPDATED_AT = "updatedAt",
  TITLE = "title",
}

export enum SearchSortDirection {
  ASC = "asc",
  DESC = "desc",
}

export class SearchQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @IsIn(["composition", "writer", "publisher", "recording"], { each: true })
  types?: SearchEntityType[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  song?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  writer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  publisher?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  artist?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  isrc?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  iswc?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  ipi?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  spotifyUrl?: string;

  @IsOptional()
  @IsEnum(SearchSortBy)
  sortBy: SearchSortBy = SearchSortBy.RELEVANCE;

  @IsOptional()
  @IsEnum(SearchSortDirection)
  sortDirection: SearchSortDirection = SearchSortDirection.DESC;

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
}
