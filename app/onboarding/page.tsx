import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { authOptions, type AppSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const params = searchParams ?? {};
  const error = params.error === "username-taken";

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
    },
  });

  if (user?.username) {
    redirect("/profile");
  }

  async function saveProfile(formData: FormData) {
    "use server";

    const session = (await getServerSession(authOptions)) as AppSession | null;
    if (!session?.user?.id) {
      redirect("/auth");
    }

    const username = formData.get("username")?.toString().trim();
    const nameValue = formData.get("name")?.toString().trim() || null;

    if (!username) {
      redirect("/onboarding");
    }

    try {
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          username,
          name: nameValue,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        redirect("/onboarding?error=username-taken");
      }
      throw err;
    }

    redirect("/profile");
  }

  return (
    <main className="relative min-h-screen theme-hero text-[color:var(--hero-text)]">
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
      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-xl space-y-8 rounded-3xl border border-[var(--hero-card-border)] bg-[var(--hero-card-bg)] p-8 shadow-2xl backdrop-blur">
          <header className="space-y-2 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-[color-mix(in_srgb,var(--hero-text)_65%,transparent)]">
              Finish setup
            </p>
            <h1 className="text-3xl font-semibold text-[color:var(--hero-text)]">
              Choose a username
            </h1>
            <p className="text-sm text-[color-mix(in_srgb,var(--hero-text)_70%,transparent)]">
              We&apos;ll store it with your Google account so others can see
              your handle.
            </p>
          </header>

          <form action={saveProfile} className="space-y-5">
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-[color:var(--hero-text)]">
                Username
              </label>
              <input
                name="username"
                required
                minLength={3}
                maxLength={30}
                pattern="[A-Za-z0-9_.]+"
                defaultValue={user?.username ?? ""}
                className="w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--card)] px-4 py-3 text-sm text-[color:var(--page-foreground)] outline-none placeholder:text-[color-mix(in_srgb,var(--muted)_70%,transparent)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_30%,transparent)]"
                placeholder="e.g. guelph_user"
              />
              <p className="text-xs text-[color-mix(in_srgb,var(--hero-text)_65%,transparent)]">
                Letters, numbers, underscores, and dots only.
              </p>
              {error && (
                <p className="text-sm font-medium text-rose-300">
                  That username is taken. Try another.
                </p>
              )}
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-[color:var(--hero-text)]">
                Display name (optional)
              </label>
              <input
                name="name"
                defaultValue={user?.name ?? ""}
                className="w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--card)] px-4 py-3 text-sm text-[color:var(--page-foreground)] outline-none placeholder:text-[color-mix(in_srgb,var(--muted)_70%,transparent)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_30%,transparent)]"
                placeholder="Your name"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="flex w-full items-center justify-center rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[color-mix(in_srgb,var(--accent)_28%,transparent)] transition hover:bg-[color-mix(in_srgb,var(--accent)_90%,var(--accent-strong))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                Save and continue
              </button>
            </div>
          </form>

          <div className="rounded-2xl border border-[var(--hero-card-border)] bg-[color-mix(in_srgb,var(--hero-card-bg)_75%,transparent)] p-4 text-xs text-[color-mix(in_srgb,var(--hero-text)_70%,transparent)]">
            Signed in as {user?.email ?? "your Google account"}.
          </div>
        </div>
      </div>
    </main>
  );
}
