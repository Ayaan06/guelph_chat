import { BrowseClassesContent } from "@/components/classes/BrowseClassesContent";
import { AppLayout } from "@/components/layout/AppLayout";
import { authOptions, type AppSession } from "@/lib/auth";
import { courses, majors, mockUserProfile } from "@/lib/mockData";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";

export default async function ClassesPage() {
  const session = (await getServerSession(authOptions)) as AppSession | null;

  if (!session?.user?.id) {
    redirect("/auth");
  }

  const userName = session.user?.name ?? mockUserProfile.name;
  const userEmail = session.user?.email ?? mockUserProfile.email ?? undefined;

  return (
    <AppLayout userName={userName} userEmail={userEmail}>
      <BrowseClassesContent majors={majors} courses={courses} />
    </AppLayout>
  );
}
