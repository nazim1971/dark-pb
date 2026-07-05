import { Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  use(_request: Request, response: Response, next: NextFunction): void {
    response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    response.setHeader("X-DNS-Prefetch-Control", "off");
    response.setHeader("X-Download-Options", "noopen");
    response.setHeader("X-Permitted-Cross-Domain-Policies", "none");

    next();
  }
}
