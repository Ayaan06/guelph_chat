"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ChatMessage } from "./ChatMessage";
import { getMajorById } from "@/lib/mockData";
import type { ClassMessage, Classmate, Course } from "@/lib/mockData";

type CourseChatLayoutProps = {
  course: Course;
  majorName?: string;
  messages: ClassMessage[];
  classmates: Classmate[];
  joinedCourses: Course[];
  termLabel: string;
  userName: string;
};

export function CourseChatLayout({
  course,
  majorName,
  messages,
  classmates,
  joinedCourses,
  termLabel,
  userName,
}: CourseChatLayoutProps) {
  const coursesList = useMemo(
    () =>
      joinedCourses.map((joined) => ({
        ...joined,
        majorName: getMajorById(joined.majorId)?.name,
        isActive: joined.id === course.id,
      })),
    [course.id, joinedCourses],
  );

  const renderedMessages = useMemo(
    () =>
      messages.map((message) =>
        message.isCurrentUser
          ? { ...message, senderName: userName || "You" }
          : message,
      ),
    [messages, userName],
  );

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
              {coursesList.length}
            </span>
          </div>
          <div className="space-y-2">
            {coursesList.map((joined) => {
              const active = joined.isActive;
              return (
                <Link
                  key={joined.id}
                  href={`/classes/${joined.id}`}
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
                  <p className="text-xs text-slate-500">
                    {joined.majorName ?? joined.majorId.toUpperCase()}
                  </p>
                </Link>
              );
            })}
            {coursesList.length === 0 && (
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
                {majorName ?? course.majorId.toUpperCase()} | Level {course.level} |{" "}
                {termLabel}
              </p>
            </div>
            <div className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 sm:block">
              UI preview
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/60 px-5 py-4">
            {renderedMessages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
          </div>

          <div className="border-t border-slate-200 px-5 py-4">
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-semibold text-slate-800">
                Messaging coming soon
              </p>
              <p className="text-xs text-slate-600">
                Draft a note to classmates. Sending is disabled in this preview.
              </p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                <textarea
                  disabled
                  placeholder="Messaging coming soon..."
                  className="h-24 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
                />
                <button
                  type="button"
                  disabled
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Send
                </button>
              </div>
            </div>
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
                  {majorName ?? course.majorId.toUpperCase()}
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
              Classmates online
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-800">
              {classmates.map((classmate) => (
                <li
                  key={`${classmate.name}-${classmate.year}`}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                    <div>
                      <p className="font-semibold text-slate-900">
                        {classmate.name}
                      </p>
                      <p className="text-xs text-slate-600">
                        {classmate.year} |{" "}
                        {getMajorById(classmate.majorId)?.name ??
                          classmate.majorId.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700">
                    Online
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
