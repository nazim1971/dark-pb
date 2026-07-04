import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { KycApprovedGuard } from "./guards/kyc-approved.guard";
import { RolesGuard } from "./guards/roles.guard";
import { AuthRequestContextMiddleware } from "./middleware/auth-request-context.middleware";
import { JwtStrategy } from "./strategies/jwt.strategy";

@Module({
  imports: [PassportModule.register({ defaultStrategy: "jwt" }), JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: KycApprovedGuard,
    },
  ],
  exports: [AuthService],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AuthRequestContextMiddleware).forRoutes(AuthController);
  }
}
