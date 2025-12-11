"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CourseCard } from "./CourseCard";
import type { CourseSummary } from "@/types/chat";

type Major = {
  id: string;
  name: string;
};

type BrowseClassesContentProps = {
  majors: Major[];
  courses: CourseSummary[];
};

type SortOption = "popularity" | "code" | "level";

const accentPalette: Array<"blue" | "emerald" | "indigo"> = [
  "blue",
  "indigo",
  "emerald",
];

export function BrowseClassesContent({
  majors,
  courses,
}: BrowseClassesContentProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMajor, setSelectedMajor] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("popularity");
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredCourses = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    const list = courses.filter((course) => {
      const matchesMajor =
        selectedMajor === "all" || course.major === selectedMajor;
      const matchesQuery =
        query.length === 0 ||
        course.code.toLowerCase().includes(query) ||
        course.name.toLowerCase().includes(query);
      return matchesMajor && matchesQuery;
    });

    return list.sort((a, b) => {
      if (sortBy === "popularity") {
        return (b.memberCount ?? 0) - (a.memberCount ?? 0);
      }
      if (sortBy === "level") {
        return a.level - b.level;
      }
      return a.code.localeCompare(b.code);
    });
  }, [courses, searchTerm, selectedMajor, sortBy]);

  const groupedByMajor = useMemo(
    () =>
      majors
        .map((major) => ({
          major,
          courses: filteredCourses.filter(
            (course) => course.major === major.id,
          ),
        }))
        .filter((group) => group.courses.length > 0),
    [filteredCourses, majors],
  );

  const handleJoin = async (course: CourseSummary) => {
    setError(null);
    setJoiningId(course.id);
    try {
      const response = await fetch("/api/courses/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Unable to join course");
      }

      const target = `/chat?courseId=${encodeURIComponent(course.id)}`;
      router.prefetch(target);
      router.push(target);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong joining.",
      );
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[var(--panel-gradient)] p-8 shadow-xl transition-colors">
        <div
          className="absolute inset-0 opacity-80"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, color-mix(in srgb, var(--accent) 12%, transparent) 0%, transparent 30%), radial-gradient(circle at 80% 0%, color-mix(in srgb, var(--accent-strong) 12%, transparent) 0%, transparent 28%)",
          }}
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3 text-[color:var(--page-foreground)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
              Step 2 · Discover courses
            </p>
            <h1 className="text-3xl font-semibold leading-tight">
              Find your courses and drop straight into chat.
            </h1>
            <p className="text-sm text-[color:var(--muted)]">
              Search, filter, and sort to locate the right room. Joining moves
              you instantly into the class chat and updates your sidebar in
              real time.
            </p>
            <div className="flex flex-wrap gap-2 text-xs text-[color:var(--muted)]">
              <span className="rounded-full bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] px-3 py-1 font-semibold text-[color:var(--page-foreground)]">
                Guided flow: Landing ? Discover ? Chat
              </span>
              <span className="rounded-full bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] px-3 py-1 font-semibold text-[color:var(--page-foreground)]">
                Live-ready chats
              </span>
              <span className="rounded-full bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] px-3 py-1 font-semibold text-[color:var(--page-foreground)]">
                One-click enrollment
              </span>
            </div>
          </div>
          <div className="grid w-full max-w-md grid-cols-3 gap-3 rounded-2xl bg-[color-mix(in_srgb,var(--card)_85%,transparent)] p-4 text-center text-xs font-semibold text-[color:var(--page-foreground)] shadow-inner backdrop-blur lg:max-w-lg">
            <div className="space-y-1 rounded-xl bg-[color-mix(in_srgb,var(--card-soft)_90%,transparent)] px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
                Step 1
              </p>
              <p>Landing</p>
              <p className="text-[11px] text-[color:var(--muted)]">
                Orientation & next CTA
              </p>
            </div>
            <div className="space-y-1 rounded-xl bg-[var(--card)] px-3 py-2 text-[color:var(--page-foreground)] shadow-md">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
                Step 2
              </p>
              <p>Discover</p>
              <p className="text-[11px] text-[color:var(--muted)]">Filter & Join</p>
            </div>
            <div className="space-y-1 rounded-xl bg-[color-mix(in_srgb,var(--card-soft)_90%,transparent)] px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
                Step 3
              </p>
              <p>Chat</p>
              <p className="text-[11px] text-[color:var(--muted)]">Realtime room</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border-strong)] bg-[var(--card)] p-6 shadow-sm transition-colors">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--muted)]">
              Discover classes
            </p>
            <h2 className="text-xl font-semibold text-[color:var(--page-foreground)]">
              Search, filter, and sort your next chat room.
            </h2>
            <p className="text-sm text-[color:var(--muted)]">
              Click “Join & open chat” to get enrolled immediately and hop into
              the conversation.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <input
              type="text"
              placeholder="Search by course code or name..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--card)] px-3 py-2 text-sm text-[color:var(--page-foreground)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_22%,transparent)] sm:w-64"
            />
            <select
              value={selectedMajor}
              onChange={(event) => setSelectedMajor(event.target.value)}
              className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--card)] px-3 py-2 text-sm text-[color:var(--page-foreground)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_22%,transparent)] sm:w-48"
            >
              <option value="all">All majors</option>
              {majors.map((major) => (
                <option key={major.id} value={major.id}>
                  {major.name}
                </option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortOption)}
              className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--card)] px-3 py-2 text-sm text-[color:var(--page-foreground)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_22%,transparent)] sm:w-44"
            >
              <option value="popularity">Sort: Popularity</option>
              <option value="code">Sort: Course code</option>
              <option value="level">Sort: Level</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </div>
        )}
      </section>

      <div className="space-y-10">
        {groupedByMajor.map((group, groupIndex) => (
          <section key={group.major.id} className="space-y-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[color:var(--page-foreground)]">
                  {group.major.name}
                </h3>
                <p className="text-sm text-[color:var(--muted)]">
                  Curated classes for {group.major.name} students. Hover a card
                  to preview; click once to join and launch chat.
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--card-soft)_70%,transparent)] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--page-foreground)]">
                {group.courses.length} course
                {group.courses.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {group.courses.map((course, index) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  majorName={group.major.name}
                  onJoin={handleJoin}
                  isJoining={joiningId === course.id}
                  accent={accentPalette[(groupIndex + index) % accentPalette.length]}
                />
              ))}
            </div>
          </section>
        ))}

        {groupedByMajor.length === 0 && (
          <div className="rounded-2xl border border-[var(--border-strong)] bg-[var(--card)] p-8 text-center shadow-sm">
            <p className="text-sm font-semibold text-[color:var(--page-foreground)]">
              No classes match your filters yet.
            </p>
            <p className="text-sm text-[color:var(--muted)]">
              Try clearing the search, choosing another major, or sorting by a
              different signal.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
