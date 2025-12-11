import { authOptions, type AppSession } from "@/lib/auth";
import { AnonymousGlobalChat } from "@/components/chat/AnonymousGlobalChat";
import { getServerSession } from "next-auth/next";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = (await getServerSession(authOptions)) as AppSession | null;

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-blue-900 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.12),_transparent_45%)]" />
      <div className="relative mx-auto max-w-6xl px-6 py-16">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr,0.95fr]">
          <section className="space-y-6 text-center lg:text-left">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-100 shadow-lg shadow-blue-900/40 backdrop-blur">
              Course communities
            </p>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
                Connect with your classmates
              </h1>
              <p className="max-w-2xl text-lg text-slate-200/85 lg:max-w-xl">
                Course-based group chats for your school. Share resources, plan
                study sessions, and stay on top of every class together.
              </p>
              <p className="text-sm text-indigo-100/85">
                New here? Say hello in the global chat as an auto-assigned
                Anonymous ID, then sign in to unlock your classes.
              </p>
            </div>
            <div className="flex flex-col items-center gap-3 lg:items-start lg:flex-row">
              <Link
                href="/auth"
                className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-slate-900 shadow-lg shadow-blue-900/30 transition hover:-translate-y-0.5 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
              >
                Sign In
              </Link>
              <Link
                href="/auth?mode=signup"
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/30 bg-white/10 px-6 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition hover:-translate-y-0.5 hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
              >
                Create Account
              </Link>
            </div>
            <p className="text-xs text-indigo-100/80">
              Use your school email to get started. Authentication is already set up.
            </p>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-2 shadow-2xl shadow-blue-900/40 backdrop-blur">
            <AnonymousGlobalChat />
          </section>
        </div>
      </div>
    </main>
  );
}
