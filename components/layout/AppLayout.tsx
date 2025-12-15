"use client";

import { TopNav, type NavLink } from "../navigation/TopNav";

type AppLayoutProps = {
  children: React.ReactNode;
  userName?: string | null;
  userEmail?: string | null;
};

const navItems: NavLink[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    match: (pathname) => pathname.startsWith("/dashboard"),
  },
  {
    label: "Messages",
    href: "/chat",
    match: (pathname) => pathname.startsWith("/chat"),
  },
  {
    label: "Browse Classes",
    href: "/classes",
    match: (pathname) => pathname === "/classes",
  },
  {
    label: "Profile",
    href: "/profile",
    match: (pathname) => pathname.startsWith("/profile"),
  },
];

export function AppLayout({ children, userEmail, userName }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[color:var(--page-foreground)] transition-colors">
      <TopNav
        navLinks={navItems}
        userEmail={userEmail}
        userName={userName}
      />
      <main className="px-4 pb-12 pt-6 lg:px-10 lg:pt-8">{children}</main>
    </div>
  );
}
