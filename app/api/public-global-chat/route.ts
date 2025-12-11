import { mapMessageToDTO } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { ensureGlobalCourseAndMembership, GLOBAL_COURSE } from "@/lib/globalCourse";
import { ensureAnonymousUser, ANONYMOUS_USER } from "@/lib/anonymousUser";
import { MESSAGE_PAGE_SIZE } from "@/lib/chatConfig";
import { NextResponse, type NextRequest } from "next/server";

// Prisma requires the Node runtime
export const runtime = "nodejs";

const MAX_LIMIT = 50;

function parseLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return MESSAGE_PAGE_SIZE;
  }
  return Math.min(parsed, MAX_LIMIT);
}

export async function GET(request: NextRequest) {
  await ensureGlobalCourseAndMembership();

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const limit = parseLimit(searchParams.get("limit"));

  const messages = await prisma.message.findMany({
    where: { courseId: GLOBAL_COURSE.id },
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
  const nextCursor = hasMore ? sliced[sliced.length - 1]?.id ?? null : null;

  return NextResponse.json({
    messages: sliced.map(mapMessageToDTO).reverse(),
    nextCursor,
  });
}

export async function POST(request: NextRequest) {
  await ensureGlobalCourseAndMembership();
  const anonymousUser = await ensureAnonymousUser();

  const body = await request.json().catch(() => null);
  const alias =
    typeof body?.alias === "string"
      ? body.alias.slice(0, 50).trim()
      : "";
  const content = typeof body?.content === "string" ? body.content.trim() : "";

  if (!content) {
    return NextResponse.json(
      { error: "Message content is required" },
      { status: 400 },
    );
  }

  // Keep membership synced so counts stay meaningful for the global room.
  await prisma.classMembership.upsert({
    where: {
      userId_courseId: {
        userId: anonymousUser.id,
        courseId: GLOBAL_COURSE.id,
      },
    },
    update: {},
    create: {
      userId: anonymousUser.id,
      courseId: GLOBAL_COURSE.id,
    },
  });

  const created = await prisma.message.create({
    data: {
      courseId: GLOBAL_COURSE.id,
      senderId: anonymousUser.id,
      senderName: alias || ANONYMOUS_USER.name,
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
    { message: mapMessageToDTO(created) },
    { status: 201 },
  );
}
