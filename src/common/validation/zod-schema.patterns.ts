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

export const searchQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
});

export const adminSearchQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
});

export const sortQuerySchema = z.object({
  sortBy: z.string().trim().max(64).optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const dateRangeQuerySchema = z
  .object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .refine((data) => !data.from || !data.to || data.to >= data.from, {
    message: "to must be on or after from",
    path: ["to"],
  });

export const listQuerySchema = paginationSchema.merge(searchQuerySchema).merge(sortQuerySchema);

export function makeCreateAndUpdateSchemas<TShape extends z.ZodRawShape>(
  shape: TShape,
): {
  createSchema: z.ZodObject<TShape>;
  updateSchema: z.ZodObject<{ id: z.ZodString } & { [k in keyof TShape]: z.ZodOptional<TShape[k]> }>;
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
