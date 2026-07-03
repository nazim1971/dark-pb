import { IsIn, IsOptional } from "class-validator";

export class StatementFileQueryDto {
  @IsOptional()
  @IsIn(["csv", "excel", "pdf"])
  format: "csv" | "excel" | "pdf" = "pdf";
}
