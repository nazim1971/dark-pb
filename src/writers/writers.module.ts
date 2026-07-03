import { Module } from "@nestjs/common";
import { WritersController } from "./writers.controller";
import { WritersService } from "./writers.service";

@Module({
  controllers: [WritersController],
  providers: [WritersService],
  exports: [WritersService],
})
export class WritersModule {}
