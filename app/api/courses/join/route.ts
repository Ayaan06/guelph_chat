import { authOptions, type AppSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { NextResponse, type NextRequest } from "next/server";

// Prisma requires the Node runtime.
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = (await getServerSession(authOptions)) as AppSession | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const courseId = typeof body?.courseId === "string" ? body.courseId : null;

  if (!courseId) {
    return NextResponse.json(
      { error: "courseId is required" },
      { status: 400 },
    );
  }

  let course = await prisma.course.findUnique({
    where: { id: courseId },
  });

  // Allow joining by human-readable code as a fallback.
  if (!course) {
    course = await prisma.course.findUnique({
      where: { code: courseId },
    });
  }

  if (!course) {
    return NextResponse.json(
      { error: "Course not found" },
      { status: 404 },
    );
  }

  await prisma.classMembership.upsert({
    where: {
      userId_courseId: {
        userId,
        courseId: course.id,
      },
    },
    update: {},
    create: {
      userId,
      courseId: course.id,
    },
  });

  const memberCount = await prisma.classMembership.count({
    where: { courseId: course.id },
  });

  return NextResponse.json({
    course: {
      id: course.id,
      code: course.code,
      name: course.name,
      major: course.major,
      level: course.level,
      memberCount,
    },
  });
}
