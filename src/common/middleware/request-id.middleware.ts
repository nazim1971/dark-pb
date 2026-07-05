import { Injectable, NestMiddleware } from "@nestjs/common";
import { randomUUID } from "crypto";
import { NextFunction, Request, Response } from "express";

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const incomingId = request.header("x-request-id");
    const requestId = incomingId && incomingId.trim().length > 0 ? incomingId.trim() : randomUUID();

    request.requestId = requestId;
    response.setHeader("X-Request-Id", requestId);

    next();
  }
}
