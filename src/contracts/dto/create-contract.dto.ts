import { Type } from "class-transformer";
import {
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from "class-validator";
import { ContractStatus, ContractType } from "@prisma/client";

export class CreateContractDto {
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  contractNo!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsEnum(ContractType)
  type!: ContractType;

  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;

  @Type(() => Date)
  @IsDate()
  effectiveFrom!: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveTo?: Date;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsUUID()
  publisherId?: string;
}
