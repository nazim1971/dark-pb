import { z } from "zod";

const contractBaseSchema = z.object({
  contractNo: z.string().trim().min(3).max(80),
  title: z.string().trim().min(3).max(200),
  type: z.enum(["PUBLISHING_AGREEMENT", "SPLIT_SHEET", "ADMINISTRATION_AGREEMENT"]),
  status: z.enum(["DRAFT", "ACTIVE", "EXPIRED", "TERMINATED"]).default("DRAFT"),
  effectiveFrom: z.coerce.date(),
  effectiveTo: z.coerce.date().optional(),
  companyId: z.string().uuid().optional(),
  publisherId: z.string().uuid().optional(),
});

export const createContractSchema = contractBaseSchema.refine(
  (data) => !data.effectiveTo || data.effectiveTo >= data.effectiveFrom,
  {
    message: "effectiveTo must be on or after effectiveFrom",
    path: ["effectiveTo"],
  },
);

export const updateContractSchema = contractBaseSchema.partial().extend({
  id: z.string().uuid(),
});

export const contractActionSchema = z.object({
  note: z.string().trim().max(500).optional(),
});

export const attachContractCompositionsSchema = z.object({
  compositions: z
    .array(
      z.object({
        compositionId: z.string().uuid(),
        territory: z.string().trim().max(120).optional(),
        sharePercentage: z.number().min(0).max(100).optional(),
      }),
    )
    .min(1),
});

export const contractQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  title: z.string().trim().max(200).optional(),
  type: z.enum(["PUBLISHING_AGREEMENT", "SPLIT_SHEET", "ADMINISTRATION_AGREEMENT"]).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "EXPIRED", "TERMINATED"]).optional(),
  companyId: z.string().uuid().optional(),
  publisherId: z.string().uuid().optional(),
  song: z.string().trim().max(200).optional(),
  year: z.coerce.number().int().min(1900).max(3000).optional(),
});
