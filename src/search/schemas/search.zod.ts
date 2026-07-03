import { z } from "zod";

export const searchQuerySchema = z
  .object({
    q: z.string().trim().max(200).optional(),
    types: z.array(z.enum(["composition", "writer", "publisher", "recording"])).optional(),
    song: z.string().trim().max(200).optional(),
    writer: z.string().trim().max(200).optional(),
    publisher: z.string().trim().max(200).optional(),
    artist: z.string().trim().max(200).optional(),
    isrc: z.string().trim().max(64).optional(),
    iswc: z.string().trim().max(64).optional(),
    ipi: z.string().trim().max(64).optional(),
    spotifyUrl: z.string().url().optional(),
    sortBy: z.enum(["relevance", "createdAt", "updatedAt", "title"]).default("relevance"),
    sortDirection: z.enum(["asc", "desc"]).default("desc"),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine(
    (data) =>
      !!(
        data.q ||
        data.song ||
        data.writer ||
        data.publisher ||
        data.artist ||
        data.isrc ||
        data.iswc ||
        data.ipi ||
        data.spotifyUrl
      ),
    {
      message: "At least one search input is required",
      path: ["q"],
    },
  );
