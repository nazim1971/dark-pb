import { z } from "zod";
import { paginationSchema } from "../../common/validation/zod-schema.patterns";

const dspSchema = z.enum(["Spotify", "Apple Music", "YouTube", "TikTok", "Meta", "Other"]);

export const createRoyaltySchema = z.object({
  compositionId: z.string().uuid(),
  writerId: z.string().uuid().optional(),
  type: z.enum(["PERFORMANCE", "MECHANICAL", "LYRICS", "SYNCHRONIZATION", "OTHER"]).optional(),
  dsp: dspSchema,
  country: z.string().trim().max(80).optional(),
  royaltyDate: z.coerce.date().optional(),
  totalViews: z.number().int().min(0),
  grossAmount: z.number().nonnegative(),
  currency: z.string().trim().min(3).max(3).default("USD"),
  adminSharePercentage: z.number().min(0).max(100),
});

export const updateRoyaltySchema = createRoyaltySchema
  .partial()
  .extend({
    status: z.enum(["PENDING", "PROCESSED", "DISPUTED", "PAID"]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export const royaltyFilterSchema = paginationSchema.extend({
  compositionId: z.string().uuid().optional(),
  song: z.string().trim().max(200).optional(),
  month: z.number().int().min(1).max(12).optional(),
  year: z.number().int().min(1900).max(3000).optional(),
  country: z.string().trim().max(80).optional(),
  dsp: z.string().trim().max(120).optional(),
  type: z.enum(["PERFORMANCE", "MECHANICAL", "LYRICS", "SYNCHRONIZATION", "OTHER"]).optional(),
  status: z.enum(["PENDING", "PROCESSED", "DISPUTED", "PAID"]).optional(),
});

export const royaltyExportSchema = royaltyFilterSchema.extend({
  format: z.enum(["csv", "excel", "pdf"]).default("csv"),
});
