import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";
import { ZodError, ZodType } from "zod";
import { formatZodError } from "./zod-error.formatter";

@Injectable()
export class ZodValidationPipe<TOutput = unknown> implements PipeTransform {
  constructor(private readonly schema: ZodType<TOutput>) {}

  transform(value: unknown): TOutput {
    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: "Validation failed",
          errors: formatZodError(error),
        });
      }

      throw error;
    }
  }
}
