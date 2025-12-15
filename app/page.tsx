import { authOptions, type AppSession } from "@/lib/auth";
import { AnonymousGlobalChat } from "@/components/chat/AnonymousGlobalChat";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { getServerSession } from "next-auth/next";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = (await getServerSession(authOptions)) as AppSession | null;

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="relative min-h-screen overflow-hidden theme-hero">
      <div
        className="absolute inset-0 opacity-80"
        style={{
          backgroundImage:
            "radial-gradient(circle at 18% 18%, color-mix(in srgb, var(--accent) 14%, transparent) 0%, transparent 32%), radial-gradient(circle at 82% 6%, color-mix(in srgb, var(--accent-strong) 14%, transparent) 0%, transparent 28%)",
        }}
      />
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>
      <div className="relative mx-auto max-w-6xl px-6 py-16 text-[color:var(--hero-text)]">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr,0.95fr]">
          <section className="space-y-6 text-center lg:text-left">
            <p className="inline-flex items-center gap-2 rounded-full border border-[var(--hero-card-border)] bg-[color-mix(in_srgb,var(--hero-card-bg)_70%,transparent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--hero-text)] shadow-lg shadow-[color-mix(in_srgb,var(--accent)_20%,transparent)] backdrop-blur">
              Course communities
            </p>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-tight text-[color:var(--hero-text)] sm:text-5xl">
                Connect with your classmates
              </h1>
              <p className="max-w-2xl text-lg text-[color-mix(in_srgb,var(--hero-text)_78%,transparent)] lg:max-w-xl">
                Course-based group chats for your school. Share resources, plan
                study sessions, and stay on top of every class together.
              </p>
              <p className="text-sm text-[color-mix(in_srgb,var(--hero-text)_65%,transparent)]">
                New here? Say hello in the global chat as an auto-assigned
                Anonymous ID, then sign in to unlock your classes.
              </p>
            </div>
            <div className="flex flex-col items-center gap-3 lg:items-start lg:flex-row">
              <Link
                href="/auth"
                className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--accent)] px-6 text-sm font-semibold text-white shadow-lg shadow-[color-mix(in_srgb,var(--accent)_30%,transparent)] transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                Sign In
              </Link>
              <Link
                href="/auth?mode=signup"
                className="inline-flex h-12 items-center justify-center rounded-full border border-[var(--hero-card-border)] bg-[color-mix(in_srgb,var(--hero-card-bg)_70%,transparent)] px-6 text-sm font-semibold text-[color:var(--hero-text)] shadow-lg shadow-[color-mix(in_srgb,var(--accent)_18%,transparent)] transition hover:-translate-y-0.5 hover:bg-[color-mix(in_srgb,var(--hero-card-bg)_85%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                Create Account
              </Link>
            </div>
            <p className="text-xs text-[color-mix(in_srgb,var(--hero-text)_65%,transparent)]">
              Use your school email to get started. Authentication is already set up.
            </p>
          </section>

          <section className="rounded-3xl border border-[var(--hero-card-border)] bg-[var(--hero-card-bg)] p-2 shadow-2xl shadow-[color-mix(in_srgb,var(--accent)_22%,transparent)] backdrop-blur">
            <AnonymousGlobalChat allowPosting={false} />
          </section>
        </div>
      </div>
    </main>
  );
}
