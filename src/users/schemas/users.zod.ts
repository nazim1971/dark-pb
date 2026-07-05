import { UserStatus } from "@prisma/client";
import { z } from "zod";
import { emailValidator, passwordValidator } from "../../common/validation/zod-validators";

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  legalName: z.string().trim().min(1).max(180).optional(),
  stageName: z.string().trim().min(1).max(120).optional(),
  dateOfBirth: z.coerce.date().optional(),
  country: z.string().trim().min(1).max(80).optional(),
  phone: z.string().trim().min(3).max(40).optional(),
  spotifyArtistLink: z.string().trim().url().max(500).optional(),
  pro: z.string().trim().min(1).max(80).optional(),
  ipiNumber: z.string().trim().min(1).max(80).optional(),
});

export const updateAccountSettingsSchema = z.object({
  email: emailValidator.optional(),
  country: z.string().trim().min(1).max(80).optional(),
  phone: z.string().trim().min(3).max(40).optional(),
  companyLegalName: z.string().trim().min(1).max(160).optional(),
  representativeName: z.string().trim().min(1).max(160).optional(),
  registrationNumber: z.string().trim().min(1).max(120).optional(),
  vatNumber: z.string().trim().min(1).max(120).optional(),
  website: z.string().trim().url().max(255).optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: passwordValidator,
    newPassword: passwordValidator,
  })
  .superRefine((data, ctx) => {
    if (data.currentPassword === data.newPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newPassword"],
        message: "newPassword must be different from currentPassword",
      });
    }
  });

export const updateUserStatusSchema = z.object({
  status: z.nativeEnum(UserStatus),
  reason: z.string().trim().max(500).optional(),
});
