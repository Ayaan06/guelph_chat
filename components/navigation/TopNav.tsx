"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useMemo, useState } from "react";

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
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex items-center justify-between px-4 py-3 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuToggle}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 lg:hidden"
            aria-label="Toggle menu"
          >
            Menu
          </button>
          <Link href="/dashboard" className="text-lg font-semibold text-slate-900">
            CampusChat
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/chat"
            className="hidden rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 sm:inline-flex"
          >
            Messages
          </Link>
          <Link
            href="/classes"
            className="hidden rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 sm:inline-flex"
          >
            Browse Classes
          </Link>
          <Link
            href="/profile"
            className="hidden rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 sm:inline-flex"
          >
            Profile
          </Link>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-bold uppercase text-blue-700 ring-1 ring-inset ring-blue-200 transition hover:shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
              aria-label="Open user menu"
            >
              {initials}
            </button>
            {isMenuOpen ? (
              <div className="absolute right-0 mt-2 w-44 rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50">
                <div className="px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">
                    {userName ?? "Student"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {userEmail ?? "your@school.edu"}
                  </p>
                </div>
                <div className="border-t border-slate-200">
                  <Link
                    href="/profile"
                    className="flex w-full items-center px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      signOut({ callbackUrl: "/auth" });
                    }}
                    className="flex w-full items-center px-4 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
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
