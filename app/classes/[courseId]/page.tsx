import { authOptions, type AppSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";

// Prisma requires the Node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CoursePageProps = {
  params: {
    courseId: string;
  };
};

export default async function CoursePage({ params }: CoursePageProps) {
  const session = (await getServerSession(authOptions)) as AppSession | null;

  if (!session?.user?.id) {
    redirect("/auth");
  }

  if (!params?.courseId) {
    redirect("/chat");
  }

  const courseIdParam = decodeURIComponent(params.courseId);

  let course = await prisma.course.findUnique({
    where: { id: courseIdParam },
  });

  if (!course) {
    course = await prisma.course.findUnique({
      where: { code: courseIdParam },
    });
  }

  if (!course) {
    redirect("/chat");
  }

  // Always funnel class chat deep links into the unified /chat view.
  redirect(`/chat?courseId=${encodeURIComponent(course.id)}`);
}
