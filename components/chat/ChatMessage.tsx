import type { MessageDTO } from "@/types/chat";

type ChatMessageProps = {
  message: MessageDTO & { isOwn: boolean };
};

export function ChatMessage({ message }: ChatMessageProps) {
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

  return (
    <div className={`flex flex-col gap-1 ${alignment}`}>
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-slate-500">
        <span className="font-semibold text-slate-700">
          {message.senderName}
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5">
          {formattedDate}
        </span>
        <span>{formattedTime}</span>
      </div>
      <div
        className={`max-w-xl rounded-2xl px-4 py-3 leading-relaxed ${bubble}`}
      >
        <p className="text-sm">{message.content}</p>
      </div>
    </div>
  );
}
