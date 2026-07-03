import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  IsNumber,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { WriterRole } from "@prisma/client";

export class NestedWriterDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @MaxLength(160)
  legalName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  stageName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  ipiNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  pro?: string;

  @IsEnum(WriterRole)
  role!: WriterRole;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  publisher?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  writerShare!: number;
}

export class NestedRecordingDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  isrc?: string;

  @IsString()
  @MaxLength(160)
  artist!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  spotifyLink?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  duration!: number;

  @IsOptional()
  @IsDateString()
  release?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  version?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;
}

export class NestedPublisherDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @MaxLength(160)
  publisherName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  ipi?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  territory?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  share!: number;

  @IsOptional()
  @IsDateString()
  agreementFrom?: string;

  @IsOptional()
  @IsDateString()
  agreementTo?: string;
}

export class UpsertCompositionRelationsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NestedWriterDto)
  writers!: NestedWriterDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NestedRecordingDto)
  recordings!: NestedRecordingDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NestedPublisherDto)
  publishers!: NestedPublisherDto[];
}
