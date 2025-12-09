import { AppLayout } from "@/components/layout/AppLayout";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { authOptions, type AppSession } from "@/lib/auth";
import { getMajorById, majors, type UserProfile } from "@/lib/mockData";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const session = (await getServerSession(authOptions)) as AppSession | null;
  if (!session?.user?.id) {
    redirect("/auth");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      majorId: true,
      year: true,
      interests: true,
    },
  });

  const userName = user?.name ?? session.user.name ?? session.user.email ?? "";
  const userEmail = user?.email ?? session.user.email ?? undefined;

  const profile: UserProfile = {
    name: userName,
    email: userEmail,
    majorId: user?.majorId ?? "",
    year: user?.year ?? "",
    interests: user?.interests ?? [],
  };

  return (
    <AppLayout userName={userName} userEmail={userEmail}>
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
            Profile
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-900">
            {userName}
          </h1>
          {userEmail ? (
            <p className="text-sm text-slate-600">{userEmail}</p>
          ) : null}
          <p className="mt-2 text-sm text-slate-600">
            Customize your details. Changes save to your account.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.8fr,1fr]">
          <ProfileForm initialProfile={profile} majors={majors} />
          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">
                Snapshot
              </h3>
              <dl className="mt-3 space-y-3 text-sm text-slate-700">
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <dt className="text-slate-600">Major</dt>
                  <dd className="font-semibold">
                    {profile.majorId
                      ? getMajorById(profile.majorId)?.name ??
                        "Other / Interdisciplinary"
                      : "Not set"}
                  </dd>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <dt className="text-slate-600">Year</dt>
                  <dd className="font-semibold">
                    {profile.year || "Not set"}
                  </dd>
                </div>
                <div className="flex items-start justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <dt className="text-slate-600">Interests</dt>
                  <dd className="max-w-[220px] text-right font-semibold">
                    {profile.interests.length
                      ? profile.interests.join(", ")
                      : "Not set"}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm text-sm text-blue-900">
              <h4 className="text-base font-semibold text-blue-900">
                Coming soon
              </h4>
              <p className="mt-2">
                Sync this profile with your chat presence, show badges, and add
                office hours for peer help.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
