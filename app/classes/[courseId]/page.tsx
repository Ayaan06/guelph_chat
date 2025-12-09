import { CourseChatLayout } from "@/components/chat/CourseChatLayout";
import { AppLayout } from "@/components/layout/AppLayout";
import { authOptions, type AppSession } from "@/lib/auth";
import {
  classmatesOnline,
  getCourseById,
  getMajorById,
  joinedCourses,
  mockMessages,
  mockUserProfile,
  termLabel,
} from "@/lib/mockData";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";

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

  const course = getCourseById(params.courseId);

  if (!course) {
    redirect("/classes");
  }

  const userName = session.user?.name ?? mockUserProfile.name;
  const userEmail = session.user?.email ?? mockUserProfile.email ?? undefined;
  const majorName = getMajorById(course.majorId)?.name;

  return (
    <AppLayout userName={userName} userEmail={userEmail}>
      <CourseChatLayout
        course={course}
        majorName={majorName}
        messages={mockMessages}
        classmates={classmatesOnline}
        joinedCourses={joinedCourses}
        termLabel={termLabel}
        userName={userName}
      />
    </AppLayout>
  );
}
