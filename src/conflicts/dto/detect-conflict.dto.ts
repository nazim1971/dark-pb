import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from "class-validator";

export class DetectConflictDto {
  @IsUUID()
  compositionId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  currentClaim!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(20)
  threshold?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
