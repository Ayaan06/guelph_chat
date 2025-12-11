"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChatMessage } from "./ChatMessage";
import { MESSAGE_PAGE_SIZE } from "@/lib/chatConfig";
import type { MessageDTO } from "@/types/chat";

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

export function AnonymousGlobalChat() {
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [alias, setAlias] = useState("Anonymous");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isPaginating, setIsPaginating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const prependingRef = useRef(false);
  const initializedRef = useRef(false);

  const displayed = useMemo(
    () =>
      messages.map((message) => ({
        ...message,
        isOwn: false,
      })),
    [messages],
  );

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });
  };

  const loadLatest = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/public-global-chat?limit=${MESSAGE_PAGE_SIZE}`,
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
      initializedRef.current = true;
      scrollToBottom("auto");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load global chat",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadOlder = async () => {
    if (!nextCursor || isPaginating) return;
    prependingRef.current = true;
    setIsPaginating(true);
    const container = containerRef.current;
    const previousHeight = container?.scrollHeight ?? 0;

    try {
      const response = await fetch(
        `/api/public-global-chat?cursor=${nextCursor}&limit=${MESSAGE_PAGE_SIZE}`,
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
      setError(
        err instanceof Error ? err.message : "Failed to load older messages",
      );
    } finally {
      setIsPaginating(false);
    }
  };

  useEffect(() => {
    // Assign a lightweight anonymous handle per visit.
    const saved =
      typeof window !== "undefined"
        ? sessionStorage.getItem("globalAnonName")
        : null;
    if (saved) {
      setAlias(saved);
    } else {
      const generated = `Anonymous${Math.floor(1000 + Math.random() * 9000)}`;
      setAlias(generated);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("globalAnonName", generated);
      }
    }
    loadLatest();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (prependingRef.current) {
      prependingRef.current = false;
      return;
    }
    scrollToBottom(initializedRef.current ? "smooth" : "auto");
    initializedRef.current = true;
  }, [messages.length, isLoading]);

  const handleSend = async () => {
    const trimmed = draft.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setError(null);
    try {
      const response = await fetch("/api/public-global-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: trimmed, alias }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Unable to send message");
      }

      const data = (await response.json()) as { message: MessageDTO };
      setDraft("");
      setMessages((prev) => mergeMessages(prev, [data.message]));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send anonymous message",
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/10 p-4 text-white shadow-xl shadow-indigo-900/30">
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-indigo-400/10" />
      <div className="relative flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-100">
              Global chat (anonymous)
            </p>
            <h3 className="text-lg font-semibold">Say hi before logging in</h3>
            <p className="text-xs text-indigo-50/80">
              You&apos;re chatting as <span className="font-semibold text-white">{alias}</span>.
              Messages are visible to everyone.
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-100">
            Open
          </span>
        </div>

        <div className="flex flex-col gap-2 rounded-2xl border border-white/15 bg-slate-950/40 p-3 shadow-inner backdrop-blur">
          <div className="h-72 space-y-4 overflow-y-auto pr-1" ref={containerRef}>
            {nextCursor && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={loadOlder}
                  disabled={isPaginating}
                  className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-100 transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPaginating ? "Loading..." : "Load older messages"}
                </button>
              </div>
            )}

            {isLoading && (
              <div className="flex flex-1 items-center justify-center">
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-indigo-50/80">
                  <div className="h-10 w-10 animate-pulse rounded-full bg-white/10" />
                  Loading global chat...
                </div>
              </div>
            )}

            {!isLoading && displayed.length === 0 && (
              <div className="flex flex-1 items-center justify-center">
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-indigo-50/80">
                  <div className="h-12 w-12 rounded-2xl bg-white/10" />
                  <p className="font-semibold text-white">
                    Be the first to drop a message.
                  </p>
                  <p className="text-xs text-indigo-100/80">
                    You will show up as Anonymous.
                  </p>
                </div>
              </div>
            )}

            {displayed.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
          </div>

          <div className="space-y-2">
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
              placeholder="Chat as Anonymous..."
              className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-indigo-100/70 focus:border-white/30"
              disabled={isSending}
            />
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-indigo-100/80">
              <span>Enter to send • Shift+Enter for newline</span>
              <button
                type="button"
                onClick={handleSend}
                disabled={!draft.trim() || isSending}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-900 shadow transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSending ? "Sending..." : "Send as Anonymous"}
              </button>
            </div>
            {error && (
              <p className="text-xs font-semibold text-rose-200">{error}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
