import { Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";

export interface AuthRequestContext {
  userAgent?: string;
  ipAddress?: string;
}

export type RequestWithAuthContext = Request & {
  authContext?: AuthRequestContext;
};

@Injectable()
export class AuthRequestContextMiddleware implements NestMiddleware {
  use(request: RequestWithAuthContext, _: Response, next: NextFunction): void {
    request.authContext = {
      userAgent: this.getUserAgent(request),
      ipAddress: this.getClientIp(request),
    };

    next();
  }

  private getUserAgent(request: Request): string | undefined {
    const userAgent = request.headers["user-agent"];
    if (typeof userAgent !== "string" || userAgent.length === 0) {
      return undefined;
    }

    return userAgent;
  }

  private getClientIp(request: Request): string | undefined {
    const forwarded = request.headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.length > 0) {
      return forwarded.split(",")[0]?.trim();
    }

    if (Array.isArray(forwarded) && forwarded.length > 0) {
      return forwarded[0];
    }

    return request.ip;
  }
}
