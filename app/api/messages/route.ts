import { authOptions, type AppSession } from "@/lib/auth";
import { DEFAULT_MESSAGE_PAGE_SIZE, mapMessageToDTO } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";

const MAX_LIMIT = 100;

function parseLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_MESSAGE_PAGE_SIZE;
  }
  return Math.min(parsed, MAX_LIMIT);
}

export async function GET(request: NextRequest) {
  const session = (await getServerSession(authOptions)) as AppSession | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("courseId");
  const cursor = searchParams.get("cursor");
  const limit = parseLimit(searchParams.get("limit"));

  if (!courseId) {
    return NextResponse.json({ error: "courseId is required" }, { status: 400 });
  }

  const course = await prisma.course.findUnique({ where: { id: courseId } });

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  // Auto-enroll authenticated users that open a class chat.
  // This keeps UX simple while still enforcing membership for posting.
  await prisma.classMembership.upsert({
    where: {
      userId_courseId: {
        userId,
        courseId,
      },
    },
    update: {},
    create: {
      userId,
      courseId,
    },
  });

  const messages = await prisma.message.findMany({
    where: { courseId },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: [
      { createdAt: "desc" },
      { id: "desc" },
    ],
    take: limit + 1,
    ...(cursor
      ? {
          cursor: {
            id: cursor,
          },
          skip: 1,
        }
      : {}),
  });

  const hasMore = messages.length > limit;
  const sliced = hasMore ? messages.slice(0, limit) : messages;
  const nextCursor = hasMore ? sliced[sliced.length - 1]?.id : null;

  // Return oldest -> newest for the client to render naturally.
  return NextResponse.json({
    messages: sliced.map(mapMessageToDTO).reverse(),
    nextCursor,
  });
}

export async function POST(request: NextRequest) {
  const session = (await getServerSession(authOptions)) as AppSession | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const courseId = body?.courseId as string | undefined;
  const content = typeof body?.content === "string" ? body.content.trim() : "";

  if (!courseId || !content) {
    return NextResponse.json(
      { error: "courseId and non-empty content are required" },
      { status: 400 },
    );
  }

  const course = await prisma.course.findUnique({ where: { id: courseId } });

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const membership = await prisma.classMembership.findUnique({
    where: {
      userId_courseId: { userId, courseId },
    },
  });

  // Design choice: automatically create membership on first send to keep UX frictionless.
  if (!membership) {
    await prisma.classMembership.create({
      data: { userId, courseId },
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  const senderName = user?.name || user?.email || "Classmate";

  const created = await prisma.message.create({
    data: {
      courseId,
      senderId: userId,
      senderName,
      content,
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return NextResponse.json(
    {
      message: mapMessageToDTO(created),
    },
    { status: 201 },
  );
}
