"use client";

import { useState } from "react";
import { Sidebar, type NavItem } from "../navigation/Sidebar";
import { TopNav } from "../navigation/TopNav";

type AppLayoutProps = {
  children: React.ReactNode;
  userName?: string | null;
  userEmail?: string | null;
};

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    match: (pathname) => pathname.startsWith("/dashboard"),
  },
  {
    label: "My Classes",
    href: "/dashboard#your-classes",
    match: (pathname) => pathname.startsWith("/classes/"),
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <TopNav
        onMenuToggle={() => setIsSidebarOpen(true)}
        userEmail={userEmail}
        userName={userName}
      />
      <div className="relative flex">
        <Sidebar
          links={navItems}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        <main className="flex-1 px-4 pb-12 pt-6 lg:px-10 lg:pt-8">
          {children}
        </main>
      </div>
    </div>
  );
}
