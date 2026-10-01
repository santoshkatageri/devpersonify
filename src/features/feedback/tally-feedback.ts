import type { FeedbackArea } from "./feedback";

// This is a public form identifier, never an API token or Google credential.
export function tallyFeedbackFormId(): string | null {
  const value = (import.meta.env.VITE_TALLY_FEEDBACK_FORM_ID ?? "PdVrRd").trim();
  return value && /^[a-zA-Z0-9]{3,64}$/.test(value) ? value : null;
}

export function tallyFeedbackUrl(formId: string, area: FeedbackArea, embed = false): string {
  const url = new URL(`https://tally.so/${embed ? "embed" : "r"}/${encodeURIComponent(formId)}`);
  url.searchParams.set("product", "DevPersonify");
  url.searchParams.set("area", area);
  url.searchParams.set("source", "app");
  if (embed) {
    url.searchParams.set("hideTitle", "1");
    url.searchParams.set("alignLeft", "1");
  }
  return url.toString();
}
