import { CAREER_EVIDENCE_SCHEMA_VERSION, type CareerEvidenceDerived, type CareerEvidenceProfile, type CareerRecord, type CareerSection, type EvidenceComparison, type EvidenceProvenance, type EvidenceValue, type GitHubCareerEvidence, type ProvenanceRef, type ResumeDocumentEvidence, type ResumeReviewItem, type SkillEvidence } from "../../domain/career-evidence-profile";
import type { GitHubAudit } from "../github-audit/run-audit";
import { getPreference, type PreparationState } from "../github-preparation/preparation";

function id(prefix: string): string {
  return `${prefix}:${crypto.randomUUID()}`;
}

function provenance(source: EvidenceProvenance, sourceId: string, now: string, note?: string): ProvenanceRef {
  return { source, sourceId, observedAt: now, ...(note ? { note } : {}) };
}

function evidenceValue(value: string, source: EvidenceProvenance, sourceId: string, now: string): EvidenceValue<string> {
  return { id: id("value"), value, provenance: [provenance(source, sourceId, now)], updatedAt: now };
}

export function githubEvidenceFromAudit(audit: GitHubAudit, preparation: PreparationState): GitHubCareerEvidence {
  const observedAt = audit.auditAt;
  const selectedIds = new Set(preparation.portfolioOrder.filter((repositoryId) => getPreference(preparation, repositoryId).selectedForPortfolio));
  const hasSelections = selectedIds.size > 0;
  const repositories = audit.repositories
    .filter(({ repository, result }) => hasSelections ? selectedIds.has(repository.id) : result.classification === "SHOWCASE")
    .map(({ repository }) => {
      const preference = getPreference(preparation, repository.id);
      return {
        repositoryId: repository.id,
        name: repository.name,
        url: repository.url,
        topics: repository.topics,
        isFork: repository.isFork,
        selectedForPortfolio: preference.selectedForPortfolio,
        selectedForShowcase: preference.selectedForShowcase,
        provenance: provenance("GITHUB_OBSERVED", repository.id, observedAt, "Public GitHub repository metadata"),
        ...(repository.description ? { description: repository.description } : {}),
        ...(repository.primaryLanguage ? { language: repository.primaryLanguage } : {}),
        ...(repository.pushedAt ? { pushedAt: repository.pushedAt } : {}),
      };
    });
  return {
    username: audit.user.login,
    profileUrl: audit.user.htmlUrl,
    observedAt,
    repositories,
    ...(audit.user.name ? { displayName: audit.user.name } : {}),
    ...(audit.user.bio ? { bio: audit.user.bio } : {}),
    ...(audit.user.location ? { location: audit.user.location } : {}),
    ...(audit.user.blog ? { website: audit.user.blog } : {}),
  };
}

export function createCareerEvidenceProfile(audit: GitHubAudit, preparation: PreparationState, now = new Date().toISOString()): CareerEvidenceProfile {
  const githubEvidence = githubEvidenceFromAudit(audit, preparation);
  const profile: CareerEvidenceProfile = {
    schemaVersion: CAREER_EVIDENCE_SCHEMA_VERSION,
    id: `career:${audit.user.login.toLowerCase()}`,
    username: audit.user.login,
    createdAt: now,
    updatedAt: now,
    identity: {
      ...(audit.user.name ? { name: evidenceValue(audit.user.name, "GITHUB_OBSERVED", `github:user:${audit.user.id}`, audit.auditAt) } : {}),
      ...(audit.user.location ? { location: evidenceValue(audit.user.location, "GITHUB_OBSERVED", `github:user:${audit.user.id}`, audit.auditAt) } : {}),
      ...(audit.user.blog ? { website: evidenceValue(audit.user.blog, "GITHUB_OBSERVED", `github:user:${audit.user.id}`, audit.auditAt) } : {}),
    },
    careerDirection: {},
    experience: [], education: [], skills: [], projects: [], certifications: [], achievements: [], professionalLinks: [], other: [],
    githubEvidence,
    resumeReview: [],
    userProvided: [],
    derived: emptyDerived(now),
    sectionPreferences: { headline: true, summary: true, experience: true, selectedProjects: true, skills: true, education: true, certifications: true, achievements: true, links: true },
  };
  return deriveCareerEvidence(profile, now);
}

function emptyDerived(now: string): CareerEvidenceDerived {
  return { comparisons: [], completeness: [], sourceCoverage: { github: "NONE", resume: "NONE", userProvided: "NONE", crossSourceSupport: 0, potentialGaps: 0 }, generatedAt: now };
}

export function attachResume(profile: CareerEvidenceProfile, document: ResumeDocumentEvidence, items: ResumeReviewItem[], now = new Date().toISOString()): CareerEvidenceProfile {
  return deriveCareerEvidence({ ...profile, updatedAt: now, resumeEvidence: document, resumeReview: items }, now);
}

export function editReviewItem(profile: CareerEvidenceProfile, itemId: string, changes: Partial<Pick<ResumeReviewItem, "title" | "organization" | "description" | "startDate" | "endDate" | "technologies" | "url">>, now = new Date().toISOString()): CareerEvidenceProfile {
  const resumeReview = profile.resumeReview.map((item) => item.id === itemId ? { ...item, ...changes, provenance: provenance("USER_PROVIDED", item.provenance.sourceId, now, "Edited during resume review") } : item);
  return deriveCareerEvidence({ ...profile, updatedAt: now, resumeReview }, now);
}

export function removeReviewItem(profile: CareerEvidenceProfile, itemId: string, now = new Date().toISOString()): CareerEvidenceProfile {
  const resumeReview = profile.resumeReview.filter((item) => item.id !== itemId);
  return deriveCareerEvidence({ ...profile, updatedAt: now, resumeReview }, now);
}

export function addManualReviewItem(profile: CareerEvidenceProfile, section: CareerSection, now = new Date().toISOString()): CareerEvidenceProfile {
  const item: ResumeReviewItem = { id: id("review"), section, title: "", organization: "", description: "", startDate: "", endDate: "", technologies: [], url: "", status: "PENDING", provenance: provenance("USER_PROVIDED", id("manual"), now) };
  return { ...profile, updatedAt: now, resumeReview: [...profile.resumeReview, item] };
}

function recordFromItem(item: ResumeReviewItem, now: string): CareerRecord {
  return {
    id: id(item.section), title: item.title || item.description || "Untitled item", technologies: item.technologies,
    provenance: [item.provenance], updatedAt: now,
    ...(item.organization ? { organization: item.organization } : {}), ...(item.description ? { description: item.description } : {}),
    ...(item.startDate ? { startDate: item.startDate } : {}), ...(item.endDate ? { endDate: item.endDate } : {}), ...(item.url ? { url: item.url } : {}),
  };
}

function normalizeSkill(value: string): string {
  return value.trim().toLowerCase().replace(/[._-]+/g, " ").replace(/\s+/g, " ");
}

export function acceptReviewItem(profile: CareerEvidenceProfile, itemId: string, now = new Date().toISOString()): CareerEvidenceProfile {
  const item = profile.resumeReview.find((candidate) => candidate.id === itemId);
  if (!item || item.status === "ACCEPTED") return profile;
  const resumeReview = profile.resumeReview.map((candidate) => candidate.id === itemId ? { ...candidate, status: "ACCEPTED" as const } : candidate);
  let next: CareerEvidenceProfile = { ...profile, updatedAt: now, resumeReview };
  if (item.section === "skills") {
    const normalizedName = normalizeSkill(item.title);
    if (normalizedName) {
      const existing = next.skills.find((skill) => skill.normalizedName === normalizedName);
      const source = item.provenance;
      const skills: SkillEvidence[] = existing
        ? next.skills.map((skill) => skill.id === existing.id ? { ...skill, provenance: [...skill.provenance, source], updatedAt: now } : skill)
        : [...next.skills, { id: id("skill"), name: item.title.trim(), normalizedName, provenance: [source], githubRepositoryIds: [], updatedAt: now }];
      next = { ...next, skills };
    }
  } else {
    const record = recordFromItem(item, now);
    const key = item.section;
    next = { ...next, [key]: [...next[key], record] } as CareerEvidenceProfile;
  }
  return deriveCareerEvidence(next, now);
}

export function updateProfileField(profile: CareerEvidenceProfile, group: "identity" | "careerDirection", key: string, value: string | string[], now = new Date().toISOString()): CareerEvidenceProfile {
  const sourceId = `user:${group}:${key}`;
  const existing = (profile[group] as Record<string, EvidenceValue<string | string[]> | undefined>)[key];
  const source = provenance("USER_PROVIDED", sourceId, now);
  const field = { id: existing?.id ?? id("value"), value, provenance: [source], updatedAt: now };
  const userProvided = profile.userProvided.some((item) => item.sourceId === sourceId) ? profile.userProvided.map((item) => item.sourceId === sourceId ? source : item) : [...profile.userProvided, source];
  const next = { ...profile, updatedAt: now, [group]: { ...profile[group], [key]: field }, userProvided } as CareerEvidenceProfile;
  return deriveCareerEvidence(next, now);
}

export function updateAcceptedRecord(profile: CareerEvidenceProfile, section: Exclude<CareerSection, "skills">, recordId: string, changes: Partial<CareerRecord>, now = new Date().toISOString()): CareerEvidenceProfile {
  const records = profile[section].map((record) => record.id === recordId ? { ...record, ...changes, provenance: [provenance("USER_PROVIDED", record.id, now, "Edited after acceptance")], updatedAt: now } : record);
  return deriveCareerEvidence({ ...profile, updatedAt: now, [section]: records } as CareerEvidenceProfile, now);
}

export function clearGitHubEvidence(profile: CareerEvidenceProfile, now = new Date().toISOString()): CareerEvidenceProfile {
  const keepNonGitHubValue = <T,>(value: EvidenceValue<T> | undefined): EvidenceValue<T> | undefined => {
    if (!value) return undefined;
    const retained = value.provenance.filter((source) => source.source !== "GITHUB_OBSERVED");
    return retained.length ? { ...value, provenance: retained } : undefined;
  };
  const identity = {
    ...(keepNonGitHubValue(profile.identity.name) ? { name: keepNonGitHubValue(profile.identity.name)! } : {}),
    ...(keepNonGitHubValue(profile.identity.location) ? { location: keepNonGitHubValue(profile.identity.location)! } : {}),
    ...(keepNonGitHubValue(profile.identity.email) ? { email: keepNonGitHubValue(profile.identity.email)! } : {}),
    ...(keepNonGitHubValue(profile.identity.website) ? { website: keepNonGitHubValue(profile.identity.website)! } : {}),
    ...(keepNonGitHubValue(profile.identity.linkedin) ? { linkedin: keepNonGitHubValue(profile.identity.linkedin)! } : {}),
    ...(keepNonGitHubValue(profile.identity.otherInformation) ? { otherInformation: keepNonGitHubValue(profile.identity.otherInformation)! } : {}),
  };
  return deriveCareerEvidence({ ...profile, identity, githubEvidence: { username: "", profileUrl: "", observedAt: now, repositories: [] }, updatedAt: now }, now);
}

export function clearResumeEvidence(profile: CareerEvidenceProfile, now = new Date().toISOString()): CareerEvidenceProfile {
  const keepRecord = (record: CareerRecord) => record.provenance.some((source) => source.source !== "RESUME_PROVIDED");
  const skills = profile.skills.map((skill) => ({ ...skill, provenance: skill.provenance.filter((source) => source.source !== "RESUME_PROVIDED") })).filter((skill) => skill.provenance.length);
  const next: CareerEvidenceProfile = {
    ...profile, updatedAt: now, resumeReview: [], skills,
    experience: profile.experience.filter(keepRecord), education: profile.education.filter(keepRecord), projects: profile.projects.filter(keepRecord),
    certifications: profile.certifications.filter(keepRecord), achievements: profile.achievements.filter(keepRecord), professionalLinks: profile.professionalLinks.filter(keepRecord), other: profile.other.filter(keepRecord),
  };
  delete next.resumeEvidence;
  return deriveCareerEvidence(next, now);
}

function githubSkillMap(profile: CareerEvidenceProfile): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const repository of profile.githubEvidence.repositories) {
    const values = [repository.language, ...repository.topics].filter((value): value is string => Boolean(value));
    for (const value of values) {
      const normalized = normalizeSkill(value);
      map.set(normalized, [...new Set([...(map.get(normalized) ?? []), repository.repositoryId])]);
    }
  }
  return map;
}

export function deriveCareerEvidence(profile: CareerEvidenceProfile, now = new Date().toISOString()): CareerEvidenceProfile {
  const githubSkills = githubSkillMap(profile);
  const comparisons: EvidenceComparison[] = [];
  const skills = profile.skills.map((skill) => {
    const repositoryIds = githubSkills.get(skill.normalizedName) ?? [];
    const hasResume = skill.provenance.some((source) => source.source === "RESUME_PROVIDED");
    const result = repositoryIds.length ? "MULTIPLE_SOURCE_SUPPORT" : "RESUME_ONLY";
    comparisons.push({ id: `comparison:skill:${skill.normalizedName}`, subject: skill.name, result, explanation: repositoryIds.length ? `Observed in ${repositoryIds.length} selected public ${repositoryIds.length === 1 ? "repository" : "repositories"} and listed in accepted resume evidence.` : "Listed in accepted resume evidence; relevant public GitHub evidence was not detected.", provenance: provenance("DERIVED", skill.id, now), githubRepositoryIds: repositoryIds });
    return { ...skill, githubRepositoryIds: repositoryIds, provenance: hasResume ? skill.provenance : skill.provenance, updatedAt: now };
  });
  for (const [normalized, repositoryIds] of githubSkills) {
    if (!skills.some((skill) => skill.normalizedName === normalized)) comparisons.push({ id: `comparison:github:${normalized}`, subject: normalized, result: "GITHUB_ONLY", explanation: `Observed in ${repositoryIds.length} selected public ${repositoryIds.length === 1 ? "repository" : "repositories"}; not listed in accepted resume skills.`, provenance: provenance("DERIVED", repositoryIds[0] ?? "github", now), githubRepositoryIds: repositoryIds });
  }
  for (const repository of profile.githubEvidence.repositories) {
    const represented = profile.projects.some((project) => `${project.title} ${project.description ?? ""}`.toLowerCase().includes(repository.name.toLowerCase()));
    if (!represented) comparisons.push({ id: `comparison:project:${repository.repositoryId}`, subject: repository.name, result: "POTENTIAL_RESUME_OPPORTUNITY", explanation: "Selected GitHub project is not represented in accepted resume projects. It may be a resume opportunity; nothing is added automatically.", provenance: provenance("DERIVED", repository.repositoryId, now), githubRepositoryIds: [repository.repositoryId] });
  }
  const completeness = [
    { key: "identity", label: "Identity", complete: Boolean(profile.identity.name), explanation: profile.identity.name ? "Name evidence is available." : "Name not provided or observed." },
    { key: "github", label: "GitHub", complete: Boolean(profile.githubEvidence.username), explanation: "Public GitHub profile reference is preserved." },
    { key: "resume", label: "Resume", complete: Boolean(profile.resumeEvidence), explanation: profile.resumeEvidence ? "A private local resume document is loaded." : "Resume not loaded." },
    { key: "experience", label: "Experience", complete: profile.experience.length > 0, explanation: `${profile.experience.length} accepted record(s).` },
    { key: "education", label: "Education", complete: profile.education.length > 0, explanation: `${profile.education.length} accepted record(s).` },
    { key: "skills", label: "Skills", complete: skills.length > 0, explanation: `${skills.length} accepted skill(s).` },
    { key: "projects", label: "Projects", complete: profile.projects.length > 0 || profile.githubEvidence.repositories.length > 0, explanation: `${profile.projects.length} resume project(s), ${profile.githubEvidence.repositories.length} selected GitHub project(s).` },
    { key: "targetRole", label: "Target role", complete: Boolean(profile.careerDirection.targetRole?.value), explanation: profile.careerDirection.targetRole ? "Explicitly provided by the user." : "Target role not provided." },
    { key: "links", label: "Professional links", complete: profile.professionalLinks.length > 0 || Boolean(profile.identity.website || profile.identity.linkedin), explanation: "Counts accepted or user-provided links." },
  ];
  const accepted = profile.resumeReview.filter((item) => item.status === "ACCEPTED").length;
  const multiple = comparisons.filter((comparison) => comparison.result === "MULTIPLE_SOURCE_SUPPORT").length;
  const derived: CareerEvidenceDerived = {
    comparisons, completeness,
    sourceCoverage: {
      github: profile.githubEvidence.repositories.length >= 3 ? "STRONG" : profile.githubEvidence.username ? "PARTIAL" : "NONE",
      resume: !profile.resumeEvidence ? "NONE" : accepted >= 5 ? "COMPLETE" : "PARTIAL",
      userProvided: profile.userProvided.length >= 5 ? "COMPLETE" : profile.userProvided.length ? "PARTIAL" : "NONE",
      crossSourceSupport: multiple,
      potentialGaps: comparisons.filter((comparison) => comparison.result === "RESUME_ONLY" || comparison.result === "POTENTIAL_RESUME_OPPORTUNITY").length,
    },
    generatedAt: now,
  };
  return { ...profile, skills, derived, updatedAt: now };
}
