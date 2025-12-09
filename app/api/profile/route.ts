import { authOptions, type AppSession } from "@/lib/auth";
import {
  normalizeInterestsList,
  validMajorIds,
  validYearOptions,
} from "@/lib/profile";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";

// Prisma requires the Node runtime
export const runtime = "nodejs";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function getAuthedUserId(): Promise<string | null> {
  const session = (await getServerSession(authOptions)) as AppSession | null;
  return session?.user?.id ?? null;
}

export async function GET() {
  const userId = await getAuthedUserId();

  if (!userId) {
    return jsonError("Unauthorized", 401);
  }

  const profile = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      majorId: true,
      year: true,
      interests: true,
    },
  });

  return NextResponse.json({ profile });
}

export async function PUT(request: NextRequest) {
  const userId = await getAuthedUserId();

  if (!userId) {
    return jsonError("Unauthorized", 401);
  }

  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return jsonError("Invalid payload");
  }

  const nameRaw = typeof body.name === "string" ? body.name.trim() : null;
  const majorIdRaw = typeof body.majorId === "string" ? body.majorId : null;
  const yearRaw = typeof body.year === "string" ? body.year : null;
  const interestsRaw = Array.isArray(body.interests) ? body.interests : null;

  if (majorIdRaw && !validMajorIds.has(majorIdRaw)) {
    return jsonError("Invalid major selection");
  }

  if (yearRaw && !validYearOptions.has(yearRaw)) {
    return jsonError("Invalid year selection");
  }

  const updateData: Prisma.UserUpdateInput = {};

  if (nameRaw !== null) {
    updateData.name = nameRaw.length ? nameRaw : null;
  }

  if (majorIdRaw !== null) {
    updateData.majorId = majorIdRaw.length ? majorIdRaw : null;
  }

  if (yearRaw !== null) {
    updateData.year = yearRaw.length ? yearRaw : null;
  }

  if (interestsRaw !== null) {
    updateData.interests = { set: normalizeInterestsList(interestsRaw) };
  }

  if (!Object.keys(updateData).length) {
    return jsonError("No fields to update");
  }

  const profile = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      name: true,
      email: true,
      majorId: true,
      year: true,
      interests: true,
    },
  });

  return NextResponse.json({ profile });
}
