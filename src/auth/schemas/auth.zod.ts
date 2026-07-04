import { Role } from "@prisma/client";
import { z } from "zod";
import { RegistrationRole, RegistrationType } from "../dto/register.dto";
import { emailValidator, passwordValidator } from "../../common/validation/zod-validators";

export const registerRequestSchema = z
  .object({
    email: emailValidator,
    password: passwordValidator,
    legalName: z.string().trim().min(1).max(180).optional(),
    stageName: z.string().trim().min(1).max(120).optional(),
    country: z.string().trim().min(1).max(80).optional(),
    phone: z.string().trim().min(3).max(40).optional(),
    spotifyArtistLink: z.string().trim().url().max(500).optional(),
    pro: z.string().trim().min(1).max(80).optional(),
    ipiNumber: z.string().trim().min(1).max(80).optional(),
    role: z.nativeEnum(RegistrationRole),
    registrationType: z.nativeEnum(RegistrationType),
    companyName: z.string().trim().min(1).max(160).optional(),
    companyNumber: z.string().trim().min(1).max(120).optional(),
    address: z.string().trim().min(1).max(255).optional(),
    director: z.string().trim().min(1).max(160).optional(),
    companyEmail: emailValidator.optional(),
    companyPhone: z.string().trim().min(3).max(40).optional(),
    companyType: z.enum(["PUBLISHER", "RECORD_LABEL", "ADMINISTRATION", "OTHER"]).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.registrationType === RegistrationType.INDIVIDUAL && !data.legalName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "legalName is required when registrationType is INDIVIDUAL",
        path: ["legalName"],
      });
    }

    if (data.registrationType === RegistrationType.COMPANY && !data.companyName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "companyName is required when registrationType is COMPANY",
        path: ["companyName"],
      });
    }

    if (data.registrationType === RegistrationType.COMPANY && !data.companyNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "companyNumber is required when registrationType is COMPANY",
        path: ["companyNumber"],
      });
    }

    if (data.registrationType === RegistrationType.COMPANY && !data.address) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "address is required when registrationType is COMPANY",
        path: ["address"],
      });
    }

    if (data.registrationType === RegistrationType.COMPANY && !data.director) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "director is required when registrationType is COMPANY",
        path: ["director"],
      });
    }

    if (data.registrationType === RegistrationType.COMPANY && !data.companyPhone && !data.phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "companyPhone or phone is required when registrationType is COMPANY",
        path: ["companyPhone"],
      });
    }
  });

export const loginRequestSchema = z.object({
  email: emailValidator,
  password: passwordValidator,
});

export const forgotPasswordRequestSchema = z.object({
  email: emailValidator,
});

export const resetPasswordRequestSchema = z.object({
  token: z.string().min(20).max(512),
  newPassword: passwordValidator,
});

export const verifyEmailRequestSchema = z.object({
  token: z.string().min(20).max(512),
});

export const messageResponseSchema = z.object({
  message: z.string(),
});

export const authTokenResponseSchema = z.object({
  accessToken: z.string().min(1),
  tokenType: z.literal("Bearer"),
  expiresIn: z.string().min(1),
  user: z.object({
    id: z.string().uuid(),
    email: emailValidator,
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    role: z.nativeEnum(Role),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),
});
