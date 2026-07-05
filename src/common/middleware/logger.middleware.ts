import { Injectable, Logger, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger("HTTP");

  use(request: Request, response: Response, next: NextFunction): void {
    const { method, originalUrl, ip } = request;
    const userAgent = request.get("user-agent") ?? "unknown";
    const requestId = request.requestId ?? "unknown";
    const startedAt = Date.now();

    response.on("finish", () => {
      const duration = Date.now() - startedAt;
      const payload = {
        requestId,
        method,
        path: originalUrl,
        statusCode: response.statusCode,
        durationMs: duration,
        ip,
        userAgent,
      };

      if (response.statusCode >= 500) {
        this.logger.error(JSON.stringify(payload));
        return;
      }

      if (response.statusCode >= 400) {
        this.logger.warn(JSON.stringify(payload));
        return;
      }

      this.logger.log(JSON.stringify(payload));
    });

    next();
  }
}
