import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "pg";

const { Pool } = pkg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to initialize Prisma");
}

const connectionUrl = new URL(connectionString);
const sslMode = connectionUrl.searchParams.get("sslmode");
connectionUrl.searchParams.delete("sslmode");
const sanitizedConnectionString = connectionUrl.toString();

// Some managed Postgres providers (e.g. Supabase pooler) present a cert chain
// that fails strict validation in local dev. Remove sslmode from the URL so we
// can enforce a relaxed TLS config ourselves.
const shouldUseSsl =
  sslMode?.toLowerCase() !== "disable" &&
  !["localhost", "127.0.0.1"].includes(connectionUrl.hostname);

const ssl = shouldUseSsl
  ? {
      rejectUnauthorized: false,
    }
  : undefined;

const adapter = new PrismaPg(
  new Pool({
    connectionString: sanitizedConnectionString,
    max: 5,
    ssl,
  }),
);

// Avoid creating multiple PrismaClient instances in development
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
