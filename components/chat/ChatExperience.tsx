"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatMessage } from "./ChatMessage";
import { MESSAGE_PAGE_SIZE } from "@/lib/chatConfig";
import { hasRealtimeEnv, supabaseClient } from "@/lib/supabaseClient";
import type { CourseSummary, MessageDTO } from "@/types/chat";

type ChatExperienceProps = {
  courses: CourseSummary[];
  userId: string;
};

function sortMessages(messages: MessageDTO[]) {
  return [...messages].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

function mergeMessages(current: MessageDTO[], incoming: MessageDTO[]) {
  const map = new Map<string, MessageDTO>();
  current.forEach((message) => map.set(message.id, message));
  incoming.forEach((message) => map.set(message.id, message));
  return sortMessages(Array.from(map.values()));
}

export function ChatExperience({
  courses,
  userId,
}: ChatExperienceProps) {
  const [selectedCourseId, setSelectedCourseId] = useState(
    courses[0]?.id ?? "",
  );
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPaginating, setIsPaginating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const prependingRef = useRef(false);
  const messagesInitializedRef = useRef(false);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const activeCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId),
    [courses, selectedCourseId],
  );

  const displayedMessages = useMemo(
    () =>
      messages.map((message) => ({
        ...message,
        isOwn: message.senderId === userId,
      })),
    [messages, userId],
  );

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });
  };

  const fetchLatest = useCallback(async (courseId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/messages?courseId=${courseId}&limit=${MESSAGE_PAGE_SIZE}`,
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Unable to load messages");
      }
      const data = (await response.json()) as {
        messages: MessageDTO[];
        nextCursor?: string | null;
      };
      setMessages(sortMessages(data.messages ?? []));
      setNextCursor(data.nextCursor ?? null);
      messagesInitializedRef.current = true;
      scrollToBottom("auto");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchOlder = async () => {
    if (!activeCourse?.id || !nextCursor || isPaginating) return;
    prependingRef.current = true;
    setIsPaginating(true);
    const container = containerRef.current;
    const previousHeight = container?.scrollHeight ?? 0;

    try {
      const response = await fetch(
        `/api/messages?courseId=${activeCourse.id}&cursor=${nextCursor}&limit=${MESSAGE_PAGE_SIZE}`,
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Unable to load older messages");
      }
      const data = (await response.json()) as {
        messages: MessageDTO[];
        nextCursor?: string | null;
      };
      setMessages((prev) => mergeMessages(data.messages ?? [], prev));
      setNextCursor(data.nextCursor ?? null);

      requestAnimationFrame(() => {
        if (!container) return;
        const newHeight = container.scrollHeight;
        container.scrollTop = newHeight - previousHeight;
      });
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to load older messages",
      );
    } finally {
      setIsPaginating(false);
    }
  };

  const refreshLatest = useCallback(async () => {
    if (!activeCourse?.id) return;
    try {
      const response = await fetch(
        `/api/messages?courseId=${activeCourse.id}&limit=${MESSAGE_PAGE_SIZE}`,
      );
      if (!response.ok) return;
      const data = (await response.json()) as { messages: MessageDTO[] };
      setMessages((prev) => mergeMessages(prev, data.messages ?? []));
    } catch (err) {
      console.error("Polling latest messages failed", err);
    }
  }, [activeCourse?.id]);

  useEffect(() => {
    setError(null);
    setMessages([]);
    setNextCursor(null);
    messagesInitializedRef.current = false;

    if (activeCourse?.id) {
      fetchLatest(activeCourse.id);
    }
  }, [activeCourse?.id, fetchLatest]);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (prependingRef.current) {
      prependingRef.current = false;
      return;
    }
    scrollToBottom(messagesInitializedRef.current ? "smooth" : "auto");
    messagesInitializedRef.current = true;
  }, [messages.length, isLoading]);

  useEffect(() => {
    if (!activeCourse?.id || !hasRealtimeEnv || !supabaseClient) {
      setIsRealtimeActive(false);
      return;
    }

    const channel = supabaseClient
      .channel(`messages-course-${activeCourse.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `courseId=eq.${activeCourse.id}`,
        },
        (payload) => {
          const incoming = payload.new as {
            id: string;
            courseId: string;
            senderId: string;
            senderName?: string | null;
            content: string;
            createdAt?: string;
          };

          const message: MessageDTO = {
            id: incoming.id,
            courseId: incoming.courseId,
            senderId: incoming.senderId,
            senderName: incoming.senderName || "Classmate",
            content: incoming.content,
            createdAt:
              incoming.createdAt ??
              new Date().toISOString(),
          };

          setMessages((prev) => {
            if (prev.some((existing) => existing.id === message.id)) {
              return prev;
            }
            return sortMessages([...prev, message]);
          });
        },
      )
      .subscribe((status) => {
        setIsRealtimeActive(status === "SUBSCRIBED");
      });

    return () => {
      supabaseClient.removeChannel(channel);
      setIsRealtimeActive(false);
    };
  }, [activeCourse?.id]);

  useEffect(() => {
    if (!activeCourse?.id) {
      return undefined;
    }

    if (hasRealtimeEnv && supabaseClient) {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return () => undefined;
    }

    pollTimerRef.current = setInterval(refreshLatest, 3000);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [activeCourse?.id, refreshLatest]);

  const handleSend = async () => {
    if (!activeCourse?.id) return;

    const trimmed = draft.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setError(null);

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId: activeCourse.id,
          content: trimmed,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Unable to send message");
      }

      const data = (await response.json()) as { message: MessageDTO };
      setDraft("");

      if (!hasRealtimeEnv || !supabaseClient) {
        setMessages((prev) => mergeMessages(prev, [data.message]));
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[300px,1fr]">
      <aside className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Join a chat
          </p>
          <h3 className="text-lg font-semibold text-slate-900">
            Pick a class to text
          </h3>
          <p className="text-sm text-slate-600">
            Choose a course chat, then start texting classmates right away.
          </p>
        </div>
        <div className="space-y-2">
          {courses.map((course) => {
            const isActive = course.id === selectedCourseId;
            return (
              <button
                key={course.id}
                type="button"
                onClick={() => setSelectedCourseId(course.id)}
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                  isActive
                    ? "border-blue-200 bg-blue-50 text-blue-800"
                    : "border-slate-200 bg-white text-slate-800 hover:border-blue-200 hover:bg-slate-50"
                }`}
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {course.code}
                  </p>
                  <p className="text-sm font-semibold">{course.name}</p>
                  <p className="text-xs text-slate-500">{course.major}</p>
                </div>
                <span className="text-xs font-semibold">
                  {isActive ? "Active" : "Open"}
                </span>
              </button>
            );
          })}
          {courses.length === 0 && (
            <p className="text-sm text-slate-600">
              Join a class to start chatting.
            </p>
          )}
        </div>
      </aside>

      <section
        id="chat-window"
        className="flex min-h-[520px] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              Class chat
            </p>
            <h2 className="text-xl font-semibold text-slate-900">
              {activeCourse
                ? `${activeCourse.code} - ${activeCourse.name}`
                : "Select a class"}
            </h2>
            <p className="text-sm text-slate-600">
              Text classmates, share updates, and keep the conversation moving.
            </p>
            <p className="text-xs text-slate-500">
              {hasRealtimeEnv
                ? `Realtime ${isRealtimeActive ? "connected" : "connecting..."}` // Supabase
                : "Live updates via polling"}
            </p>
          </div>
          <div className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 sm:block">
            Live texting
          </div>
        </div>

        <div
          className="flex-1 space-y-4 overflow-y-auto px-5 py-4"
          ref={containerRef}
        >
          {nextCursor && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={fetchOlder}
                disabled={isPaginating}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPaginating ? "Loading..." : "Load older messages"}
              </button>
            </div>
          )}

          {isLoading && (
            <div className="flex h-full items-center justify-center text-sm text-slate-600">
              Loading messages...
            </div>
          )}

          {!isLoading && activeCourse && messages.length === 0 && (
            <div className="flex h-full items-center justify-center text-sm text-slate-600">
              No messages yet. Start the chat!
            </div>
          )}

          {!activeCourse && (
            <div className="flex h-full items-center justify-center text-sm text-slate-600">
              Choose a class chat to start texting.
            </div>
          )}

          {displayedMessages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
        </div>

        <div className="border-t border-slate-200 px-5 py-4">
          <label className="text-sm font-semibold text-slate-800">
            Message
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                activeCourse
                  ? `Text classmates in ${activeCourse.code}`
                  : "Pick a class to start texting"
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              disabled={!activeCourse || isSending}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!draft.trim() || !activeCourse || isSending}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSending ? "Sending..." : "Send"}
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Hit Enter or tap Send to add your message to the chat.
          </p>
          {error && (
            <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>
          )}
        </div>
      </section>
    </div>
  );
}
