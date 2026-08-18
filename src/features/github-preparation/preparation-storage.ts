import { createPreparationState, PREPARATION_STORAGE_VERSION, type PreparationState } from "./preparation";

const STORAGE_PREFIX = "devpersonify:preparation:v1:";

function key(username: string): string {
  return `${STORAGE_PREFIX}${username.toLowerCase()}`;
}

export function loadPreparationState(username: string): PreparationState {
  const fallback = createPreparationState(username);
  try {
    const raw = localStorage.getItem(key(username));
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return fallback;
    const candidate = parsed as Partial<PreparationState>;
    if (candidate.version !== PREPARATION_STORAGE_VERSION || candidate.username?.toLowerCase() !== username.toLowerCase()) return fallback;
    return {
      ...fallback,
      ...candidate,
      version: PREPARATION_STORAGE_VERSION,
      username,
      repositories: candidate.repositories && typeof candidate.repositories === "object" ? candidate.repositories : {},
      portfolioOrder: Array.isArray(candidate.portfolioOrder) ? candidate.portfolioOrder.filter((id): id is string => typeof id === "string") : [],
      profile: { ...fallback.profile, ...(candidate.profile ?? {}) },
      readmeSections: { ...fallback.readmeSections, ...(candidate.readmeSections ?? {}) },
    };
  } catch {
    return fallback;
  }
}

export function savePreparationState(state: PreparationState): boolean {
  try {
    localStorage.setItem(key(state.username), JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
