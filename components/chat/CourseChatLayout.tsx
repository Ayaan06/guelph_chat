"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatMessage } from "./ChatMessage";
import { MESSAGE_PAGE_SIZE } from "@/lib/chatConfig";
import { hasRealtimeEnv, supabaseClient } from "@/lib/supabaseClient";
import type { ClassmateSummary, CourseSummary, MessageDTO } from "@/types/chat";

type CourseChatLayoutProps = {
  course: CourseSummary;
  majorName?: string;
  initialMessages?: MessageDTO[];
  initialCursor?: string | null;
  classmates: ClassmateSummary[];
  joinedCourses: CourseSummary[];
  termLabel: string;
  userId: string;
};

function sortMessages(messages: MessageDTO[]) {
  return [...messages].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

function mergeMessages(current: MessageDTO[], incoming: MessageDTO[]) {
  const all = new Map<string, MessageDTO>();
  current.forEach((message) => all.set(message.id, message));
  incoming.forEach((message) => all.set(message.id, message));
  return sortMessages(Array.from(all.values()));
}

export function CourseChatLayout({
  course,
  majorName,
  initialMessages = [],
  initialCursor = null,
  classmates,
  joinedCourses,
  termLabel,
  userId,
}: CourseChatLayoutProps) {
  const [messages, setMessages] = useState<MessageDTO[]>(() =>
    sortMessages(initialMessages),
  );
  const [nextCursor, setNextCursor] = useState<string | null>(initialCursor);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(initialMessages.length === 0);
  const [isPaginating, setIsPaginating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);
  const messageContainerRef = useRef<HTMLDivElement | null>(null);
  const prependingRef = useRef(false);
  const messagesInitializedRef = useRef(initialMessages.length > 0);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const displayedMessages = useMemo(
    () =>
      messages.map((message) => ({
        ...message,
        isOwn: message.senderId === userId,
      })),
    [messages, userId],
  );

  const sidebarCourses = useMemo(
    () =>
      joinedCourses.map((joined) => ({
        ...joined,
        isActive: joined.id === course.id,
      })),
    [course.id, joinedCourses],
  );

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const container = messageContainerRef.current;
    if (!container) return;
    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });
  };

  useEffect(() => {
    // Reset when course changes
    setMessages(sortMessages(initialMessages));
    setNextCursor(initialCursor);
    setError(null);
    setDraft("");
    setIsLoading(initialMessages.length === 0);
    messagesInitializedRef.current = initialMessages.length > 0;
  }, [course.id, initialCursor, initialMessages]);

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

  const fetchLatest = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/messages?courseId=${course.id}&limit=${MESSAGE_PAGE_SIZE}`,
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
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      setIsLoading(false);
    }
  }, [course.id]);

  const fetchOlder = async () => {
    if (!nextCursor || isPaginating) return;
    prependingRef.current = true;
    setIsPaginating(true);
    const container = messageContainerRef.current;
    const previousHeight = container?.scrollHeight ?? 0;

    try {
      const response = await fetch(
        `/api/messages?courseId=${course.id}&cursor=${nextCursor}&limit=${MESSAGE_PAGE_SIZE}`,
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
    try {
      const response = await fetch(
        `/api/messages?courseId=${course.id}&limit=${MESSAGE_PAGE_SIZE}`,
      );
      if (!response.ok) return;
      const data = (await response.json()) as { messages: MessageDTO[] };
      setMessages((prev) => mergeMessages(prev, data.messages ?? []));
    } catch (err) {
      console.error("Polling latest messages failed", err);
    }
  }, [course.id]);

  useEffect(() => {
    if (messagesInitializedRef.current) {
      return;
    }
    fetchLatest();
  }, [course.id, fetchLatest]);

  useEffect(() => {
    if (!hasRealtimeEnv || !supabaseClient) {
      return;
    }

    const channel = supabaseClient
      .channel(`messages-course-${course.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `courseId=eq.${course.id}`,
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
            if (prev.some((item) => item.id === message.id)) {
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
      supabaseClient?.removeChannel(channel);
      setIsRealtimeActive(false);
    };
  }, [course.id]);

  useEffect(() => {
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
  }, [course.id, refreshLatest]);

  const handleSend = async () => {
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
          courseId: course.id,
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
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[240px,1fr,280px]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                Your classes
              </p>
              <p className="text-sm font-semibold text-slate-900">
                Stay in sync
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">
              {sidebarCourses.length}
            </span>
          </div>
          <div className="space-y-2">
            {sidebarCourses.map((joined) => {
              const active = joined.isActive;
              return (
                <Link
                  key={joined.id}
                  href={`/classes/${encodeURIComponent(joined.id)}`}
                  className={`block rounded-xl border px-3 py-2 transition ${
                    active
                      ? "border-blue-200 bg-blue-50 text-blue-800"
                      : "border-slate-200 bg-white text-slate-800 hover:border-blue-200 hover:bg-slate-50"
                  }`}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {joined.code}
                  </p>
                  <p className="text-sm font-semibold">{joined.name}</p>
                  <p className="text-xs text-slate-500">{joined.major}</p>
                </Link>
              );
            })}
            {sidebarCourses.length === 0 && (
              <p className="text-sm text-slate-600">
                Join classes to see them here.
              </p>
            )}
          </div>
        </aside>

        <section className="flex min-h-[540px] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
                Class chat
              </p>
              <h1 className="text-2xl font-semibold text-slate-900">
                {course.code} - {course.name}
              </h1>
              <p className="text-sm text-slate-600">
                {majorName ?? course.major} | Level {course.level} | {termLabel}
              </p>
              <p className="text-xs text-slate-500">
                {hasRealtimeEnv
                  ? `Realtime ${isRealtimeActive ? "connected" : "connecting..."}` // uses Supabase if present
                  : "Live updates via quick refresh"}
              </p>
            </div>
            <div className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 sm:block">
              Live messaging
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/60 px-5 py-4" ref={messageContainerRef}>
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

            {isLoading && messages.length === 0 && (
              <div className="flex items-center justify-center text-sm text-slate-600">
                Loading messages...
              </div>
            )}

            {!isLoading && messages.length === 0 && (
              <div className="flex items-center justify-center text-sm text-slate-600">
                No messages yet. Be the first to say hello!
              </div>
            )}

            {displayedMessages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
          </div>

          <div className="border-t border-slate-200 px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-semibold text-slate-800">
                  Message
                </label>
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={`Message classmates in ${course.code}`}
                  className="h-24 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                  disabled={isSending}
                />
              </div>
              <div className="flex items-center gap-2 self-start pt-7">
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!draft.trim() || isSending}
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSending ? "Sending..." : "Send"}
                </button>
              </div>
            </div>
            {error && (
              <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>
            )}
          </div>
        </section>

        <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Class info</h3>
            <dl className="mt-3 space-y-2 text-sm text-slate-700">
              <div className="flex items-center justify-between">
                <dt className="text-slate-600">Course</dt>
                <dd className="font-semibold text-slate-900">{course.code}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-600">Name</dt>
                <dd className="max-w-[160px] text-right font-semibold text-slate-900">
                  {course.name}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-600">Major</dt>
                <dd className="font-semibold text-slate-900">
                  {majorName ?? course.major}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-600">Level</dt>
                <dd className="font-semibold text-slate-900">{course.level}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-600">Term</dt>
                <dd className="font-semibold text-slate-900">{termLabel}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">
              Classmates
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-800">
              {classmates.map((classmate) => (
                <li
                  key={classmate.id}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                    <div>
                      <p className="font-semibold text-slate-900">
                        {classmate.name ?? "Classmate"}
                      </p>
                      <p className="text-xs text-slate-600">Active</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700">
                    Online
                  </span>
                </li>
              ))}
              {classmates.length === 0 && (
                <li className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  No classmates listed yet.
                </li>
              )}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
