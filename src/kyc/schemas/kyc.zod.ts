import { z } from "zod";
import { paginationSchema } from "../../common/validation/zod-schema.patterns";

export const createKycSchema = z.object({
  documentType: z.string().trim().min(2).max(80),
  documentNumber: z.string().trim().min(2).max(120).optional(),
  country: z.string().trim().min(2).max(80).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const reviewKycSchema = z.object({
  status: z.enum(["PENDING", "VERIFIED", "REJECTED"]),
  notes: z.string().trim().max(500).optional(),
});

export const submitKycSchema = z.object({
  documentType: z.string().trim().min(2).max(80),
  documentNumber: z.string().trim().min(2).max(120).optional(),
  country: z.string().trim().min(2).max(80).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const kycPendingQuerySchema = paginationSchema;
