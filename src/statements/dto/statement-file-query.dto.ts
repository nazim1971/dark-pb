import { IsIn, IsOptional } from "class-validator";

export class StatementFileQueryDto {
  @IsOptional()
  @IsIn(["csv", "excel", "pdf", "cwr"])
  format: "csv" | "excel" | "pdf" | "cwr" = "pdf";
}
