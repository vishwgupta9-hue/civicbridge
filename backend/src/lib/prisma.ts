import { PrismaClient } from "@prisma/client";
import { config } from "../config/index.js";

// PrismaClient singleton — prevents multiple instances during development hot-reloads.
// Pattern: one global instance in dev, one module-level instance in production.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      config.nodeEnv === "development"
        ? ["query", "warn", "error"]
        : ["warn", "error"],
  });

if (config.nodeEnv !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
