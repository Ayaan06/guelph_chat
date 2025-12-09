"use client";

import { useState } from "react";
import type { Major, UserProfile } from "@/lib/mockData";

type ProfileFormProps = {
  initialProfile: UserProfile;
  majors: Major[];
};

export function ProfileForm({ initialProfile, majors }: ProfileFormProps) {
  const [name, setName] = useState(initialProfile.name);
  const [majorId, setMajorId] = useState(initialProfile.majorId);
  const [year, setYear] = useState(initialProfile.year);
  const [interests, setInterests] = useState(
    initialProfile.interests.join(", "),
  );
  const [saved, setSaved] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Profile</h2>
        <p className="text-sm text-slate-600">
          Update how classmates see you. Changes are saved locally for now.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-900">Name</label>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            placeholder="Your name"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-900">Major</label>
          <select
            value={majorId}
            onChange={(event) => setMajorId(event.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          >
            {majors.map((major) => (
              <option key={major.id} value={major.id}>
                {major.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-900">Year</label>
          <input
            type="text"
            value={year}
            onChange={(event) => setYear(event.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            placeholder="e.g. 3rd Year"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-900">
            Interests
          </label>
          <input
            type="text"
            value={interests}
            onChange={(event) => setInterests(event.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            placeholder="Separate with commas"
          />
          <p className="text-xs text-slate-600">
            Example: Systems, AI, Design, Study groups
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          Save changes
        </button>
        {saved && (
          <span className="text-sm font-semibold text-green-600">
            Profile saved (mock).
          </span>
        )}
      </div>
    </form>
  );
}
