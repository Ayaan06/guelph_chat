"use client";

import { useEffect, useMemo, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

type Mode = "login" | "signup";

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const [mode, setMode] = useState<Mode>(
    (searchParams.get("mode") as Mode) === "signup" ? "signup" : "login",
  );
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/profile");
    }
  }, [router, status]);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (!errorParam || errorParam === "SessionRequired") {
      return;
    }

    const mapped =
      errorParam === "OAuthAccountNotLinked"
        ? "Account already exists, please log in or use Google."
        : errorParam;

    setError(mapped);
  }, [searchParams]);

  const heading = useMemo(
    () =>
      mode === "login"
        ? { title: "Welcome back", subtitle: "Log in to continue your session." }
        : {
            title: "Create your account",
            subtitle:
              "Pick a username and password to store in the same database as Google logins.",
          },
    [mode],
  );

  const handleCredentials = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const isSignup = mode === "signup";
    const result = await signIn("credentials", {
      redirect: false,
      email,
      username: isSignup ? username : email,
      password,
      action: isSignup ? "signup" : "login",
      callbackUrl: "/profile",
    });

    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
      return;
    }

    router.push(result?.url ?? "/profile");
    router.refresh();
  };

  const handleGoogle = () => {
    setError(null);
    signIn("google", { callbackUrl: "/onboarding" });
  };

  if (status === "authenticated") {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-900 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-10 px-6 py-12 lg:flex-row lg:items-center">
        <section className="space-y-6 lg:w-1/2">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-100 shadow-lg shadow-indigo-900/30 backdrop-blur">
            Authentication
          </p>
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              Sign in with Google or credentials.
            </h1>
            <p className="text-lg text-slate-200/80">
              Keep every account in the same database via NextAuth, Prisma, and
              Supabase Postgres. Choose Google OAuth or create a username and
              password to continue.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-indigo-50/80">
            <span className="rounded-full border border-white/15 px-3 py-1">
              Google OAuth
            </span>
            <span className="rounded-full border border-white/15 px-3 py-1">
              Credentials + bcrypt
            </span>
            <span className="rounded-full border border-white/15 px-3 py-1">
              Prisma adapter
            </span>
          </div>
        </section>

        <section className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-indigo-900/40 backdrop-blur">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-indigo-400/10" />
          <div className="relative space-y-6">
            <header className="space-y-2">
              <p className="text-sm uppercase tracking-[0.18em] text-indigo-100">
                {mode === "login" ? "Log in" : "Sign up"}
              </p>
              <h2 className="text-2xl font-semibold text-white">
                {heading.title}
              </h2>
              <p className="text-sm text-slate-100/75">{heading.subtitle}</p>
            </header>

            <div className="space-y-4">
              <button
                type="button"
                onClick={handleGoogle}
                className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-white/15 bg-white/5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/30 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
              >
                <svg
                  viewBox="0 0 48 48"
                  className="h-5 w-5"
                  aria-hidden
                  focusable="false"
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6 1.54 7.38 2.83l5.4-5.26C33.78 3.41 29.47 1.5 24 1.5 14.96 1.5 7.21 6.98 3.92 14.58l6.59 5.12C12.03 13.23 17.43 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.5 24.5c0-1.54-.14-3.02-.39-4.44H24v8.39h12.7c-.55 2.84-2.17 5.24-4.62 6.86l7.12 5.52C43.84 36.89 46.5 31.25 46.5 24.5z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.51 28.46a14.5 14.5 0 0 1-.76-4.46c0-1.55.27-3.05.76-4.46l-6.59-5.12A23.93 23.93 0 0 0 .5 24a23.93 23.93 0 0 0 3.42 9.58l6.59-5.12z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 47.5c6.48 0 11.9-2.13 15.86-5.75l-7.12-5.52c-2 1.35-4.56 2.15-8.74 2.15-6.57 0-11.97-3.72-13.89-9.18l-6.59 5.12C7.21 41.02 14.96 47.5 24 47.5z"
                  />
                  <path fill="none" d="M0 0h48v48H0z" />
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-3 text-xs text-slate-200/70">
                <span className="h-px flex-1 bg-white/20" />
                or
                <span className="h-px flex-1 bg-white/20" />
              </div>

              <div className="flex rounded-full bg-white/5 p-1 text-sm font-semibold text-white">
                {(["login", "signup"] as Mode[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setMode(item);
                      setError(null);
                    }}
                    className={`flex-1 rounded-full px-4 py-2 transition ${
                      mode === item
                        ? "bg-white text-slate-900 shadow"
                        : "text-indigo-50/80 hover:text-white"
                    }`}
                  >
                    {item === "login" ? "Log in" : "Sign up"}
                  </button>
                ))}
              </div>

              <form onSubmit={handleCredentials} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white/90">
                    {mode === "login" ? "Email or username" : "Email"}
                  </label>
                  <input
                    required
                    type={mode === "login" ? "text" : "email"}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-300 focus:bg-white/15"
                  />
                </div>

                {mode === "signup" && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-white/90">
                      Username
                    </label>
                    <input
                      required
                      minLength={3}
                      maxLength={30}
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      placeholder="choose a handle"
                      className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-300 focus:bg-white/15"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white/90">
                    Password
                  </label>
                  <input
                    required
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-300 focus:bg-white/15"
                  />
                </div>

                {error && (
                  <div className="rounded-2xl border border-red-200/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex h-12 w-full items-center justify-center rounded-full bg-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-900/30 transition hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-200 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isLoading
                    ? "Submitting..."
                    : mode === "login"
                      ? "Log in with credentials"
                      : "Create account"}
                </button>

                <p className="text-xs text-indigo-50/80">
                  All accounts use the same Prisma database. If you already have
                  a Google account with this email, please sign in with Google
                  instead.
                </p>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
