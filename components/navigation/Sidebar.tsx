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
        className={`fixed inset-y-0 left-0 z-40 w-72 transform bg-white shadow-xl transition-transform lg:static lg:translate-x-0 lg:shadow-none ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col border-r border-slate-200 bg-white">
          <div className="flex items-center justify-between px-6 py-4 lg:hidden">
            <span className="text-sm font-semibold text-slate-700">
              Menu
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
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
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                  onClick={onClose}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-slate-200 px-4 py-4 text-xs text-slate-500">
            CampusChat for students
          </div>
        </div>
      </aside>
    </>
  );
}
