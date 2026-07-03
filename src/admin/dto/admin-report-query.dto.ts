import { Type } from "class-transformer";
import { IsIn, IsOptional } from "class-validator";

export class AdminReportQueryDto {
  @IsOptional()
  @Type(() => Date)
  from?: Date;

  @IsOptional()
  @Type(() => Date)
  to?: Date;

  @IsOptional()
  @IsIn(["csv", "cwr"])
  format: "csv" | "cwr" = "csv";
}
