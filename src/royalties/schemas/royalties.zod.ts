import { z } from "zod";

export const createRoyaltySchema = z.object({
  compositionId: z.string().uuid().optional(),
  recordingId: z.string().uuid().optional(),
  writerId: z.string().uuid().optional(),
  publisherId: z.string().uuid().optional(),
  contractId: z.string().uuid().optional(),
  type: z.enum(["PERFORMANCE", "MECHANICAL", "LYRICS", "SYNCHRONIZATION", "OTHER"]),
  sourceDsp: z.string().trim().max(120).optional(),
  country: z.string().trim().max(80).optional(),
  usageDate: z.coerce.date().optional(),
  periodYear: z.number().int().min(1900).max(3000),
  periodMonth: z.number().int().min(1).max(12),
  amount: z.number().nonnegative(),
  currency: z.string().trim().min(3).max(3).default("USD"),
  sharePercentage: z.number().min(0).max(100),
});

export const royaltyFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
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
