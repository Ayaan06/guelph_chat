import type { MessageDTO } from "@/types/chat";

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

type ParsedMessageContent =
  | {
      kind: "plain";
      text: string;
      attachments?: AttachmentPreview[];
      mood?: MoodTag | null;
    }
  | { kind: "poll"; poll: PollPayload; mood?: MoodTag | null }
  | { kind: "poll-vote"; vote: PollVotePayload };

type PollTally = {
  poll: PollPayload;
  counts: number[];
  total: number;
  voteMap?: Map<string, number>;
};

type ChatMessageProps = {
  message: MessageDTO & { isOwn: boolean };
  parsed?: ParsedMessageContent;
  pollTally?: PollTally;
  currentUserId?: string;
  onVote?: (pollId: string, optionIndex: number) => void;
  onShowProfile?: (userId: string, senderName: string) => void;
};

const RICH_PREFIX = "::rich::";

function sanitizeAttachments(
  attachments: AttachmentPreview[] | undefined,
): AttachmentPreview[] {
  if (!Array.isArray(attachments)) return [];
  const cleaned: AttachmentPreview[] = [];
  attachments.forEach((item, index) => {
    if (!item) return;
    const name = item.name || "Attachment";
    cleaned.push({
      id: item.id || name || `attachment-${index}`,
      name,
      type: item.type || "file/unknown",
      size: typeof item.size === "number" ? item.size : 0,
      dataUrl: item.dataUrl,
      href: item.href,
      error: item.error,
    });
  });
  return cleaned;
}

function parseContent(
  content: string,
  fallbackId: string,
): ParsedMessageContent {
  if (!content.startsWith(RICH_PREFIX)) {
    return { kind: "plain", text: content };
  }

  try {
    const data = JSON.parse(content.slice(RICH_PREFIX.length)) as
      | {
          kind?: string;
          text?: string;
          attachments?: AttachmentPreview[];
          poll?: PollPayload;
          vote?: PollVotePayload;
          mood?: MoodTag | null;
        }
      | undefined;

    if (!data) return { kind: "plain", text: content };

    if ((data.kind === "poll" || data.poll) && data.poll) {
      const poll: PollPayload = {
        id: data.poll.id || fallbackId,
        question: data.poll.question || "Untitled poll",
        options: data.poll.options?.length ? data.poll.options : ["Yes", "No"],
      };
      return { kind: "poll", poll, mood: data.mood ?? null };
    }

    if ((data.kind === "poll-vote" || data.vote) && data.vote) {
      return { kind: "poll-vote", vote: data.vote };
    }

    return {
      kind: "plain",
      text: data.text ?? "",
      attachments: sanitizeAttachments(data.attachments),
      mood: data.mood ?? null,
    };
  } catch (err) {
    console.error("Could not parse message content", err);
    return { kind: "plain", text: content };
  }
}

function formatMoodLabel(mood?: MoodTag | null) {
  if (!mood) return null;
  const labels: Record<MoodTag, string> = {
    celebrate: "Celebrate",
    question: "Question",
    "heads-up": "Heads-up",
    info: "Info",
  };
  return labels[mood];
}

function formatText(text: string) {
  return text.trim() ? text : "Shared an update";
}

export function ChatMessage({
  message,
  parsed,
  pollTally,
  currentUserId,
  onVote,
  onShowProfile,
}: ChatMessageProps) {
  const parsedContent = parsed ?? parseContent(message.content, message.id);
  const alignment = message.isOwn ? "items-end" : "items-start";
  const bubble = message.isOwn
    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg"
    : "bg-white text-slate-900 shadow-sm border border-slate-200";
  const timestamp = new Date(message.createdAt);
  const formattedTime = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
  const formattedDate = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(timestamp);

  const sender = onShowProfile ? (
    <button
      type="button"
      onClick={() => onShowProfile(message.senderId, message.senderName)}
      className="font-semibold text-slate-700 underline-offset-4 hover:text-blue-700 hover:underline"
    >
      {message.senderName}
    </button>
  ) : (
    <span className="font-semibold text-slate-700">{message.senderName}</span>
  );

  const moodLabel =
    parsedContent.kind === "plain" || parsedContent.kind === "poll"
      ? formatMoodLabel(parsedContent.mood)
      : null;

  const voteChoice =
    pollTally?.voteMap instanceof Map && currentUserId
      ? pollTally.voteMap.get(currentUserId)
      : undefined;

  const renderAttachments = (attachments: AttachmentPreview[]) => {
    if (!attachments.length) return null;
    return (
      <div className="mt-2 space-y-2">
        {attachments.map((attachment) => (
      <div
        key={attachment.id}
        className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs text-inherit"
      >
            <span>{attachment.dataUrl && !attachment.error ? "🖼️" : "📎"}</span>
            <div className="flex-1">
              <p className="font-semibold">{attachment.name}</p>
              <p className="text-[11px] text-slate-600">
                {Math.max(1, Math.round(attachment.size / 1024))} KB
              </p>
              {attachment.error && (
                <p className="text-[11px] font-semibold text-rose-600">
                  {attachment.error}
                </p>
              )}
            </div>
            {attachment.dataUrl && !attachment.error && (
              <img
                src={attachment.dataUrl}
                alt={attachment.name}
                className="h-12 w-12 rounded-lg object-cover"
              />
            )}
            {attachment.dataUrl && !attachment.error && (
              <a
                href={attachment.dataUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-slate-200 bg-white p-1 text-[11px] font-semibold text-blue-700 underline-offset-4 hover:underline"
              >
                View
              </a>
            )}
            {attachment.href && (
              <a
                href={attachment.href}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-semibold text-blue-700 underline-offset-4 hover:underline"
              >
                Open
              </a>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderPoll = (poll: PollPayload) => {
    const totalVotes = pollTally?.total ?? 0;
    return (
      <div className="space-y-2">
        <p className="text-base font-semibold leading-tight">{poll.question}</p>
        <div className="space-y-2">
          {poll.options.map((option, index) => {
            const count = pollTally?.counts?.[index] ?? 0;
            const pct =
              totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            const isSelected = voteChoice === index;
            return (
              <button
                key={option + index}
                type="button"
                onClick={() => onVote?.(poll.id || message.id, index)}
                disabled={!onVote}
                className={`group flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm transition ${
                  isSelected
                    ? "border-white bg-white/10 text-white"
                    : "border-slate-200 bg-white/80 text-slate-900 hover:border-blue-200 hover:bg-blue-50"
                } disabled:cursor-not-allowed`}
              >
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
                    {pct}%
                  </span>
                  <span className="font-semibold">{option}</span>
                </div>
                <span className="text-xs text-slate-600">
                  {count} vote{count === 1 ? "" : "s"}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
          {totalVotes} vote{totalVotes === 1 ? "" : "s"} recorded
        </p>
      </div>
    );
  };

  const renderPollVote = (vote: PollVotePayload) => {
    const choiceLabel =
      pollTally?.poll.options?.[vote.optionIndex] ?? "an option";
    return (
      <p className="text-sm">
        Voted for <span className="font-semibold">{choiceLabel}</span> in{" "}
        <span className="font-semibold">poll</span>
      </p>
    );
  };

  const renderBody = () => {
    if (parsedContent.kind === "poll") {
      return renderPoll(parsedContent.poll);
    }
    if (parsedContent.kind === "poll-vote") {
      return renderPollVote(parsedContent.vote);
    }
    return (
      <>
        <p className="text-sm whitespace-pre-wrap break-words">
          {formatText(parsedContent.text)}
        </p>
        {parsedContent.attachments &&
          renderAttachments(parsedContent.attachments)}
      </>
    );
  };

  return (
    <div className={`flex flex-col gap-1 ${alignment}`}>
      <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-slate-500">
        {sender}
        <span className="rounded-full bg-slate-100 px-2 py-0.5">
          {formattedDate}
        </span>
        <span>{formattedTime}</span>
        {moodLabel && (
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
            {moodLabel}
          </span>
        )}
      </div>
      <div
        className={`max-w-xl rounded-2xl px-4 py-3 leading-relaxed ${bubble}`}
      >
        {renderBody()}
      </div>
    </div>
  );
}
