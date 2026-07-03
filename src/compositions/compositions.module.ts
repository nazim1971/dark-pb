import { Module } from "@nestjs/common";
import { CompositionsController } from "./compositions.controller";
import { CompositionsService } from "./compositions.service";
import { PrismaService } from "../prisma/prisma.service";

@Module({
  controllers: [CompositionsController],
  providers: [CompositionsService, PrismaService],
  exports: [CompositionsService],
})
export class CompositionsModule {}
