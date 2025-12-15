"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { SIGN_OUT_REDIRECT_URL } from "@/lib/urls";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export type NavLink = {
  label: string;
  href: string;
  match?: (pathname: string) => boolean;
};

type TopNavProps = {
  navLinks?: NavLink[];
  userName?: string | null;
  userEmail?: string | null;
};

export function TopNav({ navLinks, userName, userEmail }: TopNavProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname() ?? "";

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

  const links: NavLink[] =
    navLinks ??
    [
      {
        label: "Dashboard",
        href: "/dashboard",
        match: (path) => path.startsWith("/dashboard"),
      },
      {
        label: "Messages",
        href: "/chat",
        match: (path) => path.startsWith("/chat"),
      },
      {
        label: "Browse Classes",
        href: "/classes",
        match: (path) => path.startsWith("/classes"),
      },
      {
        label: "Profile",
        href: "/profile",
        match: (path) => path.startsWith("/profile"),
      },
    ];

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-strong)] bg-[var(--nav-glass)] backdrop-blur transition-colors">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 lg:flex-nowrap lg:px-8">
        <div className="flex items-center">
          <Link
            href="/dashboard"
            className="text-lg font-semibold text-[color:var(--page-foreground)]"
          >
            CampusChat
          </Link>
        </div>
        <nav className="order-3 flex w-full items-center gap-1 overflow-x-auto whitespace-nowrap rounded-xl border border-[color-mix(in_srgb,var(--border-strong)_60%,transparent)] bg-[var(--card)] px-2 py-2 text-sm font-semibold text-[color:var(--muted-strong)] shadow-sm shadow-slate-200/40 lg:order-none lg:flex-1 lg:justify-center lg:border-0 lg:bg-transparent lg:px-4 lg:py-0 lg:shadow-none">
          {links.map((link) => {
            const normalizedHref = link.href.split("#")[0] || link.href;
            const matchesPath = link.match
              ? link.match(pathname)
              : normalizedHref === "/"
                ? pathname === "/"
                : pathname.startsWith(normalizedHref);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-2 transition hover:bg-[var(--card-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
                  matchesPath
                    ? "bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-[color:var(--accent-strong)]"
                    : "text-[color:var(--muted-strong)]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
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
