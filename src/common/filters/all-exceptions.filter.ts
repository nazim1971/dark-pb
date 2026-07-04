import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { Prisma } from "@prisma/client";

interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  details?: unknown;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const formatted = this.formatError(exception, request.url);

    response.status(formatted.statusCode).json(formatted);
  }

  private formatError(exception: unknown, path: string): ErrorResponse {
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === "P2002") {
        const target = Array.isArray(exception.meta?.target)
          ? exception.meta.target.join(", ")
          : "unique field";
        return this.createError(
          HttpStatus.CONFLICT,
          `Duplicate value for ${target}. Please use a different value.`,
          "Conflict",
          path,
        );
      }

      if (exception.code === "P2025") {
        return this.createError(
          HttpStatus.NOT_FOUND,
          "The requested record does not exist.",
          "Not Found",
          path,
        );
      }

      this.logger.error(`Prisma error ${exception.code}: ${exception.message}`);

      return this.createError(
        HttpStatus.BAD_REQUEST,
        `Database request failed (${exception.code}).`,
        "Bad Request",
        path,
      );
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return this.createError(
        HttpStatus.BAD_REQUEST,
        `Database validation failed: ${exception.message}`,
        "Bad Request",
        path,
      );
    }

    if (exception instanceof Prisma.PrismaClientInitializationError) {
      this.logger.error(`Prisma initialization error: ${exception.message}`);
      return this.createError(
        HttpStatus.SERVICE_UNAVAILABLE,
        "Database connection failed. Please verify your database configuration.",
        "Service Unavailable",
        path,
      );
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === "string") {
        return this.createError(status, exceptionResponse, this.statusLabel(status), path);
      }

      if (
        typeof exceptionResponse === "object" &&
        exceptionResponse !== null &&
        "message" in exceptionResponse
      ) {
        const errorBody = exceptionResponse as {
          message: string | string[];
          error?: string;
          errors?: unknown;
        };

        const messageValue = errorBody.message;
        const message = Array.isArray(messageValue) ? messageValue.join(", ") : messageValue;
        const errorLabel =
          typeof errorBody.error === "string" ? errorBody.error : this.statusLabel(status);

        return this.createError(status, message, errorLabel, path, errorBody.errors);
      }

      return this.createError(status, "Request failed", this.statusLabel(status), path);
    }

    return this.createError(
      HttpStatus.INTERNAL_SERVER_ERROR,
      this.getUnknownErrorMessage(exception),
      "Internal Server Error",
      path,
    );
  }

  private getUnknownErrorMessage(exception: unknown): string {
    if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
      return exception.message || "Internal server error";
    }

    this.logger.error("Unhandled unknown exception");
    return "Internal server error";
  }

  private createError(
    statusCode: number,
    message: string,
    error: string,
    path: string,
    details?: unknown,
  ): ErrorResponse {
    return {
      statusCode,
      message,
      error,
      timestamp: new Date().toISOString(),
      path,
      ...(details !== undefined ? { details } : {}),
    };
  }

  private statusLabel(statusCode: number): string {
    const label = HttpStatus[statusCode] ?? "Error";
    return label
      .split("_")
      .map((chunk) => chunk[0] + chunk.slice(1).toLowerCase())
      .join(" ");
  }
}
