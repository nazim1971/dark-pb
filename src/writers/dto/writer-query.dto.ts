import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from "class-validator";

export class WriterQueryDto {
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
  @MaxLength(160)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  pro?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  ipiNumber?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;
}
