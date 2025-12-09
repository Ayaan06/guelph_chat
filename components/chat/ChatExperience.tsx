"use client";

import { useMemo, useState } from "react";
import { ChatMessage } from "./ChatMessage";
import type { ClassMessage, Course } from "@/lib/mockData";

type ChatExperienceProps = {
  courses: Course[];
  initialMessages: ClassMessage[];
  userName: string;
};

function buildInitialMessages(
  courses: Course[],
  initialMessages: ClassMessage[],
) {
  const seededMessages: Record<string, ClassMessage[]> = {};

  courses.forEach((course) => {
    seededMessages[course.id] = initialMessages.map((message, index) => ({
      ...message,
      id: `${course.id}-${message.id}-${index}`,
    }));
  });

  return seededMessages;
}

export function ChatExperience({
  courses,
  initialMessages,
  userName,
}: ChatExperienceProps) {
  const [selectedCourseId, setSelectedCourseId] = useState(
    courses[0]?.id ?? "",
  );
  const [draft, setDraft] = useState("");
  const [messagesByCourse, setMessagesByCourse] = useState<
    Record<string, ClassMessage[]>
 >(() => buildInitialMessages(courses, initialMessages));

  const activeCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId),
    [courses, selectedCourseId],
  );

  const activeMessages = messagesByCourse[selectedCourseId] ?? [];

  const handleSelectCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    const target = document.getElementById("chat-window");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSend = () => {
    const trimmed = draft.trim();
    if (!trimmed || !selectedCourseId) return;

    const newMessage: ClassMessage = {
      id: `${selectedCourseId}-${Date.now()}`,
      senderName: userName || "You",
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      }),
      isCurrentUser: true,
    };

    setMessagesByCourse((prev) => ({
      ...prev,
      [selectedCourseId]: [...(prev[selectedCourseId] ?? []), newMessage],
    }));
    setDraft("");
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
                onClick={() => handleSelectCourse(course.id)}
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
                </div>
                <span className="text-xs font-semibold">
                  {isActive ? "Joined" : "Join"}
                </span>
              </button>
            );
          })}
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
          </div>
          <div className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 sm:block">
            Real-time texting UI
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {activeCourse ? (
            activeMessages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-600">
              Choose a class chat to start texting.
            </div>
          )}
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
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!draft.trim() || !activeCourse}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Send
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Hit Enter or tap Send to add your message to the chat.
          </p>
        </div>
      </section>
    </div>
  );
}
