const { execSync } = require("child_process");
const { Client } = require("pg");

const skip =
  process.env.SKIP_PRISMA_MIGRATE === "1" ||
  process.env.SKIP_PRISMA_MIGRATE === "true";
const connectionString = process.env.DATABASE_URL;
const connectionTimeoutMillis = Number(process.env.DB_CONNECT_TIMEOUT_MS) || 5000;
const useRelaxedTls =
  process.env.PRISMA_INSECURE_TLS === "1" ||
  process.env.PRISMA_INSECURE_TLS === "true";

// When using Supabase pooler, TLS verification can fail in CI.
// Allow opting out via PRISMA_INSECURE_TLS to keep builds running.
if (useRelaxedTls) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

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
            require: true,
            rejectUnauthorized: false,
          }
        : shouldUseSsl
          ? { require: true, rejectUnauthorized: false }
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

  // Prevent unhandled error events from crashing the build.
  client.on("error", (err) => {
    console.warn("Database connection error (skipping migrations):", err.message);
  });

  try {
    await client.connect();
    await client.query("select 1");
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

  try {
    execSync("npx prisma migrate deploy", {
      stdio: "inherit",
      env: {
        ...process.env,
        ...(useRelaxedTls ? { NODE_TLS_REJECT_UNAUTHORIZED: "0" } : {}),
      },
    });
  } catch (error) {
    console.warn(
      `Prisma migrate deploy failed (continuing build): ${error.stderr?.toString() || error.message}`,
    );
  }
}

main().catch((error) => {
  console.error("Unexpected error while preparing migrations:", error);
  process.exit(1);
});
