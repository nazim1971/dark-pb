import { z } from "zod";

export const createCompositionSchema = z.object({
  songTitle: z.string().trim().min(1).max(200),
  alternativeTitle: z.string().trim().max(200).optional(),
  language: z.string().trim().max(80).optional(),
  genre: z.string().trim().max(80).optional(),
  lyrics: z.string().trim().max(10000).optional(),
  spotifyUrl: z.string().url().optional(),
  appleMusicUrl: z.string().url().optional(),
  youtubeUrl: z.string().url().optional(),
  iswc: z.string().trim().max(32).optional(),
  isrc: z.string().trim().max(32).optional(),
  releaseDate: z.coerce.date().optional(),
  version: z.string().trim().max(80).optional(),
  status: z.enum(["DRAFT", "SUBMITTED", "UNDER_REVIEW", "PUBLISHED", "REJECTED"]).optional(),
});

export const updateCompositionSchema = createCompositionSchema.partial().extend({
  id: z.string().uuid(),
});

export const compositionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  songTitle: z.string().trim().max(200).optional(),
  language: z.string().trim().max(80).optional(),
  genre: z.string().trim().max(80).optional(),
  iswc: z.string().trim().max(32).optional(),
  isrc: z.string().trim().max(32).optional(),
  status: z.enum(["DRAFT", "SUBMITTED", "UNDER_REVIEW", "PUBLISHED", "REJECTED"]).optional(),
});

export const compositionActionSchema = z.object({
  note: z.string().trim().max(500).optional(),
});

export const nestedWriterSchema = z.object({
  id: z.string().uuid().optional(),
  legalName: z.string().trim().min(1).max(160),
  stageName: z.string().trim().max(160).optional(),
  ipiNumber: z.string().trim().max(64).optional(),
  pro: z.string().trim().max(64).optional(),
  role: z.enum(["SONGWRITER", "COMPOSER", "LYRICIST", "ARRANGER", "ADAPTOR", "OTHER"]),
  publisher: z.string().trim().max(120).optional(),
  country: z.string().trim().max(80).optional(),
  writerShare: z.number().min(0).max(100),
});

export const nestedRecordingSchema = z.object({
  id: z.string().uuid().optional(),
  isrc: z.string().trim().max(32).optional(),
  artist: z.string().trim().min(1).max(160),
  spotifyLink: z.string().url().optional(),
  duration: z.number().int().min(0),
  release: z.coerce.date().optional(),
  version: z.string().trim().max(80).optional(),
  label: z.string().trim().max(120).optional(),
});

export const nestedPublisherSchema = z.object({
  id: z.string().uuid().optional(),
  publisherName: z.string().trim().min(1).max(160),
  ipi: z.string().trim().max(64).optional(),
  territory: z.string().trim().max(120).optional(),
  share: z.number().min(0).max(100),
  agreementFrom: z.coerce.date().optional(),
  agreementTo: z.coerce.date().optional(),
});

export const upsertCompositionRelationsSchema = z
  .object({
    writers: z.array(nestedWriterSchema).default([]),
    recordings: z.array(nestedRecordingSchema).default([]),
    publishers: z.array(nestedPublisherSchema).default([]),
  })
  .superRefine((data, ctx) => {
    const writerShareTotal = data.writers.reduce((sum, writer) => sum + writer.writerShare, 0);
    if (writerShareTotal > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Total writer share cannot exceed 100%",
        path: ["writers"],
      });
    }

    const publisherShareTotal = data.publishers.reduce(
      (sum, publisher) => sum + publisher.share,
      0,
    );
    if (publisherShareTotal > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Total publisher share cannot exceed 100%",
        path: ["publishers"],
      });
    }
  });
