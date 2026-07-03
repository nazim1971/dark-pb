import { z } from "zod";

export const createTicketSchema = z.object({
  subject: z.string().trim().min(3).max(180),
  message: z.string().trim().min(1).max(5000),
  category: z
    .enum(["ACCOUNT", "KYC", "COMPOSITION", "ROYALTY", "CONTRACT", "TECHNICAL", "OTHER"])
    .default("OTHER"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
});

export const ticketReplySchema = z.object({
  message: z.string().trim().min(1).max(5000),
  internalNote: z.string().trim().max(200).optional(),
});

export const ticketStatusSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "WAITING_FOR_USER", "RESOLVED", "CLOSED"]),
  note: z.string().trim().max(500).optional(),
});

export const ticketQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["OPEN", "IN_PROGRESS", "WAITING_FOR_USER", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  category: z
    .enum(["ACCOUNT", "KYC", "COMPOSITION", "ROYALTY", "CONTRACT", "TECHNICAL", "OTHER"])
    .optional(),
  search: z.string().trim().max(200).optional(),
});
