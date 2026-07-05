import { IsOptional, IsString, MaxLength } from "class-validator";

export class SubmitKycDto {
  @IsString()
  @MaxLength(80)
  documentType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  documentNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
