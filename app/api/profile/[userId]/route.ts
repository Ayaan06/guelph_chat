import { authOptions, type AppSession } from "@/lib/auth";
import { majors } from "@/lib/mockData";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { NextResponse, type NextRequest } from "next/server";

// Prisma requires the Node runtime.
export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  const { userId: requestedUserId } = await context.params;

  const session = (await getServerSession(authOptions)) as AppSession | null;
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!requestedUserId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const profile = await prisma.user.findUnique({
    where: { id: requestedUserId },
    select: {
      name: true,
      email: true,
      majorId: true,
      year: true,
      interests: true,
    },
  });

  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const majorName =
    profile.majorId && majors.find((major) => major.id === profile.majorId)?.name;

  const memberships = await prisma.classMembership.findMany({
    where: { userId: requestedUserId },
    include: { course: { select: { id: true, code: true, name: true } } },
    orderBy: { joinedAt: "desc" },
  });

  const courses =
    memberships
      .filter((membership) => membership.course)
      .map(({ course }) => ({
        id: course.id,
        code: course.code,
        name: course.name,
      })) ?? [];

  return NextResponse.json({
    profile: {
      name: profile.name ?? "Classmate",
      email: profile.email ?? undefined,
      majorId: profile.majorId ?? undefined,
      majorName: majorName ?? profile.majorId ?? undefined,
      year: profile.year ?? undefined,
      interests: profile.interests ?? [],
      courses,
    },
  });
}
