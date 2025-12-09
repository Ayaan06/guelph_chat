import { CourseChatLayout } from "@/components/chat/CourseChatLayout";
import { AppLayout } from "@/components/layout/AppLayout";
import { authOptions, type AppSession } from "@/lib/auth";
import { fetchInitialMessagesForCourse } from "@/lib/messages";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";

type CoursePageProps = {
  params: {
    courseId: string;
  };
};

const TERM_LABEL = "Fall 2025";

export default async function CoursePage({ params }: CoursePageProps) {
  const session = (await getServerSession(authOptions)) as AppSession | null;

  if (!session?.user?.id) {
    redirect("/auth");
  }

  const userId = session.user.id;

  const course = await prisma.course.findUnique({
    where: { id: params.courseId },
  });

  if (!course) {
    redirect("/classes");
  }

  // Auto-enroll the user when they open a class chat to keep UX smooth.
  await prisma.classMembership.upsert({
    where: {
      userId_courseId: {
        userId,
        courseId: course.id,
      },
    },
    update: {},
    create: {
      userId,
      courseId: course.id,
    },
  });

  const [memberships, classmatesRaw, initialMessages] = await Promise.all([
    prisma.classMembership.findMany({
      where: { userId },
      include: {
        course: true,
      },
      orderBy: { joinedAt: "desc" },
    }),
    prisma.classMembership.findMany({
      where: { courseId: course.id },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { joinedAt: "desc" },
      take: 24,
    }),
    fetchInitialMessagesForCourse(course.id),
  ]);

  const joinedCourses = memberships
    .filter((membership) => membership.course)
    .map(({ course }) => ({
      id: course.id,
      code: course.code,
      name: course.name,
      major: course.major,
      level: course.level,
    }));

  const classmates = classmatesRaw
    .filter((member) => member.userId !== userId)
    .map((member) => ({
      id: member.userId,
      name: member.user.name ?? member.user.email ?? "Classmate",
    }));

  const userName = session.user?.name ?? session.user?.email ?? "You";
  const userEmail = session.user?.email ?? undefined;

  return (
    <AppLayout userName={userName} userEmail={userEmail}>
      <CourseChatLayout
        course={{
          id: course.id,
          code: course.code,
          name: course.name,
          major: course.major,
          level: course.level,
        }}
        majorName={course.major}
        initialMessages={initialMessages.messages}
        initialCursor={initialMessages.nextCursor}
        classmates={classmates}
        joinedCourses={joinedCourses}
        termLabel={TERM_LABEL}
        userId={userId}
      />
    </AppLayout>
  );
}
