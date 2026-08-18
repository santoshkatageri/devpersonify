export const OPEN_FEEDBACK_EVENT = "devpersonify:open-feedback";

export function openFeedbackPanel(): void {
  window.dispatchEvent(new CustomEvent(OPEN_FEEDBACK_EVENT));
}

export type FeedbackArea = "general" | "github_audit" | "github_preparation" | "repository_detail" | "github_readme" | "career_profile" | "resume_builder";
export type FeedbackRating = "great" | "useful" | "needs_work";
export type FeedbackCategory = "bug" | "idea" | "experience";

export interface FeedbackPayload {
  id: string;
  product: "DevPersonify";
  applicationVersion: "0.1.0";
  area: FeedbackArea;
  rating: FeedbackRating;
  category: FeedbackCategory;
  message: string;
  createdAt: string;
  delivery: "LOCAL_LAUNCH_STUB";
}

const STORAGE_KEY = "devpersonify:feedback:v1";

export function feedbackAreaFromPath(pathname: string): FeedbackArea {
  if (/^\/audit\/[^/]+\/repositories\//.test(pathname)) return "repository_detail";
  if (/^\/audit\/[^/]+\/prepare/.test(pathname)) return "github_preparation";
  if (/^\/audit(?:\/|$)/.test(pathname)) return "github_audit";
  if (/^\/career\/[^/]+\/readme/.test(pathname)) return "github_readme";
  if (/^\/career\/[^/]+\/resume/.test(pathname)) return "resume_builder";
  if (/^\/career(?:\/|$)/.test(pathname)) return "career_profile";
  return "general";
}

export function feedbackQuestion(area: FeedbackArea): string {
  const questions: Record<FeedbackArea, string> = {
    general: "How was your DevPersonify experience?",
    github_audit: "Did this audit help you understand your repositories?",
    github_preparation: "Did GitHub preparation help you decide what represents you?",
    repository_detail: "Was the repository evidence trace clear?",
    github_readme: "How useful was the README builder?",
    career_profile: "Does this profile represent your experience accurately?",
    resume_builder: "Was the resume export useful?",
  };
  return questions[area];
}

export function createFeedbackPayload(area: FeedbackArea, rating: FeedbackRating, category: FeedbackCategory, message: string, now = new Date().toISOString()): FeedbackPayload {
  return { id: `feedback:${crypto.randomUUID()}`, product: "DevPersonify", applicationVersion: "0.1.0", area, rating, category, message: message.trim().slice(0, 2000), createdAt: now, delivery: "LOCAL_LAUNCH_STUB" };
}

export function saveFeedbackLocally(payload: FeedbackPayload): boolean {
  try {
    const current: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    const items = Array.isArray(current) ? current.filter((item) => item && typeof item === "object") : [];
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...items.slice(-19), payload]));
    return true;
  } catch { return false; }
}

export function loadLocalFeedback(): FeedbackPayload[] {
  try { const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); return Array.isArray(value) ? value as FeedbackPayload[] : []; }
  catch { return []; }
}
