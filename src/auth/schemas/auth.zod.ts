import { Role } from "@prisma/client";
import { z } from "zod";
import { RegistrationRole, RegistrationType } from "../dto/register.dto";
import {
  emailValidator,
  nameValidator,
  passwordValidator,
} from "../../common/validation/zod-validators";

export const registerRequestSchema = z
  .object({
    email: emailValidator,
    password: passwordValidator,
    firstName: nameValidator,
    lastName: nameValidator,
    role: z.nativeEnum(RegistrationRole),
    registrationType: z.nativeEnum(RegistrationType),
    companyName: z.string().trim().min(1).max(160).optional(),
    companyType: z.enum(["PUBLISHER", "RECORD_LABEL", "ADMINISTRATION", "OTHER"]).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.registrationType === RegistrationType.COMPANY && !data.companyName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "companyName is required when registrationType is COMPANY",
        path: ["companyName"],
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
