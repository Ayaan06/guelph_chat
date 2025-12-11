"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

type Mode = "login" | "signup";

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const callbackUrl = useMemo(
    () => searchParams.get("callbackUrl") ?? "/profile",
    [searchParams],
  );

  const [mode, setMode] = useState<Mode>(
    (searchParams.get("mode") as Mode) === "signup" ? "signup" : "login",
  );
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(callbackUrl);
    }
  }, [callbackUrl, router, status]);

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
      name: isSignup ? name : undefined,
      password,
      action: isSignup ? "signup" : "login",
      callbackUrl,
    });

    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
      return;
    }

    router.push(result?.url ?? callbackUrl);
    router.refresh();
  };

  const handleGoogle = () => {
    setError(null);
    signIn("google", { callbackUrl });
  };

  if (status === "authenticated") {
    return (
      <main className="flex min-h-screen items-center justify-center theme-hero text-[color:var(--hero-text)]">
        <div className="rounded-3xl border border-[var(--hero-card-border)] bg-[var(--hero-card-bg)] px-8 py-6 text-center shadow-2xl backdrop-blur">
          <p className="text-xs uppercase tracking-[0.18em] text-[color-mix(in_srgb,var(--hero-text)_70%,transparent)]">
            Logged in
          </p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--hero-text)]">
            Redirecting to your page...
          </p>
        </div>
      </main>
    );
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
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-10 px-6 py-12 lg:flex-row lg:items-center">
        <section className="space-y-6 lg:w-1/2">
          <p className="inline-flex items-center gap-2 rounded-full border border-[var(--hero-card-border)] bg-[color-mix(in_srgb,var(--hero-card-bg)_70%,transparent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--hero-text)] shadow-lg shadow-[color-mix(in_srgb,var(--accent)_18%,transparent)] backdrop-blur">
            Authentication
          </p>
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold leading-tight text-[color:var(--hero-text)] sm:text-5xl">
              Sign in with Google or credentials.
            </h1>
            <p className="text-lg text-[color-mix(in_srgb,var(--hero-text)_75%,transparent)]">
              Keep every account in the same database via NextAuth, Prisma, and
              Supabase Postgres. Choose Google OAuth or create a username and
              password to continue.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-[color-mix(in_srgb,var(--hero-text)_65%,transparent)]">
            <span className="rounded-full border border-[var(--hero-card-border)] bg-[color-mix(in_srgb,var(--hero-card-bg)_65%,transparent)] px-3 py-1">
              Google OAuth
            </span>
            <span className="rounded-full border border-[var(--hero-card-border)] bg-[color-mix(in_srgb,var(--hero-card-bg)_65%,transparent)] px-3 py-1">
              Credentials + bcrypt
            </span>
            <span className="rounded-full border border-[var(--hero-card-border)] bg-[color-mix(in_srgb,var(--hero-card-bg)_65%,transparent)] px-3 py-1">
              Prisma adapter
            </span>
          </div>
        </section>

        <section className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-[var(--hero-card-border)] bg-[var(--hero-card-bg)] p-8 shadow-2xl backdrop-blur">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(135deg, color-mix(in srgb, var(--accent) 10%, transparent), transparent)",
            }}
          />
          <div className="relative space-y-6">
            <header className="space-y-2">
              <p className="text-sm uppercase tracking-[0.18em] text-[color-mix(in_srgb,var(--hero-text)_70%,transparent)]">
                {mode === "login" ? "Log in" : "Sign up"}
              </p>
              <h2 className="text-2xl font-semibold text-[color:var(--hero-text)]">
                {heading.title}
              </h2>
              <p className="text-sm text-[color-mix(in_srgb,var(--hero-text)_70%,transparent)]">
                {heading.subtitle}
              </p>
            </header>

            <div className="space-y-4">
              <button
                type="button"
                onClick={handleGoogle}
                className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-[var(--border-soft)] bg-[var(--card)] text-sm font-semibold text-[color:var(--page-foreground)] shadow-lg shadow-[color-mix(in_srgb,var(--accent)_15%,transparent)] transition hover:bg-[var(--card-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
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

              <div className="flex items-center gap-3 text-xs text-[color-mix(in_srgb,var(--hero-text)_60%,transparent)]">
                <span className="h-px flex-1 bg-[var(--hero-card-border)]" />
                or
                <span className="h-px flex-1 bg-[var(--hero-card-border)]" />
              </div>

              <div className="flex rounded-full bg-[color-mix(in_srgb,var(--hero-card-bg)_70%,transparent)] p-1 text-sm font-semibold text-[color:var(--hero-text)]">
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
                        ? "bg-[var(--card)] text-[color:var(--page-foreground)] shadow"
                        : "text-[color-mix(in_srgb,var(--hero-text)_75%,transparent)] hover:text-[color:var(--hero-text)]"
                    }`}
                  >
                    {item === "login" ? "Log in" : "Sign up"}
                  </button>
                ))}
              </div>

              <form onSubmit={handleCredentials} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[color:var(--hero-text)]">
                    {mode === "login" ? "Email or username" : "Email"}
                  </label>
                  <input
                    required
                    type={mode === "login" ? "text" : "email"}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--card)] px-4 py-3 text-sm text-[color:var(--page-foreground)] outline-none placeholder:text-[color-mix(in_srgb,var(--muted)_70%,transparent)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_30%,transparent)]"
                  />
                </div>

                {mode === "signup" && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[color:var(--hero-text)]">
                      Name
                    </label>
                    <input
                      required
                      minLength={2}
                      maxLength={60}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Your name"
                      className="w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--card)] px-4 py-3 text-sm text-[color:var(--page-foreground)] outline-none placeholder:text-[color-mix(in_srgb,var(--muted)_70%,transparent)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_30%,transparent)]"
                    />
                  </div>
                )}

                {mode === "signup" && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[color:var(--hero-text)]">
                      Username
                    </label>
                    <input
                      required
                      minLength={3}
                      maxLength={30}
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      placeholder="choose a handle"
                      className="w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--card)] px-4 py-3 text-sm text-[color:var(--page-foreground)] outline-none placeholder:text-[color-mix(in_srgb,var(--muted)_70%,transparent)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_30%,transparent)]"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[color:var(--hero-text)]">
                    Password
                  </label>
                  <input
                    required
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter a secure password"
                    className="w-full rounded-2xl border border-[var(--border-soft)] bg-[var(--card)] px-4 py-3 text-sm text-[color:var(--page-foreground)] outline-none placeholder:text-[color-mix(in_srgb,var(--muted)_70%,transparent)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_30%,transparent)]"
                  />
                </div>

                {error && (
                  <div className="rounded-2xl border border-rose-300/50 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex h-12 w-full items-center justify-center rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[color-mix(in_srgb,var(--accent)_28%,transparent)] transition hover:bg-[color-mix(in_srgb,var(--accent)_90%,var(--accent-strong))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isLoading
                    ? "Submitting..."
                    : mode === "login"
                      ? "Log in with credentials"
                      : "Create account"}
                </button>

                <p className="text-xs text-[color-mix(in_srgb,var(--hero-text)_60%,transparent)]">
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

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center theme-hero text-[color:var(--hero-text)]">
          Loading authentication...
        </div>
      }
    >
      <AuthContent />
    </Suspense>
  );
}
