import { ValidationPipe } from "@nestjs/common";
import { NestFactory, Reflector } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import compression from "compression";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";
import { setupSwagger } from "./common/utils/swagger";
import { ZodResponseValidationInterceptor } from "./common/validation/zod-response-validation.interceptor";
import { resolveCorsOrigins } from "./common/config/config.validation";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: false,
  });
  const configService = app.get(ConfigService);

  const corsOrigins = resolveCorsOrigins(configService.get<string[]>("CORS_ORIGINS"));
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  app.use(helmet());
  app.use(compression());
  app.use(cookieParser(configService.getOrThrow<string>("COOKIE_SECRET")));
  app.useBodyParser("json", { limit: configService.get<string>("REQUEST_BODY_LIMIT", "1mb") });
  app.useBodyParser("urlencoded", {
    extended: true,
    limit: configService.get<string>("REQUEST_BODY_LIMIT", "1mb"),
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(
    new ZodResponseValidationInterceptor(app.get(Reflector)),
    new ResponseInterceptor(),
  );

  setupSwagger(app, configService);

  const port = configService.getOrThrow<number>("PORT");
  await app.listen(port);
}

void bootstrap();
