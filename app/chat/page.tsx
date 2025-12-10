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

const TERM_LABEL = "Fall 2025";

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

  const hasGlobal = joinedCourses.some(
    (course) => course.id === GLOBAL_COURSE.id,
  );
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

  const courseIdsForCounts = coursesWithGlobal.map((course) => course.id);
  const memberCounts = await prisma.classMembership.groupBy({
    by: ["courseId"],
    where: { courseId: { in: courseIdsForCounts } },
    _count: { courseId: true },
  });
  const memberCountMap = new Map(
    memberCounts.map((entry) => [entry.courseId, entry._count.courseId]),
  );

  const coursesWithMeta = coursesWithGlobal.map((course) => ({
    ...course,
    memberCount: memberCountMap.get(course.id) ?? 1,
    termLabel: TERM_LABEL,
  }));

  const userName = session.user?.name ?? session.user?.email ?? "You";
  const userEmail = session.user?.email ?? undefined;

  return (
    <AppLayout userName={userName} userEmail={userEmail}>
      <div className="space-y-8">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-8 shadow-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">
                Step 1 · Landing
              </p>
              <h1 className="text-3xl font-semibold leading-tight text-white">
                One flow: land, discover, and chat with your class.
              </h1>
              <p className="text-sm text-slate-300">
                Start here, hop to discovery, then drop into realtime chat. We
                enroll you automatically so the left sidebar and chat room stay
                in sync.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/classes"
                  className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Discover classes (Step 2)
                </Link>
                <Link
                  href="/dashboard#your-classes"
                  className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Dashboard shortcuts
                </Link>
              </div>
            </div>
            <div className="grid w-full max-w-md grid-cols-3 gap-3 rounded-2xl bg-white/10 p-4 text-center text-xs font-semibold text-white shadow-inner backdrop-blur lg:max-w-lg">
              <div className="space-y-1 rounded-xl bg-white/10 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.14em] text-slate-200">
                  Step 1
                </p>
                <p>Landing</p>
                <p className="text-[11px] text-slate-300">
                  Orientation & next CTA
                </p>
              </div>
              <div className="space-y-1 rounded-xl bg-white/10 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.14em] text-slate-200">
                  Step 2
                </p>
                <p>Discover</p>
                <p className="text-[11px] text-slate-300">Filter & join</p>
              </div>
              <div className="space-y-1 rounded-xl bg-white px-3 py-2 text-slate-900 shadow-md">
                <p className="text-[11px] uppercase tracking-[0.14em] text-blue-600">
                  Step 3
                </p>
                <p>Chat</p>
                <p className="text-[11px] text-slate-500">Realtime room</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-600">
              Step 1
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">
              Landing
            </h2>
            <p className="text-sm text-slate-600">
              You&apos;re here. Quick summary, next CTA, and your chats ready in
              the sidebar.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-600">
              Step 2
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">
              Discover
            </h2>
            <p className="text-sm text-slate-600">
              Browse &ldquo;Discover classes&rdquo; to search, filter, and join.
              Joining instantly enrolls and redirects you into chat.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-600">
              Step 3
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">
              Chat
            </h2>
            <p className="text-sm text-slate-600">
              Realtime chat with sticky course header, improved bubbles, and a
              premium composer.
            </p>
          </div>
        </section>

        <ChatExperience
          courses={coursesWithMeta}
          userId={session.user.id}
          initialCourseId={requestedCourse?.id ?? coursesWithMeta[0]?.id}
        />
      </div>
    </AppLayout>
  );
}
