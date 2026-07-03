import { z } from "zod";

export const adminActionSchema = z.object({
  note: z.string().trim().max(500).optional(),
});

export const editWorkMetadataSchema = z.object({
  songTitle: z.string().trim().max(200).optional(),
  alternativeTitle: z.string().trim().max(200).optional(),
  language: z.string().trim().max(80).optional(),
  genre: z.string().trim().max(80).optional(),
  isrc: z.string().trim().max(32).optional(),
  spotifyUrl: z.string().url().optional(),
  appleMusicUrl: z.string().url().optional(),
  youtubeUrl: z.string().url().optional(),
  releaseDate: z.coerce.date().optional(),
  version: z.string().trim().max(80).optional(),
});

export const addIswcSchema = z.object({
  iswc: z.string().trim().min(1).max(32),
});

export const addIpiSchema = z.object({
  ipi: z.string().trim().min(1).max(64),
});

export const adminReportQuerySchema = z
  .object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    format: z.enum(["csv", "cwr"]).default("csv"),
  })
  .refine((data) => !data.from || !data.to || data.to >= data.from, {
    message: "to must be on or after from",
    path: ["to"],
  });

export const adminActivityQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  action: z
    .enum(["CREATE", "UPDATE", "DELETE", "APPROVE", "REJECT", "LOGIN", "LOGOUT", "EXPORT"])
    .optional(),
  entityType: z
    .enum([
      "USER",
      "COMPANY",
      "KYC",
      "COMPOSITION",
      "WRITER",
      "RECORDING",
      "PUBLISHER",
      "LYRICS",
      "CONTRACT",
      "ROYALTY",
      "STATEMENT",
      "CONFLICT",
      "TICKET",
      "NOTIFICATION",
    ])
    .optional(),
});
