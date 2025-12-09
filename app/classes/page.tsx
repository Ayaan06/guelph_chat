import { BrowseClassesContent } from "@/components/classes/BrowseClassesContent";
import { AppLayout } from "@/components/layout/AppLayout";
import { authOptions, type AppSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { CourseSummary } from "@/types/chat";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";

export default async function ClassesPage() {
  const session = (await getServerSession(authOptions)) as AppSession | null;

  if (!session?.user?.id) {
    redirect("/auth");
  }

  const courses = await prisma.course.findMany({
    orderBy: { code: "asc" },
  });

  const courseSummaries: CourseSummary[] = courses.map((course) => ({
    id: course.id,
    code: course.code,
    name: course.name,
    major: course.major,
    level: course.level,
  }));

  const majors = Array.from(
    new Set(courseSummaries.map((course) => course.major)),
  ).map(
    (major) => ({
      id: major,
      name: major,
    }),
  );

  const userName = session.user?.name ?? session.user?.email ?? "You";
  const userEmail = session.user?.email ?? undefined;

  return (
    <AppLayout userName={userName} userEmail={userEmail}>
      <BrowseClassesContent majors={majors} courses={courseSummaries} />
    </AppLayout>
  );
}
