import { PrismaClient, Role } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

async function seedAdminUser(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const firstName = process.env.SEED_ADMIN_FIRST_NAME?.trim() || "System";
  const lastName = process.env.SEED_ADMIN_LAST_NAME?.trim() || "Admin";

  if (!email || !password) {
    // Seed is optional by default for local/dev environments.
    console.log("Skipping admin seed: set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to enable.");
    return;
  }

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
  });

  await prisma.user.upsert({
    where: { email },
    update: {
      firstName,
      lastName,
      role: Role.ADMIN,
      passwordHash,
      deletedAt: null,
    },
    create: {
      email,
      firstName,
      lastName,
      role: Role.ADMIN,
      passwordHash,
    },
  });

  console.log(`Seeded admin user: ${email}`);
}

async function main(): Promise<void> {
  await seedAdminUser();
}

main()
  .catch((error: unknown) => {
    console.error("Seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
