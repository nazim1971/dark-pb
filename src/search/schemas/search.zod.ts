import { z } from "zod";
import { paginationSchema } from "../../common/validation/zod-schema.patterns";

export const searchQuerySchema = paginationSchema
  .extend({
    q: z.string().trim().min(1).max(200),
    types: z.array(z.enum(["song", "writer", "user", "publisher", "recordLabel"])).optional(),
    sortBy: z.enum(["relevance", "createdAt", "updatedAt", "title"]).default("relevance"),
    sortDirection: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();
