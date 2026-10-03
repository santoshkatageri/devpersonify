/** Unknown versions and damaged drafts remain untouched until an explicit reset. */
export type SavedDraft<T> =
  | { status: "ready"; value: T; raw: string }
  | { status: "missing" | "unavailable"; value: null; raw: null }
  | { status: "invalid" | "unsupported"; value: null; raw: string };
export const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
export const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === "string");
export const fields = (value: unknown, names: readonly string[], type: "string" | "boolean"): boolean => record(value) && names.every((name) => typeof value[name] === type);
export function readSavedDraft<T>(key: string, version: number, validate: (value: unknown) => value is T): SavedDraft<T> {
  let raw: string | null;
  try { raw = localStorage.getItem(key); } catch { return { status: "unavailable", value: null, raw: null }; }
  if (raw === null) return { status: "missing", value: null, raw: null };
  try {
    const value: unknown = JSON.parse(raw);
    if (record(value) && typeof value.schemaVersion === "number" && value.schemaVersion !== version) return { status: "unsupported", value: null, raw };
    return validate(value) ? { status: "ready", value, raw } : { status: "invalid", value: null, raw };
  } catch { return { status: "invalid", value: null, raw }; }
}
export function writeSavedDraft<T>(key: string, value: T, read: () => SavedDraft<T>, validate: (value: unknown) => value is T): boolean {
  if (!validate(value)) return false;
  const existing = read();
  if (existing.status === "invalid" || existing.status === "unsupported") return false;
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}
/** A single setItem is atomic on quota failure; never remove the original first. */
export function replaceSavedDraft<T>(key: string, value: T, original: string, validate: (value: unknown) => value is T): boolean {
  if (!validate(value)) return false;
  try {
    if (localStorage.getItem(key) !== original) return false;
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch { return false; }
}
