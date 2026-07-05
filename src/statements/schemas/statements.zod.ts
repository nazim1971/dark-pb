import { z } from "zod";
import { paginationSchema } from "../../common/validation/zod-schema.patterns";

const royaltyTypeSchema = z.enum([
  "PERFORMANCE",
  "MECHANICAL",
  "LYRICS",
  "SYNCHRONIZATION",
  "OTHER",
]);
const royaltyStatusSchema = z.enum(["PENDING", "PROCESSED", "DISPUTED", "PAID"]);
const statementStatusSchema = z.enum(["DRAFT", "FINALIZED", "SENT", "PAID"]);
const exportFormatSchema = z.enum(["csv", "excel", "pdf", "cwr"]);

export const generateStatementSchema = z
  .object({
    periodStart: z.coerce.date(),
    periodEnd: z.coerce.date(),
    userId: z.string().uuid().optional(),
    companyId: z.string().uuid().optional(),
    compositionId: z.string().uuid().optional(),
    song: z.string().trim().max(200).optional(),
    country: z.string().trim().max(80).optional(),
    dsp: z.string().trim().max(120).optional(),
    type: royaltyTypeSchema.optional(),
    status: royaltyStatusSchema.optional(),
    currency: z.string().trim().length(3).default("USD"),
  })
  .refine((data) => data.periodEnd >= data.periodStart, {
    message: "periodEnd must be on or after periodStart",
    path: ["periodEnd"],
  });

export const statementQuerySchema = paginationSchema.extend({
  userId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  song: z.string().trim().max(200).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(1900).max(3000).optional(),
  country: z.string().trim().max(80).optional(),
  dsp: z.string().trim().max(120).optional(),
  status: statementStatusSchema.optional(),
});

export const statementExportQuerySchema = statementQuerySchema.extend({
  format: exportFormatSchema.default("csv"),
});

export const statementFileQuerySchema = z.object({
  format: exportFormatSchema.default("pdf"),
});
