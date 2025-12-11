"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useMemo, useState } from "react";
import { SIGN_OUT_REDIRECT_URL } from "@/lib/urls";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

type TopNavProps = {
  onMenuToggle: () => void;
  userName?: string | null;
  userEmail?: string | null;
};

export function TopNav({ onMenuToggle, userName, userEmail }: TopNavProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const initials = useMemo(() => {
    if (userName) {
      const parts = userName.trim().split(" ").filter(Boolean);
      return (parts[0]?.[0] ?? "U") + (parts[1]?.[0] ?? "");
    }
    if (userEmail) {
      return userEmail.slice(0, 2).toUpperCase();
    }
    return "U";
  }, [userEmail, userName]);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-strong)] bg-[var(--nav-glass)] backdrop-blur transition-colors">
      <div className="flex items-center justify-between px-4 py-3 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuToggle}
            className="rounded-lg border border-[var(--border-strong)] bg-[var(--card)] px-3 py-2 text-sm font-semibold text-[color:var(--page-foreground)] shadow-sm transition hover:bg-[var(--card-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] lg:hidden"
            aria-label="Toggle menu"
          >
            Menu
          </button>
          <Link
            href="/dashboard"
            className="text-lg font-semibold text-[color:var(--page-foreground)]"
          >
            CampusChat
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/chat"
            className="hidden rounded-full px-4 py-2 text-sm font-semibold text-[color:var(--muted-strong)] transition hover:bg-[var(--card-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:inline-flex"
          >
            Messages
          </Link>
          <Link
            href="/classes"
            className="hidden rounded-full px-4 py-2 text-sm font-semibold text-[color:var(--muted-strong)] transition hover:bg-[var(--card-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:inline-flex"
          >
            Browse Classes
          </Link>
          <Link
            href="/profile"
            className="hidden rounded-full px-4 py-2 text-sm font-semibold text-[color:var(--muted-strong)] transition hover:bg-[var(--card-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:inline-flex"
          >
            Profile
          </Link>
          <ThemeToggle className="hidden sm:inline-flex" />
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold uppercase text-[color:var(--accent-strong)] ring-1 ring-inset ring-[color-mix(in_srgb,var(--accent)_35%,transparent)] transition hover:shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              style={{
                backgroundColor:
                  "color-mix(in srgb, var(--accent) 16%, transparent)",
              }}
              aria-label="Open user menu"
            >
              {initials}
            </button>
            {isMenuOpen ? (
              <div className="absolute right-0 mt-2 w-44 rounded-xl border border-[var(--border-strong)] bg-[var(--card)] shadow-lg shadow-slate-200/50">
                <div className="px-4 py-3">
                  <p className="text-sm font-semibold text-[color:var(--page-foreground)]">
                    {userName ?? "Student"}
                  </p>
                  <p className="text-xs text-[color:var(--muted)]">
                    {userEmail ?? "your@school.edu"}
                  </p>
                </div>
                <div className="border-t border-[var(--border-strong)]">
                  <Link
                    href="/profile"
                    className="flex w-full items-center px-4 py-2 text-sm font-semibold text-[color:var(--page-foreground)] transition hover:bg-[var(--card-soft)]"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      signOut({ callbackUrl: SIGN_OUT_REDIRECT_URL });
                    }}
                    className="flex w-full items-center px-4 py-2 text-left text-sm font-semibold text-[color:var(--page-foreground)] transition hover:bg-[var(--card-soft)]"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
