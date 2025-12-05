import { authOptions, type AppSession } from "@/lib/auth";
import { SignOutButton } from "@/components/auth-buttons";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = (await getServerSession(authOptions)) as AppSession | null;

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <header className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
              Welcome back
            </p>
            <h1 className="text-3xl font-semibold">
              {session.user.name ?? "New user"}
            </h1>
            {session.user.email && (
              <p className="text-sm text-slate-600">{session.user.email}</p>
            )}
          </div>
          <SignOutButton />
        </header>

        <div className="mt-10 grid gap-6 lg:grid-cols-[2fr,1fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              Account details
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Your Google account is connected and stored via Prisma in your
              Postgres database. You can use this as the base to gate chat
              features or any other app content.
            </p>
            <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <dt className="text-xs uppercase tracking-[0.15em] text-slate-500">
                  Name
                </dt>
                <dd className="mt-1 font-medium text-slate-900">
                  {session.user.name ?? "—"}
                </dd>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <dt className="text-xs uppercase tracking-[0.15em] text-slate-500">
                  Email
                </dt>
                <dd className="mt-1 font-medium text-slate-900">
                  {session.user.email ?? "—"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="space-y-4 rounded-3xl border border-blue-100 bg-blue-50 p-6 text-sm text-blue-900 shadow-sm">
            <h3 className="text-lg font-semibold text-blue-900">
              What&apos;s configured
            </h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 h-2 w-2 rounded-full bg-blue-500" />
                <span>
                  NextAuth with Google OAuth; change providers anytime in
                  <code className="mx-1 rounded bg-blue-100 px-1 py-0.5 text-xs">
                    lib/auth.ts
                  </code>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 h-2 w-2 rounded-full bg-blue-500" />
                <span>
                  Prisma schema for users, accounts, sessions, and verification
                  tokens in <code className="mx-1 rounded bg-blue-100 px-1 py-0.5 text-xs">prisma/schema.prisma</code>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 h-2 w-2 rounded-full bg-blue-500" />
                <span>
                  Session persistence uses the database strategy so logins are
                  stored server-side.
                </span>
              </li>
            </ul>
            <p className="text-xs text-blue-800/80">
              Edit this page to render your chat interface; the session is
              already available server-side via <code className="mx-1 rounded bg-blue-100 px-1 py-0.5 text-[11px]">getServerSession</code>.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
