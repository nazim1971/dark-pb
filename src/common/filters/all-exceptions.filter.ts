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
import { ErrorCode } from "../constants/error-codes";
import { formatClassValidatorErrors } from "../validation/zod-error.formatter";

interface ErrorResponse {
  statusCode: number;
  code: string;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  requestId?: string;
  details?: unknown;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);
  private readonly isProduction = process.env.NODE_ENV === "production";

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const formatted = this.formatError(exception, request.url, request.requestId);

    response.status(formatted.statusCode).json(formatted);
  }

  private formatError(exception: unknown, path: string, requestId?: string): ErrorResponse {
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === "P2002") {
        const target = Array.isArray(exception.meta?.target)
          ? exception.meta.target.join(", ")
          : "unique field";
        return this.createError(
          HttpStatus.CONFLICT,
          ErrorCode.CONFLICT,
          `Duplicate value for ${target}. Please use a different value.`,
          "Conflict",
          path,
          requestId,
        );
      }

      if (exception.code === "P2025") {
        return this.createError(
          HttpStatus.NOT_FOUND,
          ErrorCode.NOT_FOUND,
          "The requested record does not exist.",
          "Not Found",
          path,
          requestId,
        );
      }

      this.logger.error(`Prisma error ${exception.code}: ${exception.message}`);

      return this.createError(
        HttpStatus.BAD_REQUEST,
        ErrorCode.DATABASE_ERROR,
        this.isProduction
          ? "Database request failed."
          : `Database request failed (${exception.code}).`,
        "Bad Request",
        path,
        requestId,
      );
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return this.createError(
        HttpStatus.BAD_REQUEST,
        ErrorCode.DATABASE_ERROR,
        this.isProduction ? "Database validation failed." : `Database validation failed.`,
        "Bad Request",
        path,
        requestId,
        this.isProduction ? undefined : exception.message,
      );
    }

    if (exception instanceof Prisma.PrismaClientInitializationError) {
      this.logger.error(`Prisma initialization error: ${exception.message}`);
      return this.createError(
        HttpStatus.SERVICE_UNAVAILABLE,
        ErrorCode.SERVICE_UNAVAILABLE,
        "Database connection failed. Please verify your database configuration.",
        "Service Unavailable",
        path,
        requestId,
      );
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === "string") {
        return this.createError(
          status,
          this.mapStatusToCode(status),
          exceptionResponse,
          this.statusLabel(status),
          path,
          requestId,
        );
      }

      if (
        typeof exceptionResponse === "object" &&
        exceptionResponse !== null &&
        "message" in exceptionResponse
      ) {
        const errorBody = exceptionResponse as {
          message: string | string[] | ValidationErrorLike[];
          error?: string;
          errors?: unknown;
        };

        const details = this.extractDetails(errorBody);
        const message = this.extractMessage(errorBody.message);
        const errorLabel =
          typeof errorBody.error === "string" ? errorBody.error : this.statusLabel(status);

        return this.createError(
          status,
          this.mapStatusToCode(status, details !== undefined),
          message,
          errorLabel,
          path,
          requestId,
          details,
        );
      }

      return this.createError(
        status,
        this.mapStatusToCode(status),
        "Request failed",
        this.statusLabel(status),
        path,
        requestId,
      );
    }

    return this.createError(
      HttpStatus.INTERNAL_SERVER_ERROR,
      ErrorCode.INTERNAL_ERROR,
      this.getUnknownErrorMessage(exception),
      "Internal Server Error",
      path,
      requestId,
    );
  }

  private extractDetails(errorBody: {
    message: string | string[] | ValidationErrorLike[];
    errors?: unknown;
  }): unknown {
    if (errorBody.errors !== undefined) {
      return errorBody.errors;
    }

    if (Array.isArray(errorBody.message) && this.isValidationErrorArray(errorBody.message)) {
      return formatClassValidatorErrors(errorBody.message);
    }

    return undefined;
  }

  private extractMessage(
    messageValue: string | string[] | ValidationErrorLike[],
  ): string {
    if (typeof messageValue === "string") {
      return messageValue;
    }

    if (Array.isArray(messageValue)) {
      if (this.isValidationErrorArray(messageValue)) {
        const formatted = formatClassValidatorErrors(messageValue);
        return formatted.map((issue) => issue.message).join(", ") || "Validation failed";
      }

      return messageValue.join(", ");
    }

    return "Request failed";
  }

  private isValidationErrorArray(
    value: string[] | ValidationErrorLike[],
  ): value is ValidationErrorLike[] {
    return value.length > 0 && typeof value[0] === "object" && value[0] !== null && "property" in value[0];
  }

  private mapStatusToCode(status: number, hasValidationDetails = false): string {
    if (hasValidationDetails || status === HttpStatus.BAD_REQUEST) {
      return ErrorCode.VALIDATION_ERROR;
    }

    switch (status) {
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCode.CONFLICT;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCode.RATE_LIMITED;
      case HttpStatus.SERVICE_UNAVAILABLE:
        return ErrorCode.SERVICE_UNAVAILABLE;
      default:
        return ErrorCode.BAD_REQUEST;
    }
  }

  private getUnknownErrorMessage(exception: unknown): string {
    if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
      return this.isProduction ? "Internal server error" : exception.message || "Internal server error";
    }

    this.logger.error("Unhandled unknown exception");
    return "Internal server error";
  }

  private createError(
    statusCode: number,
    code: string,
    message: string,
    error: string,
    path: string,
    requestId?: string,
    details?: unknown,
  ): ErrorResponse {
    return {
      statusCode,
      code,
      message,
      error,
      timestamp: new Date().toISOString(),
      path,
      ...(requestId ? { requestId } : {}),
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

interface ValidationErrorLike {
  property: string;
  constraints?: Record<string, string>;
  children?: ValidationErrorLike[];
}
