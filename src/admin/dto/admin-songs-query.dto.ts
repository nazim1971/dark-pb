import { Type } from "class-transformer";
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
import { SongStatus } from "@prisma/client";

export class AdminSongsQueryDto {
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
  search?: string;

  @IsOptional()
  @IsEnum(SongStatus)
  status?: SongStatus;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  released?: boolean;

  @IsOptional()
  @IsUUID()
  ownerId?: string;
}
