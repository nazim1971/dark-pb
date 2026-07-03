import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z
    .string()
    .url("DATABASE_URL must be a valid PostgreSQL connection URL")
    .refine((value) => value.startsWith("postgres://") || value.startsWith("postgresql://"), {
      message: "DATABASE_URL must start with postgres:// or postgresql://",
    }),
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_ACCESS_EXPIRATION: z.string().min(1, "JWT_ACCESS_EXPIRATION is required"),
  JWT_REFRESH_EXPIRATION: z.string().min(1, "JWT_REFRESH_EXPIRATION is required"),
  BCRYPT_ROUNDS: z.coerce.number().int().min(8).max(15).optional(),
  PASSWORD_RESET_TOKEN_EXP_MINUTES: z.coerce.number().int().min(5).max(120).optional(),
  EMAIL_VERIFICATION_TOKEN_EXP_HOURS: z.coerce.number().int().min(1).max(168).optional(),
  COOKIE_SECRET: z.string().min(32, "COOKIE_SECRET must be at least 32 characters"),
  PRISMA_LOG_QUERIES: z.enum(["true", "false"]).optional(),
  SEED_ADMIN_EMAIL: z.string().email().optional(),
  SEED_ADMIN_PASSWORD: z.string().min(8).optional(),
  SEED_ADMIN_FIRST_NAME: z.string().min(1).optional(),
  SEED_ADMIN_LAST_NAME: z.string().min(1).optional(),
});

export type AppConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): AppConfig {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Environment validation failed: ${issues}`);
  }

  return result.data;
}
