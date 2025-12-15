"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { ChatMessage } from "./ChatMessage";
import { MESSAGE_PAGE_SIZE } from "@/lib/chatConfig";
import { hasRealtimeEnv, supabaseClient } from "@/lib/supabaseClient";
import type { CourseSummary, MessageDTO } from "@/types/chat";

type ChatExperienceProps = {
  courses: CourseSummary[];
  userId: string;
  initialCourseId?: string;
};

type MoodTag = "celebrate" | "question" | "heads-up" | "info";

type AttachmentPreview = {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl?: string;
  href?: string;
  error?: string;
};

type PollPayload = {
  id: string;
  question: string;
  options: string[];
};

type PollVotePayload = {
  pollId: string;
  optionIndex: number;
};

type RichMessagePayload = {
  kind?: "rich-text" | "poll" | "poll-vote";
  text?: string;
  attachments?: AttachmentPreview[];
  mood?: MoodTag | null;
  poll?: PollPayload;
  vote?: PollVotePayload;
};

type ParsedMessageContent =
  | {
      kind: "plain";
      text: string;
      attachments?: AttachmentPreview[];
      mood?: MoodTag | null;
    }
  | { kind: "poll"; poll: PollPayload; mood?: MoodTag | null }
  | { kind: "poll-vote"; vote: PollVotePayload };

type DecoratedMessage = {
  base: MessageDTO & { isOwn: boolean };
  parsed: ParsedMessageContent;
};

type PollTally = {
  poll: PollPayload;
  counts: number[];
  total: number;
  voteMap: Map<string, number>;
};

type BackgroundPreset = {
  id: string;
  name: string;
  overlay: string;
  accent: string;
  animate?: boolean;
};

const RICH_PREFIX = "::rich::";
const MAX_ATTACHMENT_SIZE = 200 * 1024;
const backgroundPresets: BackgroundPreset[] = [
  {
    id: "default",
    name: "Soft glow",
    overlay:
      "radial-gradient(circle at 20% 20%, color-mix(in srgb, var(--accent) 10%, transparent) 0%, transparent 25%), radial-gradient(circle at 80% 0%, color-mix(in srgb, var(--accent-strong) 10%, transparent) 0%, transparent 20%), radial-gradient(circle at 50% 80%, color-mix(in srgb, #10b981 10%, transparent) 0%, transparent 22%)",
    accent: "#2563eb",
  },
  {
    id: "sunrise",
    name: "Sunrise",
    overlay:
      "radial-gradient(circle at 30% 20%, rgba(249, 115, 22, 0.3), transparent 35%), radial-gradient(circle at 80% 10%, rgba(94, 234, 212, 0.3), transparent 40%), radial-gradient(circle at 60% 80%, rgba(37, 99, 235, 0.25), transparent 32%)",
    accent: "#f97316",
    animate: true,
  },
  {
    id: "midnight",
    name: "Midnight",
    overlay:
      "radial-gradient(circle at 20% 20%, rgba(79, 70, 229, 0.3), transparent 30%), radial-gradient(circle at 80% 20%, rgba(14, 165, 233, 0.22), transparent 40%), radial-gradient(circle at 50% 85%, rgba(16, 185, 129, 0.2), transparent 30%)",
    accent: "#0f172a",
    animate: true,
  },
  {
    id: "studio",
    name: "Studio grid",
    overlay:
      "linear-gradient(135deg, rgba(15, 23, 42, 0.18) 0%, rgba(59, 130, 246, 0.16) 50%, rgba(236, 72, 153, 0.14) 100%), repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.06) 0, rgba(255, 255, 255, 0.06) 1px, transparent 1px, transparent 32px), repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.06) 0, rgba(255, 255, 255, 0.06) 1px, transparent 1px, transparent 32px)",
    accent: "#ec4899",
  },
];

const emojiPalette = [
  "😀",
  "😎",
  "🤓",
  "🔥",
  "🎉",
  "🙏",
  "❤️",
  "👍",
  "👀",
  "✨",
  "🚀",
  "🤔",
  "🙌",
  "📎",
  "🏆",
  "🎯",
  "🧠",
  "📚",
];

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

function safeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `chat-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
}

function sanitizeAttachments(
  attachments: AttachmentPreview[] | undefined,
): AttachmentPreview[] {
  if (!Array.isArray(attachments)) return [];
  const cleaned: AttachmentPreview[] = [];
  attachments.forEach((item, index) => {
    if (!item) return;
    const id = item.id || `attachment-${index}`;
    const name = item.name || "Attachment";
    const type = item.type || "file/unknown";
    const size = typeof item.size === "number" ? item.size : 0;
    cleaned.push({
      id,
      name,
      type,
      size,
      dataUrl: item.dataUrl,
      href: item.href,
    });
  });
  return cleaned;
}

function parseRichContent(
  content: string,
  fallbackId: string,
): ParsedMessageContent {
  if (!content.startsWith(RICH_PREFIX)) {
    return { kind: "plain", text: content };
  }

  try {
    const parsed = JSON.parse(content.slice(RICH_PREFIX.length)) as
      | RichMessagePayload
      | undefined;

    if (!parsed) {
      return { kind: "plain", text: content };
    }

    if ((parsed.kind === "poll" || parsed.poll) && parsed.poll) {
      const poll: PollPayload = {
        id: parsed.poll.id || fallbackId,
        question: parsed.poll.question || "Untitled poll",
        options:
          parsed.poll.options?.filter((option) => option?.trim()) ??
          ["Yes", "No"],
      };

      if (poll.options.length < 2) {
        poll.options = [...poll.options, "Yes", "No"].slice(0, 2);
      }

      return { kind: "poll", poll, mood: parsed.mood ?? null };
    }

    if ((parsed.kind === "poll-vote" || parsed.vote) && parsed.vote) {
      return {
        kind: "poll-vote",
        vote: {
          pollId: parsed.vote.pollId,
          optionIndex: parsed.vote.optionIndex,
        },
      };
    }

    const attachments = sanitizeAttachments(parsed.attachments);
    return {
      kind: "plain",
      text: parsed.text ?? "",
      attachments,
      mood: parsed.mood ?? null,
    };
  } catch (err) {
    console.error("Failed to parse rich message", err);
    return { kind: "plain", text: content };
  }
}

function buildPollTallies(
  messages: DecoratedMessage[],
): Record<string, PollTally> {
  const polls = new Map<string, PollPayload>();
  const voteMap = new Map<string, Map<string, number>>();

  messages.forEach(({ base, parsed }) => {
    if (parsed.kind === "poll") {
      const pollId = parsed.poll.id || base.id;
      polls.set(pollId, { ...parsed.poll, id: pollId });
    }
  });

  messages.forEach(({ base, parsed }) => {
    if (parsed.kind !== "poll-vote") return;
    const pollId = parsed.vote.pollId;
    if (!polls.has(pollId)) return;
    if (typeof parsed.vote.optionIndex !== "number") return;

    const existing = voteMap.get(pollId) ?? new Map<string, number>();
    existing.set(base.senderId, parsed.vote.optionIndex);
    voteMap.set(pollId, existing);
  });

  const result: Record<string, PollTally> = {};

  polls.forEach((poll, pollId) => {
    const voterMap = voteMap.get(pollId) ?? new Map<string, number>();
    const counts = poll.options.map(() => 0);
    voterMap.forEach((optionIndex) => {
      if (optionIndex >= 0 && optionIndex < counts.length) {
        counts[optionIndex] += 1;
      }
    });
    result[pollId] = {
      poll,
      counts,
      total: counts.reduce((sum, count) => sum + count, 0),
      voteMap: voterMap,
    };
  });

  return result;
}

export function ChatExperience({
  courses,
  userId,
  initialCourseId,
}: ChatExperienceProps) {
  const [selectedCourseId, setSelectedCourseId] = useState(() => {
    if (
      initialCourseId &&
      courses.some((course) => course.id === initialCourseId)
    ) {
      return initialCourseId;
    }
    return courses[0]?.id ?? "";
  });
  const [activeCourse, setActiveCourse] = useState<CourseSummary | null>(() => {
    const initialId =
      initialCourseId && courses.some((c) => c.id === initialCourseId)
        ? initialCourseId
        : courses[0]?.id ?? null;
    return initialId
      ? courses.find((course) => course.id === initialId) ?? null
      : null;
  });
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPaginating, setIsPaginating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);
  const [courseFilter, setCourseFilter] = useState("");
  const [hoveredCourseId, setHoveredCourseId] = useState<string | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<
    AttachmentPreview[]
  >([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [composerMood, setComposerMood] = useState<MoodTag | null>(null);
  const [backgroundChoice, setBackgroundChoice] = useState<string>("default");
  const [showPollBuilder, setShowPollBuilder] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["Yes", "No"]);
  const [voteSending, setVoteSending] = useState<string | null>(null);
  const [hasAppliedInitial, setHasAppliedInitial] = useState(false);
  const [profileModal, setProfileModal] = useState<{
    userId: string;
    senderName: string;
    loading: boolean;
    error: string | null;
    profile:
      | {
          name: string;
          email?: string;
          majorId?: string;
          majorName?: string;
          year?: string;
          interests?: string[];
          courses?: Array<{
            id: string;
            code: string;
            name: string;
          }>;
        }
      | null;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const prependingRef = useRef(false);
  const messagesInitializedRef = useRef(false);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const displayedMessages = useMemo(
    () =>
      messages.map((message) => ({
        ...message,
        isOwn: message.senderId === userId,
      })),
    [messages, userId],
  );

  const decoratedMessages = useMemo<DecoratedMessage[]>(
    () =>
      displayedMessages.map((message) => ({
        base: message,
        parsed: parseRichContent(message.content, message.id),
      })),
    [displayedMessages],
  );

  const pollTallies = useMemo(
    () => buildPollTallies(decoratedMessages),
    [decoratedMessages],
  );

  const canSendMessage = useMemo(() => {
    const cleaned = pendingAttachments.filter((item) => !item.error);
    return (
      Boolean(activeCourse) &&
      !isSending &&
      (draft.trim().length > 0 || cleaned.length > 0)
    );
  }, [activeCourse, draft, isSending, pendingAttachments]);

  const hasValidPoll = useMemo(
    () =>
      pollQuestion.trim().length > 0 &&
      pollOptions.map((option) => option.trim()).filter(Boolean).length >= 2,
    [pollOptions, pollQuestion],
  );

  const filteredCourses = useMemo(() => {
    const query = courseFilter.trim().toLowerCase();
    if (!query) return courses;
    return courses.filter(
      (course) =>
        course.code.toLowerCase().includes(query) ||
        course.name.toLowerCase().includes(query) ||
        course.major.toLowerCase().includes(query),
    );
  }, [courseFilter, courses]);

  const globalCourseId =
    courses.find(
      (course) =>
        course.id === "global-chat" || course.code.toLowerCase() === "global",
    )?.id ?? "";

  const activeBackground =
    backgroundPresets.find((preset) => preset.id === backgroundChoice) ??
    backgroundPresets[0];

  useEffect(() => {
    const matchesInitial =
      initialCourseId &&
      courses.some((course) => course.id === initialCourseId);
    const hasSelected = courses.some(
      (course) => course.id === selectedCourseId,
    );

    if (matchesInitial && !hasAppliedInitial) {
      if (selectedCourseId !== initialCourseId) {
        setSelectedCourseId(initialCourseId);
      }
      setHasAppliedInitial(true);
      return;
    }

    if (!hasSelected) {
      const fallbackId = courses[0]?.id ?? "";
      if (fallbackId !== selectedCourseId) {
        setSelectedCourseId(fallbackId);
      }
    }

    if (courses.length === 0 && selectedCourseId !== "") {
      setSelectedCourseId("");
    }
  }, [courses, hasAppliedInitial, initialCourseId, selectedCourseId]);

  useEffect(() => {
    const nextCourse = selectedCourseId
      ? courses.find((course) => course.id === selectedCourseId) ?? null
      : null;
    setActiveCourse(nextCourse);
  }, [courses, selectedCourseId]);

  useEffect(() => {
    if (!activeCourse?.id) return;
    const stored = localStorage.getItem(`chat-bg-${activeCourse.id}`);
    setBackgroundChoice(stored || "default");
  }, [activeCourse?.id]);

  useEffect(() => {
    if (!activeCourse?.id) return;
    localStorage.setItem(`chat-bg-${activeCourse.id}`, backgroundChoice);
  }, [activeCourse?.id, backgroundChoice]);

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
    setDraft("");
    setPendingAttachments([]);
    setShowEmojiPicker(false);
    setComposerMood(null);
    setAttachmentError(null);
    setShowPollBuilder(false);
    setPollQuestion("");
    setPollOptions(["Yes", "No"]);
  }, [activeCourse?.id]);

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
              incoming.createdAt ?? new Date().toISOString(),
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
      supabaseClient?.removeChannel(channel);
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

  const handleFilesSelected = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    const accepted: AttachmentPreview[] = [];
    let foundError: string | null = null;

    for (const file of files.slice(0, 4)) {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        foundError =
          "Attachments are limited to 200KB to keep chat speedy and storage friendly.";
        accepted.push({
          id: safeId(),
          name: file.name,
          type: file.type || "file/unknown",
          size: file.size,
          error: "Too large for inline send",
        });
        continue;
      }

      const dataUrl =
        file.type?.startsWith("image/") && typeof FileReader !== "undefined"
          ? await new Promise<string | undefined>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => resolve(undefined);
              reader.readAsDataURL(file);
            })
          : undefined;

      accepted.push({
        id: safeId(),
        name: file.name,
        type: file.type || "file/unknown",
        size: file.size,
        dataUrl,
      });
    }

    setPendingAttachments((prev) => [...prev, ...accepted]);
    setAttachmentError(foundError);
    event.target.value = "";
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    setPendingAttachments((prev) =>
      prev.filter((item) => item.id !== attachmentId),
    );
  };

  const handleInsertEmoji = (emoji: string) => {
    setDraft((prev) => `${prev}${emoji}`);
    setShowEmojiPicker(false);
  };

  const updatePollOption = (index: number, value: string) => {
    setPollOptions((prev) =>
      prev.map((option, idx) => (idx === index ? value : option)),
    );
  };

  const addPollOption = () => {
    setPollOptions((prev) => [...prev, ""]);
  };

  const removePollOption = (index: number) => {
    setPollOptions((prev) =>
      prev.length <= 2 ? prev : prev.filter((_, idx) => idx !== index),
    );
  };

  const handleSend = async () => {
    if (!activeCourse?.id) return;

    const trimmed = draft.trim();
    const cleanedAttachments = pendingAttachments.filter(
      (item) => !item.error,
    );
    const hasAttachments = cleanedAttachments.length > 0;

    if ((!trimmed && !hasAttachments) || isSending) return;

    setIsSending(true);
    setError(null);

    const contentToSend =
      hasAttachments || composerMood
        ? `${RICH_PREFIX}${JSON.stringify({
            kind: "rich-text",
            text: trimmed,
            attachments: cleanedAttachments,
            mood: composerMood,
          } satisfies RichMessagePayload)}`
        : trimmed;

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId: activeCourse.id,
          content: contentToSend,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Unable to send message");
      }

      const data = (await response.json()) as { message: MessageDTO };
      setDraft("");
      setPendingAttachments([]);
      setAttachmentError(null);
      setComposerMood(null);
      setShowEmojiPicker(false);

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

  const handleSendPoll = async () => {
    if (!activeCourse?.id) return;
    setError(null);
    const cleanedOptions = pollOptions
      .map((option) => option.trim())
      .filter(Boolean);

    if (!pollQuestion.trim() || cleanedOptions.length < 2 || isSending) {
      setError("Add a poll question and at least two choices.");
      return;
    }

    setIsSending(true);
    setError(null);

    const poll: PollPayload = {
      id: safeId(),
      question: pollQuestion.trim(),
      options: cleanedOptions.slice(0, 6),
    };

    const content = `${RICH_PREFIX}${JSON.stringify({
      kind: "poll",
      poll,
      mood: composerMood,
    } satisfies RichMessagePayload)}`;

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId: activeCourse.id,
          content,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Unable to send poll");
      }

      const data = (await response.json()) as { message: MessageDTO };
      setPollQuestion("");
      setPollOptions(["Yes", "No"]);
      setShowPollBuilder(false);
      setComposerMood(null);

      if (!hasRealtimeEnv || !supabaseClient) {
        setMessages((prev) => mergeMessages(prev, [data.message]));
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to send poll");
    } finally {
      setIsSending(false);
    }
  };

  const handlePollVote = async (pollId: string, optionIndex: number) => {
    if (!activeCourse?.id) return;
    const voteKey = `${pollId}-${optionIndex}`;
    if (voteSending === voteKey) return;

    setVoteSending(voteKey);
    try {
      const content = `${RICH_PREFIX}${JSON.stringify({
        kind: "poll-vote",
        vote: { pollId, optionIndex },
      } satisfies RichMessagePayload)}`;

      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId: activeCourse.id,
          content,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Unable to vote right now");
      }

      const data = (await response.json()) as { message: MessageDTO };
      if (!hasRealtimeEnv || !supabaseClient) {
        setMessages((prev) => mergeMessages(prev, [data.message]));
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to send vote");
    } finally {
      setVoteSending(null);
    }
  };

  const handleShowProfile = async (targetUserId: string, senderName: string) => {
    setProfileModal({
      userId: targetUserId,
      senderName,
      loading: true,
      error: null,
      profile: null,
    });

    try {
      const response = await fetch(`/api/profile/${encodeURIComponent(targetUserId)}`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Unable to load profile");
      }
      const data = (await response.json()) as {
        profile?: {
          name: string;
          email?: string;
          majorId?: string;
          majorName?: string;
          year?: string;
          interests?: string[];
          courses?: Array<{
            id: string;
            code: string;
            name: string;
          }>;
        };
      };

      setProfileModal((prev) =>
        prev
          ? {
              ...prev,
              loading: false,
              profile: data.profile ?? null,
            }
          : prev,
      );
    } catch (err) {
      setProfileModal((prev) =>
        prev
          ? {
              ...prev,
              loading: false,
              error: err instanceof Error ? err.message : "Failed to load profile",
            }
          : prev,
      );
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Class picker
              </p>
              <h3 className="text-base font-semibold text-slate-900">
                Switch rooms quickly
              </h3>
            </div>
            <Link
              href="/classes"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-800 transition hover:border-blue-200 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              + Join
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <input
              value={courseFilter}
              onChange={(event) => setCourseFilter(event.target.value)}
              placeholder="Search by name, code, or major"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 sm:w-56"
            />
            {activeCourse && (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {activeCourse.memberCount ?? 0} in room
              </span>
            )}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredCourses.length === 0 && (
              <p className="col-span-full text-sm text-slate-600">
                No classes match that search.
              </p>
            )}
            {filteredCourses.map((course) => {
              const isActive = course.id === selectedCourseId;
              const isGlobal = course.id === globalCourseId;
              return (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => setSelectedCourseId(course.id)}
                  className={`flex h-full flex-col justify-between rounded-xl border px-3 py-2 text-left text-sm transition ${
                    isActive
                      ? "border-blue-500 bg-blue-950 text-white ring-2 ring-blue-300"
                      : "border-slate-200 bg-slate-50 hover:border-blue-200 hover:bg-slate-100"
                  }`}
                >
                  <div className="space-y-0.5">
                    <p
                      className={`text-[11px] font-semibold uppercase tracking-[0.1em] ${
                        isActive ? "text-slate-200" : "text-slate-500"
                      }`}
                    >
                      {isGlobal ? "Global chat" : course.code}
                    </p>
                    <p className="font-semibold leading-snug">{course.name}</p>
                    <p
                      className={`text-xs ${
                        isActive ? "text-slate-300" : "text-slate-500"
                      }`}
                    >
                        {course.major} - Level {course.level}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] font-semibold">
                    <span
                      className={`rounded-full px-2 py-1 ${
                        isActive
                          ? "bg-white/10 text-white ring-1 ring-white/20"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {course.memberCount ?? 0} in room
                    </span>
                    {!isActive && (
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <section
          id="chat-window"
          className="relative flex min-h-[620px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-sm"
        >
          <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-600">
                Class chat
              </p>
              <h2 className="text-xl font-semibold text-slate-900">
                {activeCourse
                  ? `${activeCourse.code} - ${activeCourse.name}`
                  : "Select a class"}
              </h2>
              <p className="text-sm text-slate-600">
                Sticky course header, live status, and quick actions.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-800">
                {activeCourse?.memberCount ?? 0} classmates
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
                    : "Connecting..."
                  : "Live via polling"}
              </span>
            </div>
          </div>

          <div
            className="relative flex-1 overflow-hidden"
            style={{
              backgroundImage: activeBackground.overlay,
              backgroundSize: "140% 140%",
              backgroundRepeat: "no-repeat",
              animation: activeBackground.animate
                ? "chatGradientPan 26s ease-in-out infinite"
                : undefined,
            }}
          >
            <div className="pointer-events-none absolute inset-0 theme-panel-gradient" />
            <div className="pointer-events-none absolute inset-0 bg-white/65 backdrop-blur-sm dark:bg-slate-900/70" />
            <div
              className="relative flex h-full flex-col space-y-4 overflow-y-auto px-6 py-5"
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
                <div className="flex flex-1 items-center justify-center">
                  <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-6 py-5 text-sm text-slate-600 shadow-sm">
                    <div className="h-10 w-10 animate-pulse rounded-full bg-slate-100" />
                    Loading messages...
                  </div>
                </div>
              )}

              {!isLoading && activeCourse && messages.length === 0 && (
                <div className="flex flex-1 items-center justify-center">
                  <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-6 py-5 text-sm text-slate-600 shadow-sm">
                    <div className="h-12 w-12 rounded-2xl bg-slate-100" />
                    <p className="font-semibold text-slate-900">
                      No messages yet.
                    </p>
                    <p className="text-xs text-slate-500">
                      Start the chat - everyone will see it instantly.
                    </p>
                  </div>
                </div>
              )}

              {!activeCourse && (
                <div className="flex flex-1 items-center justify-center">
                  <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-6 py-5 text-sm text-slate-600 shadow-sm">
                    <div className="h-12 w-12 rounded-full bg-slate-100" />
                    Pick a class to unlock the chat window.
                  </div>
                </div>
              )}

              {decoratedMessages.map(({ base, parsed }) => {
                const pollTally =
                  parsed.kind === "poll"
                    ? pollTallies[parsed.poll.id] ??
                      pollTallies[base.id]
                    : parsed.kind === "poll-vote"
                      ? pollTallies[parsed.vote.pollId]
                      : undefined;

                return (
                  <ChatMessage
                    key={base.id}
                    message={base}
                    parsed={parsed}
                    pollTally={pollTally}
                    currentUserId={userId}
                    onVote={
                      parsed.kind === "poll" ? handlePollVote : undefined
                    }
                    onShowProfile={handleShowProfile}
                  />
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-200 bg-white px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-semibold text-slate-800">
              <span>Message</span>
              <span className="text-xs text-slate-500">
                Enter to send / Shift+Enter for newline
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Wallpaper
                </span>
                {backgroundPresets.map((preset) => {
                  const selected = backgroundChoice === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setBackgroundChoice(preset.id)}
                      className={`h-8 w-8 rounded-full border transition hover:-translate-y-0.5 ${
                        selected
                          ? "border-slate-900 ring-2 ring-slate-900/20 ring-offset-2"
                          : "border-slate-200"
                      }`}
                      style={{
                        backgroundImage: preset.overlay,
                        backgroundSize: "180% 180%",
                      }}
                      title={`Set ${preset.name} background`}
                    />
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPollBuilder((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
                >
                  🗳️ Polls
                </button>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
                >
                  😀 Emoji
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
                >
                  📎 Attach
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(["celebrate", "question", "heads-up"] as MoodTag[]).map(
                  (mood) => {
                    const labels: Record<MoodTag, string> = {
                      celebrate: "Celebrate",
                      question: "Question",
                      "heads-up": "Heads-up",
                      info: "Info",
                    };
                    return (
                      <button
                        key={mood}
                        type="button"
                        onClick={() =>
                          setComposerMood((prev) =>
                            prev === mood ? null : mood,
                          )
                        }
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                          composerMood === mood
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {labels[mood]}
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            {showEmojiPicker && (
              <div className="mt-3 grid grid-cols-9 gap-1 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                {emojiPalette.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleInsertEmoji(emoji)}
                    className="h-9 w-9 rounded-xl text-lg transition hover:-translate-y-0.5 hover:bg-slate-100"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {pendingAttachments.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {pendingAttachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-inner"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {attachment.dataUrl && !attachment.error
                          ? "🖼️"
                          : "📎"}
                      </span>
                      <div className="text-xs">
                        <p className="font-semibold text-slate-900">
                          {attachment.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {Math.max(1, Math.round(attachment.size / 1024))} KB
                        </p>
                        {attachment.error && (
                          <span className="text-[11px] font-semibold text-rose-600">
                            {attachment.error}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {attachment.dataUrl && !attachment.error && (
                        <img
                          src={attachment.dataUrl}
                          alt={attachment.name}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(attachment.id)}
                        className="text-[11px] font-semibold text-slate-600 underline-offset-4 hover:text-rose-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {attachmentError && (
              <p className="mt-2 text-xs font-semibold text-amber-700">
                {attachmentError}
              </p>
            )}

            {showPollBuilder && (
              <div className="mt-3 space-y-3 rounded-2xl border border-blue-200 bg-blue-50/80 p-3 shadow-inner">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
                    Poll builder
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowPollBuilder(false)}
                    className="text-xs font-semibold text-blue-700 underline-offset-4 hover:underline"
                  >
                    Close
                  </button>
                </div>
                <input
                  value={pollQuestion}
                  onChange={(event) => setPollQuestion(event.target.value)}
                  placeholder="Ask a question classmates can vote on"
                  className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-500"
                />
                <div className="space-y-2">
                  {pollOptions.map((option, index) => (
                    <div key={option + index} className="flex items-center gap-2">
                      <input
                        value={option}
                        onChange={(event) =>
                          updatePollOption(index, event.target.value)
                        }
                        placeholder={`Option ${index + 1}`}
                        className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-500"
                      />
                      {pollOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removePollOption(index)}
                          className="text-[11px] font-semibold text-rose-600 underline-offset-4 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addPollOption}
                    className="text-xs font-semibold text-blue-700 underline-offset-4 hover:underline"
                  >
                    + Add option
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSendPoll}
                    disabled={!hasValidPoll || !activeCourse || isSending}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:bg-blue-200"
                  >
                    {isSending ? "Sending..." : "Send poll"}
                  </button>
                  <p className="text-xs text-slate-600">
                    Classmates vote live; results update as votes arrive.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="flex w-full items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-inner">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm transition hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed"
                  aria-label="Add attachment"
                  disabled={!activeCourse || isSending}
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
                  placeholder={
                    activeCourse
                      ? `Text classmates in ${activeCourse.code} (emoji, attachments, polls supported)`
                      : "Pick a class to start texting"
                  }
                  className="h-24 w-full resize-none bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:text-slate-400"
                  disabled={!activeCourse || isSending}
                />
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!canSendMessage}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isSending ? "Sending..." : "Send message"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPollBuilder(true)}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
                >
                  Launch poll builder
                </button>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx"
              onChange={handleFilesSelected}
              className="hidden"
            />

            <p className="mt-2 text-xs text-slate-500">
              Messages deliver instantly (Supabase realtime when available).
              Rich messages support emoji, lightweight attachments, polls, and
              custom backgrounds per room.
            </p>
            {error && (
              <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>
            )}
          </div>
        </section>
      </div>

      {profileModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setProfileModal(null)}
              className="absolute right-3 top-3 text-slate-500 hover:text-slate-900"
              aria-label="Close profile"
            >
              X
            </button>
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-600">
                Classmate profile
              </p>
              <h3 className="text-xl font-semibold text-slate-900">
                {profileModal.profile?.name ?? profileModal.senderName}
              </h3>
              <p className="text-sm text-slate-600">
                {profileModal.loading
                  ? "Loading profile..."
                  : profileModal.profile?.email ?? "Email hidden"}
              </p>
            </div>

            {profileModal.error && (
              <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                {profileModal.error}
              </p>
            )}

            {!profileModal.error && (
              <dl className="mt-4 space-y-3 text-sm text-slate-700">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <dt className="text-slate-500">Major</dt>
                  <dd className="font-semibold text-slate-900">
                    {profileModal.profile?.majorName ??
                      profileModal.profile?.majorId ??
                      "Not set"}
                  </dd>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <dt className="text-slate-500">Year</dt>
                  <dd className="font-semibold text-slate-900">
                    {profileModal.profile?.year ?? "Not set"}
                  </dd>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2">
                  <dt className="text-slate-500">Interests</dt>
                  <dd className="mt-1 flex flex-wrap gap-2">
                    {profileModal.profile?.interests?.length ? (
                      profileModal.profile.interests.map((interest) => (
                        <span
                          key={interest}
                          className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-800 shadow-sm"
                        >
                          {interest}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500">No interests listed</span>
                    )}
                  </dd>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2">
                  <dt className="text-slate-500">Courses</dt>
                  <dd className="mt-2 flex flex-wrap gap-2">
                    {profileModal.profile?.courses?.length ? (
                      profileModal.profile.courses.map((course) => (
                        <span
                          key={course.id}
                          className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-800 shadow-sm"
                        >
                          <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white">
                            {course.code}
                          </span>
                          <span className="text-[11px]">{course.name}</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-500">
                        No courses shared yet
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setProfileModal(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
