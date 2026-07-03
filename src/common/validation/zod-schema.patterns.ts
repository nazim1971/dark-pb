import { z } from "zod";

export const uuidSchema = z.string().uuid();
export const trimmedStringSchema = z.string().trim().min(1);
export const optionalTrimmedStringSchema = z.string().trim().min(1).optional();
export const urlSchema = z.string().url();
export const sharePercentageSchema = z.number().min(0).max(100);
export const amountSchema = z.number().nonnegative();

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export function makeCreateAndUpdateSchemas<TShape extends z.ZodRawShape>(
  shape: TShape,
): {
  createSchema: z.AnyZodObject;
  updateSchema: z.AnyZodObject;
} {
  const createSchema = z.object(shape);
  const updateSchema = z.object({
    id: uuidSchema,
    ...createSchema.partial().shape,
  });

  return {
    createSchema,
    updateSchema,
  };
}
