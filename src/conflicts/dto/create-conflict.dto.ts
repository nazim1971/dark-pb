import { Type } from "class-transformer";
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { ConflictStatus } from "@prisma/client";

export class CreateConflictDto {
  @IsUUID()
  compositionId!: string;

  @IsString()
  @MaxLength(1000)
  conflictReason!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  currentClaim!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  ourClaim!: number;

  @IsOptional()
  @IsEnum(ConflictStatus)
  status?: ConflictStatus;
}
