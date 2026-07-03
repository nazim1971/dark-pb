import { IsIn, IsOptional } from "class-validator";
import { RoyaltyQueryDto } from "./royalty-query.dto";

export class RoyaltyExportQueryDto extends RoyaltyQueryDto {
  @IsOptional()
  @IsIn(["csv", "excel", "pdf"])
  format: "csv" | "excel" | "pdf" = "csv";
}
