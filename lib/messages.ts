import type { Prisma } from "@prisma/client";
import { MESSAGE_PAGE_SIZE } from "./chatConfig";
import { prisma } from "./prisma";
import type { MessageDTO } from "@/types/chat";

type MessageWithSender = Prisma.MessageGetPayload<{
  include: { sender: { select: { id: true; name: true; email: true } } };
}>;

export function mapMessageToDTO(message: MessageWithSender): MessageDTO {
  const fallbackName = message.sender.name || message.sender.email || "Classmate";

  return {
    id: message.id,
    courseId: message.courseId,
    senderId: message.senderId,
    senderName: message.senderName || fallbackName,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  };
}

export async function fetchInitialMessagesForCourse(
  courseId: string,
  limit = MESSAGE_PAGE_SIZE,
) {
  const results = await prisma.message.findMany({
    where: { courseId },
    include: {
      sender: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: [
      { createdAt: "desc" },
      { id: "desc" },
    ],
    take: limit + 1,
  });

  const hasMore = results.length > limit;
  const sliced = hasMore ? results.slice(0, limit) : results;

  return {
    messages: sliced.map(mapMessageToDTO).reverse(),
    nextCursor: hasMore ? sliced[sliced.length - 1]?.id ?? null : null,
  };
}
