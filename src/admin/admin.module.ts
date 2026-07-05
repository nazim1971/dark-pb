import { Module } from "@nestjs/common";
import { ReportsModule } from "../reports/reports.module";
import { RoyaltiesModule } from "../royalties/royalties.module";
import { StatementsModule } from "../statements/statements.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  imports: [ReportsModule, RoyaltiesModule, StatementsModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
