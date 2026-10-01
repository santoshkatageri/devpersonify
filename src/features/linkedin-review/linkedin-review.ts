import type { CareerEvidenceProfile } from "../../domain/career-evidence-profile";

export interface LinkedInReviewItem {
  kind: "headline" | "summary" | "experience" | "skill" | "project" | "link" | "education" | "certification";
  label: string;
  found: boolean;
}

function normalize(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}+#.]+/gu, " ").replace(/\s+/g, " ").trim();
}

export function reviewLinkedInText(profile: CareerEvidenceProfile, pastedText: string): LinkedInReviewItem[] {
  const haystack = normalize(pastedText);
  const candidates: Array<{ kind: LinkedInReviewItem["kind"]; label: string }> = [
    { kind: "headline", label: profile.careerDirection.professionalHeadline?.value ?? "" },
    { kind: "summary", label: profile.careerDirection.shortIntroduction?.value ?? "" },
    ...profile.experience.map((item) => ({ kind: "experience" as const, label: item.title })),
    ...(profile.education ?? []).flatMap((item) => [item.title, item.organization ?? ""].map((label) => ({ kind: "education" as const, label }))),
    ...(profile.certifications ?? []).map((item) => ({ kind: "certification" as const, label: item.title })),
    ...profile.skills.map((item) => ({ kind: "skill" as const, label: item.name })),
    ...profile.projects.map((item) => ({ kind: "project" as const, label: item.title })),
    ...profile.githubEvidence.repositories.filter((item) => item.selectedForPortfolio || item.selectedForShowcase).map((item) => ({ kind: "project" as const, label: item.name })),
    ...[profile.identity.website?.value, ...profile.professionalLinks.map((item) => item.url)].filter((value): value is string => Boolean(value)).map((label) => ({ kind: "link" as const, label })),
  ];
  const seen = new Set<string>();
  return candidates.flatMap(({ kind, label }) => {
    const needle = normalize(label);
    if (!needle || seen.has(`${kind}:${needle}`)) return [];
    seen.add(`${kind}:${needle}`);
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return [{ kind, label, found: new RegExp(`(^|[^\\p{L}\\p{N}+#])${escaped}($|[^\\p{L}\\p{N}+#])`, "u").test(haystack) }];
  });
}
