import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { WritersController } from "./writers.controller";
import { WritersService } from "./writers.service";

@Module({
  controllers: [WritersController],
  providers: [WritersService, PrismaService],
  exports: [WritersService],
})
export class WritersModule {}
