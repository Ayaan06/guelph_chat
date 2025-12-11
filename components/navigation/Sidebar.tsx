"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = {
  label: string;
  href: string;
  match?: (pathname: string) => boolean;
};

type SidebarProps = {
  links: NavItem[];
  isOpen: boolean;
  onClose?: () => void;
};

export function Sidebar({ links, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-slate-900/50 transition-opacity lg:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 transform bg-[var(--card)] shadow-xl transition-transform lg:static lg:translate-x-0 lg:shadow-none ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col border-r border-[var(--border-strong)] bg-[var(--card)] transition-colors">
          <div className="flex items-center justify-between px-6 py-4 lg:hidden">
            <span className="text-sm font-semibold text-[color:var(--page-foreground)]">
              Menu
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-2 text-[color:var(--muted)] hover:bg-[var(--card-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            >
              Close
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-3 py-4">
            {links.map((item) => {
              const normalizedHref = item.href.split("#")[0] || item.href;
              const currentPath = pathname ?? "";
              const matchesPath = item.match
                ? item.match(currentPath)
                : normalizedHref === "/"
                  ? currentPath === "/"
                  : currentPath.startsWith(normalizedHref);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    matchesPath
                      ? "bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-[color:var(--accent-strong)]"
                      : "text-[color:var(--page-foreground)] hover:bg-[var(--card-soft)]"
                  }`}
                  onClick={onClose}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-[var(--border-strong)] px-4 py-4 text-xs text-[color:var(--muted)]">
            CampusChat for students
          </div>
        </div>
      </aside>
    </>
  );
}
