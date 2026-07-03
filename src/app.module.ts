import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { PrismaModule } from "./prisma/prisma.module";
import { validateEnv } from "./common/config/config.validation";
import { AppController } from "./app.controller";
import { KycModule } from "./kyc/kyc.module";
import { CompositionsModule } from "./compositions/compositions.module";
import { WritersModule } from "./writers/writers.module";
import { RecordingsModule } from "./recordings/recordings.module";
import { PublishersModule } from "./publishers/publishers.module";
import { RoyaltiesModule } from "./royalties/royalties.module";
import { StatementsModule } from "./statements/statements.module";
import { ConflictsModule } from "./conflicts/conflicts.module";
import { ContractsModule } from "./contracts/contracts.module";
import { SupportModule } from "./support/support.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { AdminModule } from "./admin/admin.module";
import { ReportsModule } from "./reports/reports.module";
import { SearchModule } from "./search/search.module";
import { LoggerMiddleware } from "./common/middleware/logger.middleware";

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    KycModule,
    CompositionsModule,
    WritersModule,
    RecordingsModule,
    PublishersModule,
    RoyaltiesModule,
    StatementsModule,
    ConflictsModule,
    ContractsModule,
    SupportModule,
    NotificationsModule,
    AdminModule,
    ReportsModule,
    SearchModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(LoggerMiddleware).forRoutes("*");
  }
}
