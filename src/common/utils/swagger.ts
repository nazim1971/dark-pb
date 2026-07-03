import { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { APP_NAME } from "../constants/app.constants";

export function setupSwagger(app: INestApplication, configService: ConfigService): void {
  const config = new DocumentBuilder()
    .setTitle(APP_NAME)
    .setDescription("Music Publishing Administration Portal API")
    .setVersion("1.0.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const loggerEnabled = configService.get<string>("NODE_ENV") !== "production";
  if (!loggerEnabled) {
    return;
  }
}
