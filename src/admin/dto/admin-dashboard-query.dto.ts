import { Type } from "class-transformer";
import { IsOptional } from "class-validator";

export class AdminDashboardQueryDto {
  @IsOptional()
  @Type(() => Date)
  from?: Date;

  @IsOptional()
  @Type(() => Date)
  to?: Date;
}
