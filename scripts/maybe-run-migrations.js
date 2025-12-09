const { execSync } = require("child_process");
const { Client } = require("pg");

const skip =
  process.env.SKIP_PRISMA_MIGRATE === "1" ||
  process.env.SKIP_PRISMA_MIGRATE === "true";
const connectionString = process.env.DATABASE_URL;
const connectionTimeoutMillis = Number(process.env.DB_CONNECT_TIMEOUT_MS) || 5000;

async function main() {
  if (skip) {
    console.log("Skipping Prisma migrations because SKIP_PRISMA_MIGRATE is set.");
    return;
  }

  if (!connectionString) {
    console.warn("DATABASE_URL is missing; skipping Prisma migrations.");
    return;
  }

  const client = new Client({ connectionString, connectionTimeoutMillis });

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
