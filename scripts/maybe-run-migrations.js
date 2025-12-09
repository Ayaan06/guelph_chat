const { execSync } = require("child_process");
const { Client } = require("pg");

const skip =
  process.env.SKIP_PRISMA_MIGRATE === "1" ||
  process.env.SKIP_PRISMA_MIGRATE === "true";
const connectionString = process.env.DATABASE_URL;
const connectionTimeoutMillis = Number(process.env.DB_CONNECT_TIMEOUT_MS) || 5000;
const useRelaxedTls = process.env.PRISMA_INSECURE_TLS === "1";

function buildConnectionConfig(urlString) {
  if (!urlString) return {};
  const url = new URL(urlString);
  const sslMode = url.searchParams.get("sslmode");
  url.searchParams.delete("sslmode");

  const shouldUseSsl =
    sslMode?.toLowerCase() !== "disable" &&
    !["localhost", "127.0.0.1"].includes(url.hostname);

  return {
    connectionString: url.toString(),
    ssl:
      shouldUseSsl && useRelaxedTls
        ? {
            rejectUnauthorized: false,
          }
        : shouldUseSsl
          ? { rejectUnauthorized: false }
          : undefined,
  };
}

async function main() {
  if (skip) {
    console.log("Skipping Prisma migrations because SKIP_PRISMA_MIGRATE is set.");
    return;
  }

  if (!connectionString) {
    console.warn("DATABASE_URL is missing; skipping Prisma migrations.");
    return;
  }

  const client = new Client({
    ...buildConnectionConfig(connectionString),
    connectionTimeoutMillis,
  });

  try {
    await client.connect();
  } catch (error) {
    console.warn(
      `Database not reachable (skipping Prisma migrate deploy): ${error.code ?? error.message}`,
    );
    return;
  } finally {
    try {
      await client.end();
    } catch {
      // ignore
    }
  }

  execSync("npx prisma migrate deploy", { stdio: "inherit" });
}

main().catch((error) => {
  console.error("Unexpected error while preparing migrations:", error);
  process.exit(1);
});
