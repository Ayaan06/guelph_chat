"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Major, UserProfile } from "@/lib/mockData";
import { YEAR_OPTIONS, parseInterestsInput } from "@/lib/profile";

type ProfileFormProps = {
  initialProfile: UserProfile;
  majors: Major[];
};

export function ProfileForm({ initialProfile, majors }: ProfileFormProps) {
  const router = useRouter();

  const [name, setName] = useState(initialProfile.name);
  const [majorId, setMajorId] = useState(initialProfile.majorId ?? "");
  const [year, setYear] = useState(initialProfile.year ?? "");
  const [interests, setInterests] = useState(
    initialProfile.interests?.join(", ") ?? "",
  );
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError(null);
    setStatus("saving");

    const interestsList = parseInterestsInput(interests);

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          majorId,
          year,
          interests: interestsList,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to save profile");
      }

      const profile = payload?.profile as
        | (UserProfile & { email?: string | null })
        | undefined;

      if (profile) {
        setName(profile.name ?? "");
        setMajorId(profile.majorId ?? "");
        setYear(profile.year ?? "");
        setInterests(profile.interests?.join(", ") ?? "");
      }

      setStatus("saved");
      router.refresh();
      setTimeout(() => setStatus("idle"), 2500);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to save profile";
      setStatus("error");
      setError(message);
    }
  };

  const isSaving = status === "saving";

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Profile</h2>
        <p className="text-sm text-slate-600">
          Update how classmates see you. Changes are saved to your account.
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
            <option value="">Select your major</option>
            {majors.map((major) => (
              <option key={major.id} value={major.id}>
                {major.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-900">Year</label>
          <select
            value={year}
            onChange={(event) => setYear(event.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">Select your year</option>
            {YEAR_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          {isSaving ? "Saving..." : "Save changes"}
        </button>
        {status === "saved" && (
          <span className="text-sm font-semibold text-green-600">
            Profile saved.
          </span>
        )}
        {error ? (
          <span className="text-sm font-semibold text-red-600">{error}</span>
        ) : null}
      </div>
    </form>
  );
}
