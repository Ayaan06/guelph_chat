import type { CourseSummary } from "@/types/chat";

type CourseCardProps = {
  course: CourseSummary;
  majorName?: string;
  onJoin?: (course: CourseSummary) => void;
  isJoining?: boolean;
  accent?: "blue" | "emerald" | "indigo";
};

const accentStyles: Record<
  NonNullable<CourseCardProps["accent"]>,
  string
> = {
  blue: "from-blue-500/70 via-cyan-500/70 to-sky-400/60",
  emerald: "from-emerald-500/70 via-teal-500/70 to-green-400/60",
  indigo: "from-indigo-500/70 via-violet-500/70 to-blue-500/60",
};

export function CourseCard({
  course,
  majorName,
  onJoin,
  isJoining,
  accent = "blue",
}: CourseCardProps) {
  const memberLabel = `${course.memberCount ?? 0} enrolled`;

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm transition hover:-translate-y-1 hover:border-transparent hover:shadow-lg"
      title={`${course.code} — ${course.name}`}
    >
      <div
        className={`absolute inset-x-4 top-0 h-1 rounded-b-full bg-gradient-to-r opacity-70 group-hover:opacity-100 ${accentStyles[accent]}`}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm">
              {course.code}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              {majorName ?? course.major}
            </span>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-700">
              Level {course.level}
            </span>
          </div>
          <h3 className="text-lg font-semibold leading-tight text-slate-900">
            {course.name}
          </h3>
          <p className="text-sm text-slate-600">
            {course.termLabel ?? "Current term"} • {memberLabel}
          </p>
        </div>
        <div className="rounded-full bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-700">
          {memberLabel}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
          <span>Live chat ready</span>
        </div>
        <button
          type="button"
          onClick={() => onJoin?.(course)}
          disabled={isJoining}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:translate-y-[-1px] hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isJoining ? (
            <>
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
              Joining...
            </>
          ) : (
            <>
              <span className="text-base">+</span>
              Join &amp; open chat
            </>
          )}
        </button>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-6 bg-gradient-to-t from-slate-50/90 via-transparent to-transparent opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100" />
    </div>
  );
}
