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
  const [courseFilter, setCourseFilter] = useState("");
  const [hoveredCourseId, setHoveredCourseId] = useState<string | null>(null);

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

  const filteredSidebarCourses = useMemo(() => {
    const query = courseFilter.trim().toLowerCase();
    if (!query) return sidebarCourses;
    return sidebarCourses.filter(
      (item) =>
        item.code.toLowerCase().includes(query) ||
        item.name.toLowerCase().includes(query) ||
        item.major.toLowerCase().includes(query),
    );
  }, [courseFilter, sidebarCourses]);

  const enrollmentCount = course.memberCount ?? classmates.length + 1;

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
      <div className="grid gap-5 xl:grid-cols-[280px,1fr,320px]">
        <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-600">
                Your classes
              </p>
              <p className="text-sm font-semibold text-slate-900">
                Stay in sync
              </p>
              <p className="text-xs text-slate-600">
                Hover for details, click to switch instantly.
              </p>
            </div>
            <Link
              href="/classes"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-800 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              + Join
            </Link>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
            <span className="text-xs font-semibold text-slate-600">Search</span>
            <input
              value={courseFilter}
              onChange={(event) => setCourseFilter(event.target.value)}
              placeholder="Code, name, or major"
              className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />
          </div>
          <div className="mt-3 space-y-2">
            {filteredSidebarCourses.length === 0 && (
              <p className="text-sm text-slate-600">
                No classes match. Try another keyword.
              </p>
            )}
            {filteredSidebarCourses.map((joined) => {
              const active = joined.isActive;
              const isGlobal =
                joined.id === "global-chat" ||
                joined.code.toLowerCase() === "global";
              return (
                <Link
                  key={joined.id}
                  href={`/classes/${encodeURIComponent(joined.id)}`}
                  onMouseEnter={() => setHoveredCourseId(joined.id)}
                  onMouseLeave={() => setHoveredCourseId(null)}
                  className={`group relative block overflow-visible rounded-2xl border px-3 py-3 transition ${
                    active
                      ? "border-slate-900 bg-slate-900 text-white shadow-md"
                      : "border-slate-200 bg-white text-slate-800 hover:border-blue-200 hover:bg-blue-50"
                  } ${isGlobal ? "ring-1 ring-blue-100" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p
                        className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${
                          active ? "text-slate-200" : "text-slate-500"
                        }`}
                      >
                        {isGlobal ? "Global chat" : joined.code}
                      </p>
                      <p className="text-sm font-semibold">{joined.name}</p>
                      <p
                        className={`text-xs ${
                          active ? "text-slate-300" : "text-slate-500"
                        }`}
                      >
                        {joined.major} • Level {joined.level}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!active && (
                        <span
                          className="h-2.5 w-2.5 rounded-full bg-emerald-500"
                          title="Unread indicator"
                          aria-hidden
                        />
                      )}
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                          active
                            ? "bg-white/10 text-white"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {joined.memberCount ?? 0} in room
                      </span>
                    </div>
                  </div>
                  {hoveredCourseId === joined.id && (
                    <div className="pointer-events-none absolute inset-x-0 translate-y-2 rounded-2xl border border-slate-200 bg-white p-3 text-xs shadow-lg">
                      <p className="font-semibold text-slate-900">
                        {joined.code} — {joined.name}
                      </p>
                      <p className="mt-1 text-slate-600">
                        {joined.major} · Level {joined.level}
                      </p>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </aside>

        <section className="relative flex min-h-[580px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-600">
                Class chat
              </p>
              <h1 className="text-2xl font-semibold text-slate-900">
                {course.code} — {course.name}
              </h1>
              <p className="text-sm text-slate-600">
                {majorName ?? course.major} · Level {course.level} · {termLabel}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-800">
                {enrollmentCount} enrolled
              </span>
              <span
                className={`rounded-full px-3 py-1 ${
                  isRealtimeActive
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                    : "bg-amber-50 text-amber-700 ring-1 ring-amber-100"
                }`}
              >
                {hasRealtimeEnv
                  ? isRealtimeActive
                    ? "Realtime connected"
                    : "Connecting…"
                  : "Live via quick refresh"}
              </span>
            </div>
          </div>

          <div className="relative flex-1 overflow-hidden theme-panel-gradient">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 20%, color-mix(in srgb, var(--accent) 10%, transparent) 0%, transparent 25%), radial-gradient(circle at 80% 0%, color-mix(in srgb, var(--accent-strong) 10%, transparent) 0%, transparent 20%), radial-gradient(circle at 50% 80%, color-mix(in srgb, #10b981 10%, transparent) 0%, transparent 22%)",
              }}
            />
            <div
              className="relative flex h-full flex-col space-y-4 overflow-y-auto px-6 py-5"
              ref={messageContainerRef}
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

              {isLoading && messages.length === 0 && (
                <div className="flex flex-1 items-center justify-center">
                  <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-6 py-5 text-sm text-slate-600 shadow-sm">
                    <div className="h-10 w-10 animate-pulse rounded-full bg-slate-100" />
                    Loading messages...
                  </div>
                </div>
              )}

              {!isLoading && messages.length === 0 && (
                <div className="flex flex-1 items-center justify-center">
                  <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-6 py-5 text-sm text-slate-600 shadow-sm">
                    <div className="h-12 w-12 rounded-2xl bg-slate-100" />
                    <p className="font-semibold text-slate-900">
                      No messages yet.
                    </p>
                    <p className="text-xs text-slate-500">
                      Start the chat — classmates will see it instantly.
                    </p>
                  </div>
                </div>
              )}

              {displayedMessages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
            </div>
          </div>

          <div className="border-t border-slate-200 bg-white px-6 py-4">
            <div className="flex items-center justify-between text-sm font-semibold text-slate-800">
              <span>Message</span>
              <span className="text-xs text-slate-500">
                Enter to send · Shift+Enter for newline
              </span>
            </div>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-inner">
                  <button
                    type="button"
                    className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm transition hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed"
                    aria-label="Attach (coming soon)"
                    disabled
                  >
                    📎
                  </button>
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        handleSend();
                      }
                    }}
                    rows={3}
                    placeholder={`Message classmates in ${course.code}`}
                    className="h-24 w-full resize-none bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:text-slate-400"
                    disabled={isSending}
                  />
                </div>
                {error && (
                  <p className="text-xs font-semibold text-rose-600">{error}</p>
                )}
              </div>
              <div className="flex items-center gap-2 self-start">
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!draft.trim() || isSending}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isSending ? "Sending..." : "Send message"}
                </button>
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Class snapshot
            </h3>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-700">
              <div className="space-y-1 rounded-xl bg-white px-3 py-2 shadow-sm">
                <dt className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
                  Course
                </dt>
                <dd className="font-semibold text-slate-900">{course.code}</dd>
              </div>
              <div className="space-y-1 rounded-xl bg-white px-3 py-2 shadow-sm">
                <dt className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
                  Level
                </dt>
                <dd className="font-semibold text-slate-900">{course.level}</dd>
              </div>
              <div className="space-y-1 rounded-xl bg-white px-3 py-2 shadow-sm">
                <dt className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
                  Major
                </dt>
                <dd className="font-semibold text-slate-900">
                  {majorName ?? course.major}
                </dd>
              </div>
              <div className="space-y-1 rounded-xl bg-white px-3 py-2 shadow-sm">
                <dt className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
                  Term
                </dt>
                <dd className="font-semibold text-slate-900">{termLabel}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Classmates
              </h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">
                {classmates.length} listed
              </span>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-slate-800">
              {classmates.map((classmate) => (
                <li
                  key={classmate.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full bg-emerald-500"
                      aria-hidden
                    />
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
                <li className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-600 shadow-sm">
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
