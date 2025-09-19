import { PrismaClient } from "@prisma/client";

// Global Prisma client instance
export const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
});

// Graceful shutdown
export async function disconnectDatabase() {
  await prisma.$disconnect();
}
