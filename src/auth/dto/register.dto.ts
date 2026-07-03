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

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string;

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
  @IsEnum(CompanyType)
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== "string") {
      return value;
    }

    return value.trim().replace(/\s+/g, "_").toUpperCase();
  })
  companyType?: CompanyType;
}
