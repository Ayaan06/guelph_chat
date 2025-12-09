import { ChatMessage } from "@/components/chat/ChatMessage";
import { AppLayout } from "@/components/layout/AppLayout";
import { CourseCard } from "@/components/classes/CourseCard";
import {
  classmatesOnline,
  getCourseById,
  getMajorById,
  joinedCourses,
  mockMessages,
  mockUserProfile,
  termLabel,
} from "@/lib/mockData";
import { authOptions, type AppSession } from "@/lib/auth";
import { getServerSession } from "next-auth/next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function ClassPage({
  params,
}: {
  params: { courseId: string };
}) {
  const session = (await getServerSession(authOptions)) as AppSession | null;

  if (!session?.user?.id) {
    redirect("/auth");
  }

  const course = getCourseById(params.courseId);
  if (!course) {
    notFound();
  }

  const userName = session.user?.name ?? mockUserProfile.name;
  const userEmail = session.user?.email ?? mockUserProfile.email ?? undefined;
  const major = getMajorById(course.majorId);

  return (
    <AppLayout userName={userName} userEmail={userEmail}>
      <div className="grid gap-6 xl:grid-cols-[260px,1fr,280px]">
        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                Your Classes
              </h2>
              <Link
                href="/classes"
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                Browse
              </Link>
            </div>
            <div className="mt-3 space-y-2">
              {joinedCourses.map((joined) => {
                const isActive = joined.id === course.id;
                return (
                  <Link
                    key={joined.id}
                    href={`/classes/${joined.id}`}
                    className={`block rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span className="block text-xs uppercase text-slate-500">
                      {joined.code}
                    </span>
                    {joined.name}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">
              Other classes
            </h3>
            <div className="mt-3 space-y-3">
              {joinedCourses
                .filter((item) => item.id !== course.id)
                .slice(0, 2)
                .map((item) => (
                  <CourseCard
                    key={item.id}
                    course={item}
                    majorName={getMajorById(item.majorId)?.name}
                    actionLabel="Open"
                    href={`/classes/${item.id}`}
                  />
                ))}
            </div>
          </div>
        </aside>

        <section className="flex flex-col gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  {course.code}
                </p>
                <h1 className="text-2xl font-semibold text-slate-900">
                  {course.name}
                </h1>
                <p className="text-sm text-slate-600">
                  {major?.name ?? course.majorId.toUpperCase()} • Level{" "}
                  {course.level}
                </p>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                Term {termLabel}
              </div>
            </div>
          </div>

          <div className="flex min-h-[520px] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {mockMessages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
            </div>
            <div className="border-t border-slate-200 px-5 py-4">
              <label className="text-sm font-semibold text-slate-800">
                Message
              </label>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                <textarea
                  disabled
                  placeholder="Messaging coming soon..."
                  className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                  rows={3}
                />
                <button
                  type="button"
                  disabled
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Send
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Live messaging and threads will appear here soon.
              </p>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">
              Class Info
            </h3>
            <dl className="mt-3 space-y-3 text-sm text-slate-700">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <dt className="text-slate-600">Course</dt>
                <dd className="font-semibold">{course.code}</dd>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <dt className="text-slate-600">Name</dt>
                <dd className="font-semibold">{course.name}</dd>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <dt className="text-slate-600">Major</dt>
                <dd className="font-semibold">
                  {major?.name ?? course.majorId.toUpperCase()}
                </dd>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <dt className="text-slate-600">Level</dt>
                <dd className="font-semibold">{course.level}</dd>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <dt className="text-slate-600">Term</dt>
                <dd className="font-semibold">{termLabel}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">
              Classmates online
            </h3>
            <ul className="mt-3 space-y-3">
              {classmatesOnline.map((classmate) => (
                <li
                  key={classmate.name}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {classmate.name}
                    </p>
                    <p className="text-xs text-slate-600">
                      {classmate.majorId.toUpperCase()} • {classmate.year}
                    </p>
                  </div>
                  <span className="h-2 w-2 rounded-full bg-green-500" aria-label="Online" />
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </AppLayout>
  );
}
