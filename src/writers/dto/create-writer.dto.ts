import { IsDateString, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class CreateWriterDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsString()
  @MaxLength(80)
  firstName!: string;

  @IsString()
  @MaxLength(80)
  lastName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  pro?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  ipiNumber?: string;

  @IsOptional()
  @IsDateString()
  dob?: string;
}
