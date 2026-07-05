import { IsEmail, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateAccountSettingsDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  companyLegalName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  representativeName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  registrationNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  vatNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;
}
