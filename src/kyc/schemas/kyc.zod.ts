import { z } from "zod";

export const createKycSchema = z.object({
  documentType: z.string().trim().min(2).max(80),
  documentNumber: z.string().trim().min(2).max(120).optional(),
  country: z.string().trim().min(2).max(80).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const reviewKycSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  notes: z.string().trim().max(500).optional(),
});

export const kycPendingQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
