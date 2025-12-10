const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

function normalizeWhitespace(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function deriveLevel(courseCode) {
  const match = courseCode.match(/\*(\d{3,4})/);
  if (!match) {
    return 0;
  }
  const numeric = Number.parseInt(match[1], 10);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  const levelBand = Math.floor(numeric / 1000) * 1000;
  return levelBand || numeric;
}

function buildPrisma() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to seed courses.");
  }

  const parsedDbUrl = new URL(databaseUrl);
  const isPoolerHost = parsedDbUrl.hostname.includes("pooler.supabase.com");
  const isPoolerPort = parsedDbUrl.port === "6543";
  const isPgbouncer =
    parsedDbUrl.searchParams.get("pgbouncer") === "true" ||
    parsedDbUrl.searchParams.get("pooler") === "true";

  if (isPoolerHost || isPoolerPort || isPgbouncer) {
    throw new Error(
      "Use the direct Postgres URL on port 5432 for Prisma seeding (pooler is not supported).",
    );
  }

  const shouldUseSsl =
    !["localhost", "127.0.0.1"].includes(parsedDbUrl.hostname) &&
    parsedDbUrl.searchParams.get("sslmode")?.toLowerCase() !== "disable";

  parsedDbUrl.searchParams.delete("sslmode");

  const pool = new Pool({
    connectionString: parsedDbUrl.toString(),
    max: 5,
    ssl: shouldUseSsl ? { rejectUnauthorized: false } : false,
  });

  const prisma = new PrismaClient({
    adapter: new PrismaPg(pool),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  return { prisma, pool };
}

function chunkArray(items, size) {
  const result = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

async function main() {
  const filePath = path.resolve(__dirname, "..", "full_course_offerings.json");
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing course offerings file at ${filePath}`);
  }

  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const offerings = Array.isArray(raw) ? raw : raw?.data;
  if (!Array.isArray(offerings)) {
    throw new Error("Expected course offerings JSON to be an array.");
  }

  const deduped = new Map();
  for (const course of offerings) {
    const code = normalizeWhitespace(
      course.courseCode || course.code || course.course_code || "",
    );
    if (!code) {
      continue;
    }

    const name =
      normalizeWhitespace(course.courseTitle || course.title) || code;
    const major =
      normalizeWhitespace(course.subject || code.split("*")[0]) || "General";
    const level = deriveLevel(code);

    if (!deduped.has(code)) {
      deduped.set(code, { code, name, major, level });
    }
  }

  const courses = Array.from(deduped.values());
  console.log(`Prepared ${courses.length} unique courses from JSON.`);

  const { prisma, pool } = buildPrisma();

  try {
    const existing = await prisma.course.findMany({ select: { code: true } });
    const existingSet = new Set(existing.map((item) => item.code));

    let createCount = 0;
    let updateCount = 0;

    for (const batch of chunkArray(courses, 100)) {
      await prisma.$transaction(
        batch.map((course) => {
          const willUpdate = existingSet.has(course.code);
          if (willUpdate) {
            updateCount += 1;
          } else {
            createCount += 1;
          }

          return prisma.course.upsert({
            where: { code: course.code },
            update: {
              name: course.name,
              major: course.major,
              level: course.level,
            },
            create: {
              code: course.code,
              name: course.name,
              major: course.major,
              level: course.level,
            },
          });
        }),
      );
    }

    const total = createCount + updateCount;
    console.log(
      `Upserted ${total} courses (${createCount} created, ${updateCount} updated).`,
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Failed to seed courses:", error);
  process.exit(1);
});
