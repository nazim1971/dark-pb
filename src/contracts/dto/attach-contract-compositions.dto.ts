import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

export class AttachContractCompositionItemDto {
  @IsUUID()
  compositionId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  territory?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  sharePercentage?: number;
}

export class AttachContractCompositionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AttachContractCompositionItemDto)
  compositions!: AttachContractCompositionItemDto[];
}
