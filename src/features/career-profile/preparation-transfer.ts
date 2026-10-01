import type { CareerEvidenceProfile, EvidenceValue, ProvenanceRef } from "../../domain/career-evidence-profile";
import type { PreparationState, ProfileInput } from "../github-preparation/preparation";

const normalize = (value: string) => value.trim().toLowerCase().replace(/[._-]+/g, " ").replace(/\s+/g, " ");
const split = (value: string) => value.split(/[,;\n]/).map((part) => part.trim()).filter(Boolean);

// Preparation owns only the values it introduced. Career-profile edits win.
export function transferPreparation(profile: CareerEvidenceProfile, preparation: PreparationState, now: string): CareerEvidenceProfile {
  const next = { ...profile, identity: { ...profile.identity }, careerDirection: { ...profile.careerDirection } };
  const mappings: Array<[keyof ProfileInput, "identity" | "careerDirection", string]> = [
    ["professionalHeadline", "careerDirection", "professionalHeadline"], ["currentFocus", "careerDirection", "careerDirection"],
    ["targetRoles", "careerDirection", "targetRole"], ["shortIntroduction", "careerDirection", "shortIntroduction"],
    ["preferredTechnologies", "careerDirection", "preferredTechnologies"], ["location", "identity", "location"],
    ["website", "identity", "website"], ["linkedinUrl", "identity", "linkedin"], ["email", "identity", "email"],
  ];
  const sources: ProvenanceRef[] = [];
  for (const [input, group, key] of mappings) {
    const sourceId = `preparation:profile:${input}`;
    const fields = next[group] as Record<string, EvidenceValue<string | string[]> | undefined>;
    const existing = fields[key];
    const owned = existing?.provenance.every((source) => source.sourceId === sourceId);
    if (existing && !owned && existing.provenance.some((source) => source.source !== "GITHUB_OBSERVED")) continue;
    const value = preparation.profile[input].trim();
    if (!value) { if (owned) delete fields[key]; continue; }
    const source: ProvenanceRef = { source: "USER_PROVIDED", sourceId, observedAt: now, note: "Entered in GitHub preparation" };
    sources.push(source);
    fields[key] = { id: existing?.id ?? `value:${crypto.randomUUID()}`, value: input === "preferredTechnologies" ? split(value) : value, provenance: [source], updatedAt: now };
  }
  const skillSourceId = "preparation:additionalSkills";
  const previousSkills = profile.skills;
  next.skills = previousSkills.map((skill) => ({ ...skill, provenance: skill.provenance.filter((source) => source.sourceId !== skillSourceId) })).filter((skill) => skill.provenance.length);
  for (const name of split(preparation.profile.additionalSkills)) {
    const normalizedName = normalize(name);
    const existing = next.skills.find((skill) => skill.normalizedName === normalizedName);
    if (existing?.provenance.some((source) => source.sourceId === skillSourceId)) continue;
    const source: ProvenanceRef = { source: "USER_PROVIDED", sourceId: skillSourceId, observedAt: now, note: "Entered in GitHub preparation" };
    if (existing) existing.provenance.push(source);
    else next.skills.push({ id: previousSkills.find((skill) => skill.normalizedName === normalizedName)?.id ?? `skill:${crypto.randomUUID()}`, name, normalizedName, provenance: [source], githubRepositoryIds: [], updatedAt: now });
  }
  next.userProvided = [...profile.userProvided.filter((source) => !source.sourceId.startsWith("preparation:")), ...sources];
  if (next.skills.some((skill) => skill.provenance.some((source) => source.sourceId === skillSourceId))) next.userProvided.push({ source: "USER_PROVIDED", sourceId: skillSourceId, observedAt: now });
  return next;
}
