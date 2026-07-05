import { z } from "zod";
import {
  adminSearchQuerySchema,
  dateRangeQuerySchema,
  paginationSchema,
  searchQuerySchema,
} from "../../common/validation/zod-schema.patterns";

const songWriterSplitSchema = z.object({
  writerId: z.string().uuid(),
  splitPercentage: z.coerce.number().int().min(1).max(100),
});

const validateSplitTotal = (writers: Array<{ splitPercentage: number }>, ctx: z.RefinementCtx) => {
  const total = writers.reduce((sum, writer) => sum + writer.splitPercentage, 0);
  if (total !== 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Total split percentage must equal exactly 100%",
      path: ["writers"],
    });
  }
};

const songSchemaShape = {
  released: z.boolean(),
  spotifyUrl: z.string().url().optional(),
  songTitle: z.string().trim().min(1).max(200),
  alternativeTitle: z.string().trim().max(200).optional(),
  artistName: z.string().trim().max(160).optional(),
  language: z.string().trim().max(80).optional(),
  ipiNumber: z.string().trim().max(64).optional(),
  isrc: z.string().trim().max(32).optional(),
  duration: z.coerce.number().int().min(1).optional(),
  lyrics: z.string().trim().max(10000).optional(),
  releaseDate: z.coerce.date().optional(),
  status: z.enum(["SUBMITTED", "PROCESSING", "REGISTERED"]).optional(),
  writers: z.array(songWriterSplitSchema).min(1),
} satisfies z.ZodRawShape;

const createSongSchemaBase = z.object(songSchemaShape);

export const createSongSchema = createSongSchemaBase.superRefine(
  (data: z.infer<typeof createSongSchemaBase>, ctx: z.RefinementCtx) => {
    if (data.released && !data.spotifyUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Spotify URL is required when Released is true",
        path: ["spotifyUrl"],
      });
    }

    validateSplitTotal(data.writers, ctx);
  },
);

export const updateSongSchema = createSongSchemaBase
  .partial()
  .extend({
    id: z.string().uuid(),
  })
  .superRefine((data, ctx: z.RefinementCtx) => {
    if (data.released === true && !data.spotifyUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Spotify URL is required when Released is true",
        path: ["spotifyUrl"],
      });
    }

    if (data.writers) {
      validateSplitTotal(data.writers, ctx);
    }
  });

export const songQuerySchema = paginationSchema.extend({
  q: searchQuerySchema.shape.q,
  released: z.coerce.boolean().optional(),
  status: z.enum(["SUBMITTED", "PROCESSING", "REGISTERED"]).optional(),
  language: z.string().trim().max(80).optional(),
  artistName: z.string().trim().max(160).optional(),
  writerId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
});
