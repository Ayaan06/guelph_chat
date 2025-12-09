import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "pg";

const { Pool } = pkg;
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

// Use the Postgres driver adapter with a small pool and direct (5432) connection.
const shouldUseSsl =
  !["localhost", "127.0.0.1"].includes(parsedDbUrl.hostname) &&
  parsedDbUrl.searchParams.get("sslmode")?.toLowerCase() !== "disable";

// pg does not need the sslmode param when ssl is configured directly.
parsedDbUrl.searchParams.delete("sslmode");

const adapter = new PrismaPg(
  new Pool({
    connectionString: parsedDbUrl.toString(),
    max: 5,
    ssl: shouldUseSsl
      ? {
          require: true,
          rejectUnauthorized: false,
        }
      : undefined,
  }),
);

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

// Reuse the PrismaClient between hot reloads to avoid exhausting connections in dev/serverless.
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
