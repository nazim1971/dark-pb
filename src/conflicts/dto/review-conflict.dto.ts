import { IsOptional, IsString, MaxLength } from "class-validator";

export class ReviewConflictDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
