import { z } from "zod";
import {
  adminSearchQuerySchema,
  dateRangeQuerySchema,
  paginationSchema,
} from "../../common/validation/zod-schema.patterns";

export const adminActionSchema = z.object({
  note: z.string().trim().max(500).optional(),
});

export const editSongMetadataSchema = z.object({
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

export const adminReportQuerySchema = dateRangeQuerySchema.and(
  z.object({
    format: z.enum(["csv", "cwr"]).default("csv"),
  }),
);

export const adminDashboardQuerySchema = dateRangeQuerySchema;

export const adminUsersQuerySchema = paginationSchema.extend({
  search: adminSearchQuerySchema.shape.search,
  role: z
    .enum(["SONGWRITER", "COMPOSER", "ARTIST", "PUBLISHER", "RECORD_LABEL", "ADMIN"])
    .optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  registrationType: z.enum(["INDIVIDUAL", "COMPANY"]).optional(),
});

export const adminKycQuerySchema = paginationSchema.extend({
  search: adminSearchQuerySchema.shape.search,
  status: z.enum(["PENDING", "VERIFIED", "REJECTED"]).optional(),
});

export const adminSongsQuerySchema = paginationSchema.extend({
  search: adminSearchQuerySchema.shape.search,
  status: z.enum(["SUBMITTED", "PROCESSING", "REGISTERED"]).optional(),
  released: z.coerce.boolean().optional(),
  ownerId: z.string().uuid().optional(),
});

export const updateSongStatusSchema = z.object({
  status: z.enum(["SUBMITTED", "PROCESSING", "REGISTERED"]),
  note: z.string().trim().max(500).optional(),
});

export const updateStatementStatusSchema = z.object({
  status: z.enum(["DRAFT", "FINALIZED", "SENT", "PAID"]),
  note: z.string().trim().max(500).optional(),
});

export const adminActivityQuerySchema = paginationSchema.extend({
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
      "LYRICS",
      "ROYALTY",
      "STATEMENT",
      "NOTIFICATION",
    ])
    .optional(),
});
