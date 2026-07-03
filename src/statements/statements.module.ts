import { Module } from "@nestjs/common";
import { RoyaltiesModule } from "../royalties/royalties.module";
import { StatementsController } from "./statements.controller";
import { StatementsService } from "./statements.service";

@Module({
  imports: [RoyaltiesModule],
  controllers: [StatementsController],
  providers: [StatementsService],
  exports: [StatementsService],
})
export class StatementsModule {}
