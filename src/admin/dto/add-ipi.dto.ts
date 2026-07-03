import { IsString, MaxLength } from "class-validator";

export class AddIpiDto {
  @IsString()
  @MaxLength(64)
  ipi!: string;
}
