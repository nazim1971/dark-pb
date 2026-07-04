import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { Transform } from "class-transformer";
import { CompanyType } from "@prisma/client";

export enum RegistrationRole {
  SONGWRITER = "SONGWRITER",
  COMPOSER = "COMPOSER",
  ARTIST = "ARTIST",
  PUBLISHER = "PUBLISHER",
  RECORD_LABEL = "RECORD_LABEL",
}

export enum RegistrationType {
  INDIVIDUAL = "INDIVIDUAL",
  COMPANY = "COMPANY",
}

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  legalName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  stageName?: string;

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
  @MaxLength(500)
  spotifyArtistLink?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  pro?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  ipiNumber?: string;

  @IsEnum(RegistrationRole)
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== "string") {
      return value;
    }

    return value.trim().replace(/\s+/g, "_").toUpperCase();
  })
  role!: RegistrationRole;

  @IsEnum(RegistrationType)
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== "string") {
      return value;
    }

    return value.trim().toUpperCase();
  })
  registrationType!: RegistrationType;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  companyNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  director?: string;

  @IsOptional()
  @IsEmail()
  companyEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  companyPhone?: string;

  @IsOptional()
  @IsEnum(CompanyType)
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== "string") {
      return value;
    }

    return value.trim().replace(/\s+/g, "_").toUpperCase();
  })
  companyType?: CompanyType;
}
