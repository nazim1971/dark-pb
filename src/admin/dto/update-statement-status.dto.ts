import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { StatementStatus } from "@prisma/client";

export class UpdateStatementStatusDto {
  @IsEnum(StatementStatus)
  status!: StatementStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
