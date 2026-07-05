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
import { WritersModule } from "./writers/writers.module";
import { RoyaltiesModule } from "./royalties/royalties.module";
import { StatementsModule } from "./statements/statements.module";
import { SupportModule } from "./support/support.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { AdminModule } from "./admin/admin.module";
import { ReportsModule } from "./reports/reports.module";
import { SearchModule } from "./search/search.module";
import { SongsModule } from "./songs/songs.module";
import { LoggerMiddleware } from "./common/middleware/logger.middleware";
import { RequestIdMiddleware } from "./common/middleware/request-id.middleware";
import { SecurityMiddleware } from "./common/middleware/security.middleware";
import { CommonModule } from "./common/common.module";
import { SharedModule } from "./shared/shared.module";

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([
      {
        name: "default",
        ttl: 60_000,
        limit: 100,
      },
      {
        name: "search",
        ttl: 60_000,
        limit: 30,
      },
      {
        name: "export",
        ttl: 60_000,
        limit: 10,
      },
    ]),
    CommonModule,
    SharedModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    KycModule,
    WritersModule,
    RoyaltiesModule,
    StatementsModule,
    SupportModule,
    NotificationsModule,
    AdminModule,
    ReportsModule,
    SearchModule,
    SongsModule,
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
    consumer.apply(RequestIdMiddleware, SecurityMiddleware, LoggerMiddleware).forRoutes("*");
  }
}
