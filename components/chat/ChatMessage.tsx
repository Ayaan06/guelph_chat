import type { MessageDTO } from "@/types/chat";

type ChatMessageProps = {
  message: MessageDTO & { isOwn: boolean };
};

export function ChatMessage({ message }: ChatMessageProps) {
  const alignment = message.isOwn ? "items-end" : "items-start";
  const bubble = message.isOwn
    ? "bg-blue-600 text-white rounded-2xl rounded-br-none"
    : "bg-slate-100 text-slate-900 rounded-2xl rounded-bl-none";
  const formattedTime = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(message.createdAt));

  return (
    <div className={`flex flex-col gap-1 ${alignment}`}>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className="font-semibold text-slate-700">
          {message.senderName}
        </span>
        <span>{formattedTime}</span>
      </div>
      <div className={`max-w-xl px-4 py-3 shadow-sm ${bubble}`}>
        <p className="text-sm leading-relaxed">{message.content}</p>
      </div>
    </div>
  );
}
