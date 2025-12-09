import { majors } from "./mockData";

export const YEAR_OPTIONS = [
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
  "Graduate",
  "Other",
] as const;

export const validMajorIds = new Set(majors.map((major) => major.id));
export const validYearOptions = new Set(YEAR_OPTIONS);

export function parseInterestsInput(input: string): string[] {
  return input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((interest) => interest.slice(0, 100))
    .slice(0, 10);
}

export function normalizeInterestsList(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((item) => (typeof item === "string" ? item : String(item ?? "")))
    .map((item) => item.trim())
    .filter(Boolean)
    .map((interest) => interest.slice(0, 100))
    .slice(0, 10);
}
