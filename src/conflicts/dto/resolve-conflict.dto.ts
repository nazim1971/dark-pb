import { IsEnum, IsString, MaxLength } from "class-validator";
import { ConflictStatus } from "@prisma/client";

export class ResolveConflictDto {
  @IsEnum(ConflictStatus)
  status!: ConflictStatus;

  @IsString()
  @MaxLength(1000)
  resolutionNote!: string;
}
