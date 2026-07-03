import { z } from "zod";

const conflictStatusSchema = z.enum(["OPEN", "UNDER_REVIEW", "RESOLVED", "REJECTED"]);

export const createConflictSchema = z.object({
  compositionId: z.string().uuid(),
  conflictReason: z.string().trim().min(1).max(1000),
  currentClaim: z.number().min(0).max(100),
  ourClaim: z.number().min(0).max(100),
  status: conflictStatusSchema.optional(),
});

export const detectConflictSchema = z.object({
  compositionId: z.string().uuid(),
  currentClaim: z.number().min(0).max(100),
  threshold: z.number().min(0).max(20).default(0.01),
  reason: z.string().trim().max(1000).optional(),
});

export const updateConflictSchema = z.object({
  conflictReason: z.string().trim().min(1).max(1000).optional(),
  currentClaim: z.number().min(0).max(100).optional(),
  ourClaim: z.number().min(0).max(100).optional(),
});

export const reviewConflictSchema = z.object({
  note: z.string().trim().max(1000).optional(),
});

export const resolveConflictSchema = z.object({
  status: z.enum(["RESOLVED", "REJECTED"]),
  resolutionNote: z.string().trim().min(1).max(1000),
});

export const conflictQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  compositionId: z.string().uuid().optional(),
  song: z.string().trim().max(200).optional(),
  status: conflictStatusSchema.optional(),
});
