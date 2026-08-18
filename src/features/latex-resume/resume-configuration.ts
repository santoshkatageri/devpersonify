import { CLASSIC_TEMPLATE_ID, CLASSIC_TEMPLATE_VERSION, LATEX_RESUME_CONFIG_VERSION, type LatexResumeConfiguration, type ResumePresentationOverride, type ResumeSectionKey, type ResumeSelectableItem, type SelectableContentType } from "../../domain/latex-resume";
import type { CareerEvidenceProfile, EvidenceProvenance } from "../../domain/career-evidence-profile";

export const DEFAULT_RESUME_SECTIONS: Array<{ key: ResumeSectionKey; label: string }> = [
  { key: "header", label: "Header" }, { key: "summary", label: "Summary" }, { key: "experience", label: "Experience" },
  { key: "skills", label: "Skills" }, { key: "projects", label: "Selected Projects" }, { key: "education", label: "Education" },
  { key: "certifications", label: "Certifications" }, { key: "achievements", label: "Achievements" }, { key: "openSource", label: "Open Source" }, { key: "links", label: "Links" },
];

function sources(values: Array<{ source: EvidenceProvenance }>): EvidenceProvenance[] {
  return [...new Set(values.map((value) => value.source))];
}

export function selectableResumeContent(profile: CareerEvidenceProfile): Record<SelectableContentType, ResumeSelectableItem[]> {
  const records = (type: Exclude<SelectableContentType, "skills" | "projects" | "links">, items: CareerEvidenceProfile[typeof type]): ResumeSelectableItem[] =>
    items.map((item) => ({ id: item.id, type, title: item.title, ...(item.organization ? { subtitle: item.organization } : {}), ...(item.description ? { description: item.description } : {}), provenance: sources(item.provenance) }));
  const projects: ResumeSelectableItem[] = [
    ...profile.projects.map((item) => ({ id: item.id, type: "projects" as const, title: item.title, ...(item.organization ? { subtitle: item.organization } : {}), ...(item.description ? { description: item.description } : {}), provenance: sources(item.provenance) })),
    ...profile.githubEvidence.repositories.map((item) => ({ id: item.repositoryId, type: "projects" as const, title: item.name, ...(item.language ? { subtitle: item.language } : {}), ...(item.description ? { description: item.description } : {}), provenance: ["GITHUB_OBSERVED" as const] })),
  ];
  const links: ResumeSelectableItem[] = [
    ...profile.professionalLinks.map((item) => ({ id: item.id, type: "links" as const, title: item.title, ...(item.url ? { description: item.url } : {}), provenance: sources(item.provenance) })),
    ...([profile.identity.website, profile.identity.linkedin, profile.identity.email].filter(Boolean).map((item) => ({ id: item!.id, type: "links" as const, title: item!.id === profile.identity.email?.id ? "Email" : item!.id === profile.identity.linkedin?.id ? "LinkedIn" : "Website", description: Array.isArray(item!.value) ? item!.value.join(", ") : item!.value, provenance: sources(item!.provenance) }))),
    ...(profile.githubEvidence.profileUrl ? [{ id: `github:profile:${profile.username}`, type: "links" as const, title: "GitHub", description: profile.githubEvidence.profileUrl, provenance: ["GITHUB_OBSERVED" as const] }] : []),
  ];
  return {
    experience: records("experience", profile.experience),
    skills: profile.skills.map((item) => ({ id: item.id, type: "skills", title: item.name, subtitle: item.githubRepositoryIds.length ? `Observed in ${item.githubRepositoryIds.length} selected GitHub ${item.githubRepositoryIds.length === 1 ? "repository" : "repositories"}` : "Public GitHub evidence not detected", provenance: [...new Set([...item.provenance.map((value) => value.source), ...(item.githubRepositoryIds.length ? ["GITHUB_OBSERVED" as const] : [])])] })),
    projects,
    education: records("education", profile.education),
    certifications: records("certifications", profile.certifications),
    achievements: records("achievements", profile.achievements),
    links,
  };
}

export function createLatexResumeConfiguration(profile: CareerEvidenceProfile, now = new Date().toISOString()): LatexResumeConfiguration {
  const content = selectableResumeContent(profile);
  return {
    schemaVersion: LATEX_RESUME_CONFIG_VERSION,
    username: profile.username,
    templateId: CLASSIC_TEMPLATE_ID,
    templateVersion: CLASSIC_TEMPLATE_VERSION,
    updatedAt: now,
    sections: DEFAULT_RESUME_SECTIONS.map((section) => ({ ...section, enabled: true })),
    selections: {
      experience: content.experience.map((item) => item.id), skills: content.skills.map((item) => item.id), projects: content.projects.map((item) => item.id),
      education: content.education.map((item) => item.id), certifications: content.certifications.map((item) => item.id), achievements: content.achievements.map((item) => item.id), links: content.links.map((item) => item.id),
    },
    overrides: {},
  };
}

export function reconcileLatexResumeConfiguration(config: LatexResumeConfiguration, profile: CareerEvidenceProfile): LatexResumeConfiguration {
  const content = selectableResumeContent(profile);
  const valid = (type: SelectableContentType) => new Set(content[type].map((item) => item.id));
  const knownSections = new Map(config.sections.map((section) => [section.key, section]));
  const sections = [
    ...config.sections.filter((section) => DEFAULT_RESUME_SECTIONS.some((candidate) => candidate.key === section.key)),
    ...DEFAULT_RESUME_SECTIONS.filter((section) => !knownSections.has(section.key)).map((section) => ({ ...section, enabled: true })),
  ];
  return {
    ...config,
    username: profile.username,
    templateId: CLASSIC_TEMPLATE_ID,
    templateVersion: CLASSIC_TEMPLATE_VERSION,
    sections,
    selections: Object.fromEntries((Object.keys(config.selections) as SelectableContentType[]).map((type) => [type, config.selections[type].filter((item) => valid(type).has(item))])) as LatexResumeConfiguration["selections"],
  };
}

export function toggleResumeSection(config: LatexResumeConfiguration, key: ResumeSectionKey, enabled: boolean, now = new Date().toISOString()): LatexResumeConfiguration {
  return { ...config, updatedAt: now, sections: config.sections.map((section) => section.key === key ? { ...section, enabled } : section) };
}

export function moveResumeSection(config: LatexResumeConfiguration, key: ResumeSectionKey, direction: -1 | 1, now = new Date().toISOString()): LatexResumeConfiguration {
  const index = config.sections.findIndex((section) => section.key === key);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= config.sections.length) return config;
  const sections = [...config.sections];
  [sections[index], sections[nextIndex]] = [sections[nextIndex]!, sections[index]!];
  return { ...config, updatedAt: now, sections };
}

export function setContentSelected(config: LatexResumeConfiguration, type: SelectableContentType, id: string, selected: boolean, now = new Date().toISOString()): LatexResumeConfiguration {
  const current = config.selections[type];
  return { ...config, updatedAt: now, selections: { ...config.selections, [type]: selected ? (current.includes(id) ? current : [...current, id]) : current.filter((item) => item !== id) } };
}

export function moveSelectedContent(config: LatexResumeConfiguration, type: SelectableContentType, id: string, direction: -1 | 1, now = new Date().toISOString()): LatexResumeConfiguration {
  const current = [...config.selections[type]];
  const index = current.indexOf(id);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return config;
  [current[index], current[nextIndex]] = [current[nextIndex]!, current[index]!];
  return { ...config, updatedAt: now, selections: { ...config.selections, [type]: current } };
}

export function setResumeOverride(config: LatexResumeConfiguration, key: string, value: string, now = new Date().toISOString()): LatexResumeConfiguration {
  const override: ResumePresentationOverride = { key, value, source: "USER_PROVIDED", updatedAt: now };
  return { ...config, updatedAt: now, overrides: { ...config.overrides, [key]: override } };
}

export function resetResumeOverride(config: LatexResumeConfiguration, key: string, now = new Date().toISOString()): LatexResumeConfiguration {
  const overrides = { ...config.overrides };
  delete overrides[key];
  return { ...config, updatedAt: now, overrides };
}

export function presentationValue(config: LatexResumeConfiguration, key: string, source: string): string {
  return config.overrides[key]?.value ?? source;
}
