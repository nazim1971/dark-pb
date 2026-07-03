import { IsIn, IsOptional } from "class-validator";
import { StatementQueryDto } from "./statement-query.dto";

export class StatementExportQueryDto extends StatementQueryDto {
  @IsOptional()
  @IsIn(["csv", "excel", "pdf"])
  format: "csv" | "excel" | "pdf" = "csv";
}
