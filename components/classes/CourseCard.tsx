import Link from "next/link";
import type { Course } from "@/lib/mockData";

type CourseCardProps = {
  course: Course;
  majorName?: string;
  actionLabel?: string;
  href: string;
};

export function CourseCard({
  course,
  majorName,
  actionLabel = "Open Class",
  href,
}: CourseCardProps) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            {course.code}
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {majorName ?? course.majorId.toUpperCase()}
          </span>
        </div>
        <h3 className="text-lg font-semibold text-slate-900">{course.name}</h3>
        <p className="text-sm text-slate-600">Level {course.level}</p>
      </div>
      <div className="pt-4">
        <Link
          href={href}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          {actionLabel}
        </Link>
      </div>
    </div>
  );
}
