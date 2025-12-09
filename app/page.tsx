import { authOptions, type AppSession } from "@/lib/auth";
import { getServerSession } from "next-auth/next";
import Link from "next/link";

export default async function Home() {
  const session = (await getServerSession(authOptions)) as AppSession | null;
  const isAuthenticated = Boolean(session?.user);

  const primaryHref = isAuthenticated ? "/profile" : "/auth";
  const primaryLabel = isAuthenticated ? "Go to dashboard" : "Sign in to continue";

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-900 text-white">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="space-y-6">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-100 shadow-lg shadow-indigo-900/30 backdrop-blur">
            Modern authentication
          </p>
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
            Ship Google OAuth and credentials login in minutes.
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-200/85">
            Next.js App Router, NextAuth, Prisma, and Supabase Postgres working together.
            Continue with Google or create a username + password on the next step.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href={primaryHref}
              className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-slate-900 shadow-lg shadow-indigo-900/30 transition hover:-translate-y-0.5 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
            >
              {primaryLabel}
            </Link>
            <span className="text-sm text-indigo-50/80">
              Stored via Prisma adapter with secure sessions.
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
