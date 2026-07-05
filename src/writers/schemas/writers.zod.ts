import { z } from "zod";
import { paginationSchema, searchQuerySchema } from "../../common/validation/zod-schema.patterns";

export const createWriterSchema = z.object({
  userId: z.string().uuid().optional(),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  pro: z.string().trim().max(64).optional(),
  ipiNumber: z.string().trim().max(64).optional(),
  dob: z.coerce.date().optional(),
});

export const updateWriterSchema = createWriterSchema.partial().extend({
  id: z.string().uuid(),
});

export const writerQuerySchema = paginationSchema.extend({
  q: searchQuerySchema.shape.q,
  pro: z.string().trim().max(64).optional(),
  ipiNumber: z.string().trim().max(64).optional(),
  userId: z.string().uuid().optional(),
});
