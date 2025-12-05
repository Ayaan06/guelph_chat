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
    redirect("/login");
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
      redirect("/login");
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
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-900 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-xl space-y-8 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-blue-900/40 backdrop-blur">
          <header className="space-y-2 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-blue-100">
              Finish setup
            </p>
            <h1 className="text-3xl font-semibold text-white">
              Choose a username
            </h1>
            <p className="text-sm text-blue-100/80">
              We&apos;ll store it with your Google account so others can see
              your handle.
            </p>
          </header>

          <form action={saveProfile} className="space-y-5">
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-white/90">
                Username
              </label>
              <input
                name="username"
                required
                minLength={3}
                maxLength={30}
                pattern="[A-Za-z0-9_\\.]+"
                defaultValue={user?.username ?? ""}
                className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-300 focus:bg-white/15"
                placeholder="e.g. guelph_user"
              />
              <p className="text-xs text-blue-100/70">
                Letters, numbers, underscores, and dots only.
              </p>
              {error && (
                <p className="text-sm font-medium text-red-300">
                  That username is taken. Try another.
                </p>
              )}
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-white/90">
                Display name (optional)
              </label>
              <input
                name="name"
                defaultValue={user?.name ?? ""}
                className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-300 focus:bg-white/15"
                placeholder="Your name"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="flex w-full items-center justify-center rounded-full bg-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition hover:bg-blue-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
              >
                Save and continue
              </button>
            </div>
          </form>

          <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-blue-100/70">
            Signed in as {user?.email ?? "your Google account"}.
          </div>
        </div>
      </div>
    </main>
  );
}
