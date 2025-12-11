import { ChatExperience } from "@/components/chat/ChatExperience";
import { AppLayout } from "@/components/layout/AppLayout";
import { authOptions, type AppSession } from "@/lib/auth";
import { ensureGlobalCourseAndMembership, GLOBAL_COURSE } from "@/lib/globalCourse";
import { prisma } from "@/lib/prisma";
import type { CourseSummary } from "@/types/chat";
import { getServerSession } from "next-auth/next";
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
