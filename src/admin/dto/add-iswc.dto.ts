import { IsString, MaxLength } from "class-validator";

export class AddIswcDto {
  @IsString()
  @MaxLength(32)
  iswc!: string;
}
