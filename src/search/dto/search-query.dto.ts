import { Type } from "class-transformer";
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export enum SearchEntityType {
  SONG = "song",
  WRITER = "writer",
  USER = "user",
  PUBLISHER = "publisher",
  RECORD_LABEL = "recordLabel",
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
  @IsString()
  @MaxLength(200)
  q!: string;

  @IsOptional()
  @IsIn(["song", "writer", "user", "publisher", "recordLabel"], { each: true })
  types?: SearchEntityType[];

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
