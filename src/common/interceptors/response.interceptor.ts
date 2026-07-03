import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { ApiSuccessResponse } from "../interfaces/api-response.interface";

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiSuccessResponse<T> | T> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessResponse<T> | T> {
    return next.handle().pipe(
      map((data: T) => {
        if (data && typeof data === "object" && "success" in (data as Record<string, unknown>)) {
          return data;
        }

        return {
          success: true,
          message: "Request completed successfully",
          data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
