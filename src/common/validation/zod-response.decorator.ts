import { SetMetadata } from "@nestjs/common";
import { ZodType } from "zod";

export const ZOD_RESPONSE_SCHEMA_KEY = "zod:response:schema";

export const ZodResponseSchema = <TOutput>(schema: ZodType<TOutput>): MethodDecorator =>
  SetMetadata(ZOD_RESPONSE_SCHEMA_KEY, schema);
