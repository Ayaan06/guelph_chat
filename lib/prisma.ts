import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to initialize Prisma");
}

const parsedDbUrl = new URL(databaseUrl);
const isPoolerHost = parsedDbUrl.hostname.includes("pooler.supabase.com");
const isPoolerPort = parsedDbUrl.port === "6543";
const isPgbouncer =
  parsedDbUrl.searchParams.get("pgbouncer") === "true" ||
  parsedDbUrl.searchParams.get("pooler") === "true";

if (isPoolerHost || isPoolerPort || isPgbouncer) {
  throw new Error(
    "Prisma must use the direct Postgres connection (port 5432), not the Supabase pooler/PgBouncer.",
  );
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

// Reuse the PrismaClient between hot reloads to avoid exhausting connections in serverless.
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
