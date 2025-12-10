import { ChatExperience } from "@/components/chat/ChatExperience";
import { AppLayout } from "@/components/layout/AppLayout";
import { authOptions, type AppSession } from "@/lib/auth";
import { ensureGlobalCourseAndMembership, GLOBAL_COURSE } from "@/lib/globalCourse";
import { prisma } from "@/lib/prisma";
import type { CourseSummary } from "@/types/chat";
import { getServerSession } from "next-auth/next";
import Link from "next/link";
import { redirect } from "next/navigation";

type ChatPageProps = {
  searchParams?: {
    courseId?: string;
  };
};

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const session = (await getServerSession(authOptions)) as AppSession | null;

  if (!session?.user?.id) {
    redirect("/auth");
  }

  await ensureGlobalCourseAndMembership(session.user.id);

  const requestedCourseId = searchParams?.courseId;
  let requestedCourse: CourseSummary | null = null;

  if (requestedCourseId) {
    const course = await prisma.course.findUnique({
      where: { id: requestedCourseId },
    });

    if (course) {
      await prisma.classMembership.upsert({
        where: {
          userId_courseId: {
            userId: session.user.id,
            courseId: course.id,
          },
        },
        update: {},
        create: {
          userId: session.user.id,
          courseId: course.id,
        },
      });

      requestedCourse = {
        id: course.id,
        code: course.code,
        name: course.name,
        major: course.major,
        level: course.level,
      };
    }
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

  if (
    requestedCourse &&
    !joinedCourses.some((course) => course.id === requestedCourse?.id)
  ) {
    joinedCourses.unshift(requestedCourse);
  }

  const hasGlobal = joinedCourses.some((course) => course.id === GLOBAL_COURSE.id);
  const coursesWithGlobal = hasGlobal
    ? joinedCourses
    : [
        {
          id: GLOBAL_COURSE.id,
          code: GLOBAL_COURSE.code,
          name: GLOBAL_COURSE.name,
          major: GLOBAL_COURSE.major,
          level: GLOBAL_COURSE.level,
        },
        ...joinedCourses,
      ];

  const userName = session.user?.name ?? session.user?.email ?? "You";
  const userEmail = session.user?.email ?? undefined;

  return (
    <AppLayout userName={userName} userEmail={userEmail}>
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-blue-600">
                Start texting
              </p>
              <h1 className="text-3xl font-semibold text-slate-900">
                Join a class chat
              </h1>
              <p className="text-sm text-slate-600">
                Pick one of your classes and text classmates in a focused chat room.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/classes"
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                Browse classes
              </Link>
              <Link
                href="/dashboard#your-classes"
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              >
                Back to dashboard
              </Link>
            </div>
          </div>
        </section>

        <ChatExperience
          courses={coursesWithGlobal}
          userId={session.user.id}
          initialCourseId={requestedCourse?.id ?? coursesWithGlobal[0]?.id}
        />
      </div>
    </AppLayout>
  );
}
