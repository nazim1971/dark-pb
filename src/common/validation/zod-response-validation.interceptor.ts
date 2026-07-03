import {
  CallHandler,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { ZodError, ZodType } from "zod";
import { formatZodError } from "./zod-error.formatter";
import { ZOD_RESPONSE_SCHEMA_KEY } from "./zod-response.decorator";

@Injectable()
export class ZodResponseValidationInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const schema = this.reflector.get<ZodType<unknown>>(
      ZOD_RESPONSE_SCHEMA_KEY,
      context.getHandler(),
    );

    if (!schema) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        try {
          return schema.parse(data);
        } catch (error) {
          if (error instanceof ZodError) {
            throw new InternalServerErrorException({
              message: "Response validation failed",
              errors: formatZodError(error),
            });
          }

          throw error;
        }
      }),
    );
  }
}
