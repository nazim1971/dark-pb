import { IsIn, IsOptional } from "class-validator";

export class ExportFormatQueryDto {
  @IsOptional()
  @IsIn(["csv", "excel", "pdf"])
  format: "csv" | "excel" | "pdf" = "csv";
}
