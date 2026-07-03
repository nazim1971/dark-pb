import { IsOptional, IsString, MaxLength } from "class-validator";

export class CompositionActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
