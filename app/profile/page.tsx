import { SignOutButton } from "@/components/auth-buttons";
import { authOptions, type AppSession } from "@/lib/auth";
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
      username: true,
      name: true,
      email: true,
      image: true,
      createdAt: true,
    },
  });

  if (!user) {
    redirect("/auth");
  }

  if (!user.username) {
    redirect("/onboarding");
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <header className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
              Profile
            </p>
            <h1 className="text-3xl font-semibold">
              @{user.username}
              {user.name ? ` · ${user.name}` : ""}
            </h1>
            {user.email && (
              <p className="text-sm text-slate-600">{user.email}</p>
            )}
          </div>
          <SignOutButton />
        </header>

        <div className="mt-10 grid gap-6 lg:grid-cols-[2fr,1fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              Account information
            </h2>
            <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <dt className="text-xs uppercase tracking-[0.15em] text-slate-500">
                  Username
                </dt>
                <dd className="mt-1 font-medium text-slate-900">
                  @{user.username}
                </dd>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <dt className="text-xs uppercase tracking-[0.15em] text-slate-500">
                  Name
                </dt>
                <dd className="mt-1 font-medium text-slate-900">
                  {user.name ?? "—"}
                </dd>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <dt className="text-xs uppercase tracking-[0.15em] text-slate-500">
                  Email
                </dt>
                <dd className="mt-1 font-medium text-slate-900">
                  {user.email ?? "—"}
                </dd>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <dt className="text-xs uppercase tracking-[0.15em] text-slate-500">
                  Joined
                </dt>
                <dd className="mt-1 font-medium text-slate-900">
                  {user.createdAt.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </dd>
              </div>
            </dl>
            <p className="mt-6 text-xs text-slate-600">
              You can update your username or name later by changing the form on
              the onboarding page.
            </p>
          </section>

          <section className="space-y-4 rounded-3xl border border-blue-100 bg-blue-50 p-6 text-sm text-blue-900 shadow-sm">
            <h3 className="text-lg font-semibold text-blue-900">
              What&apos;s stored
            </h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 h-2 w-2 rounded-full bg-blue-500" />
                <span>
                  Username and display name saved in your Prisma User record.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 h-2 w-2 rounded-full bg-blue-500" />
                <span>
                  OAuth account + sessions stored via Prisma adapter.
                </span>
              </li>
            </ul>
            <p className="text-xs text-blue-800/80">
              Extend this page to show chat data or other profile fields.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
