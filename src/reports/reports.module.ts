import { Module } from "@nestjs/common";
import { RoyaltiesModule } from "../royalties/royalties.module";
import { StatementsModule } from "../statements/statements.module";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";

@Module({
  imports: [RoyaltiesModule, StatementsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
