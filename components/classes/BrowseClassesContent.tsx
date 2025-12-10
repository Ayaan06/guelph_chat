"use client";

import { useMemo, useState } from "react";
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

export function BrowseClassesContent({
  majors,
  courses,
}: BrowseClassesContentProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMajor, setSelectedMajor] = useState<string>("all");

  const filteredCourses = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return courses.filter((course) => {
      const matchesMajor =
        selectedMajor === "all" || course.major === selectedMajor;
      const matchesQuery =
        query.length === 0 ||
        course.code.toLowerCase().includes(query) ||
        course.name.toLowerCase().includes(query);
      return matchesMajor && matchesQuery;
    });
  }, [courses, searchTerm, selectedMajor]);

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

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Browse Classes
            </h1>
            <p className="text-sm text-slate-600">
              Select a class to join its chat and meet your classmates.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              placeholder="Search by course code or name..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 sm:w-72"
            />
            <select
              value={selectedMajor}
              onChange={(event) => setSelectedMajor(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 sm:w-52"
            >
              <option value="all">All majors</option>
              {majors.map((major) => (
                <option key={major.id} value={major.id}>
                  {major.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {groupedByMajor.map((group) => (
          <section key={group.major.id} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {group.major.name}
                </h2>
                <p className="text-sm text-slate-600">
                  Classes available for {group.major.name} students.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {group.courses.length} course
                {group.courses.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {group.courses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  majorName={group.major.name}
                  actionLabel="Join class chat"
                  href={`/classes/${encodeURIComponent(course.id)}`}
                />
              ))}
            </div>
          </section>
        ))}

        {groupedByMajor.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-900">
              No classes match your filters yet.
            </p>
            <p className="text-sm text-slate-600">
              Try clearing the search or choosing another major.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
