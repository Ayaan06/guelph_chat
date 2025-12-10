import { CourseCard } from "@/components/classes/CourseCard";
import { AppLayout } from "@/components/layout/AppLayout";
import { authOptions, type AppSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = (await getServerSession(authOptions)) as AppSession | null;

  if (!session?.user?.id) {
    redirect("/auth");
  }

  const memberships = await prisma.classMembership.findMany({
    where: { userId: session.user.id },
    include: { course: true },
    orderBy: { joinedAt: "desc" },
  });

  const joinedCourses = memberships
    .filter((membership) => membership.course)
    .map(({ course }) => ({
      id: course.id,
      code: course.code,
      name: course.name,
      major: course.major,
      level: course.level,
    }));

  const userName = session.user?.name ?? session.user?.email ?? "You";
  const userEmail = session.user?.email ?? undefined;
  const greetingName = userName.split(" ")[0] || "Student";

  return (
    <AppLayout userName={userName} userEmail={userEmail}>
      <div className="space-y-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-blue-600">
                Welcome back, {greetingName}
              </p>
              <h1 className="text-3xl font-semibold text-slate-900">
                Your campus hub
              </h1>
              <p className="text-sm text-slate-600">
                Jump into your classes or explore new ones to meet classmates.
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/chat"
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                Open messages
              </Link>
              <Link
                href="/classes"
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                Browse classes
              </Link>
              <Link
                href="/profile"
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                Edit profile
              </Link>
            </div>
          </div>
        </section>

        <section
          id="your-classes"
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Your Classes
              </h2>
              <p className="text-sm text-slate-600">
                Continue conversations where you left off.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {joinedCourses.length} joined
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {joinedCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                majorName={course.major}
                actionLabel="Go to chat"
                href={`/classes/${encodeURIComponent(course.id)}`}
              />
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Quick actions
            </h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link
                href="/classes"
                className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-blue-200 hover:bg-blue-50"
              >
                Browse classes
                <span aria-hidden className="text-base">-&gt;</span>
              </Link>
              <Link
                href="/profile"
                className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-blue-200 hover:bg-blue-50"
              >
                Edit profile
                <span aria-hidden className="text-base">-&gt;</span>
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">
              Upcoming this week
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-700">
              <li className="flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
                <div>
                  <p className="font-semibold">CIS*2500 study hall</p>
                  <p className="text-slate-600">Thursday at 6:00 PM</p>
                </div>
              </li>
              <li className="flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-green-500" />
                <div>
                  <p className="font-semibold">New lab partners</p>
                  <p className="text-slate-600">Check your class chats</p>
                </div>
              </li>
              <li className="flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-amber-500" />
                <div>
                  <p className="font-semibold">Team project kickoff</p>
                  <p className="text-slate-600">Start a thread in ENGR*4090</p>
                </div>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
