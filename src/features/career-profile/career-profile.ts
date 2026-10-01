import { CAREER_EVIDENCE_SCHEMA_VERSION, type CareerEvidenceDerived, type CareerEvidenceProfile, type CareerRecord, type CareerSection, type EvidenceComparison, type EvidenceProvenance, type EvidenceValue, type GitHubCareerEvidence, type ProvenanceRef, type ResumeDocumentEvidence, type ResumeReviewItem, type SkillEvidence } from "../../domain/career-evidence-profile";
import { transferPreparation } from "./preparation-transfer";
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
  const repositories = [...selectedIds].flatMap((repositoryId) => {
    const entry = audit.repositories.find(({ repository }) => repository.id === repositoryId);
    return entry ? [entry] : [];
  })
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
  return deriveCareerEvidence(transferPreparation(profile, preparation, now), now);
}

export function refreshCareerPreparation(profile: CareerEvidenceProfile, audit: GitHubAudit, preparation: PreparationState, now = new Date().toISOString()): CareerEvidenceProfile {
  if (profile.username.toLowerCase() !== audit.user.login.toLowerCase() || profile.username.toLowerCase() !== preparation.username.toLowerCase()) throw new Error("Profile and preparation must belong to the same GitHub account.");
  return deriveCareerEvidence(transferPreparation({ ...profile, githubEvidence: githubEvidenceFromAudit(audit, preparation), updatedAt: now }, preparation, now), now);
}

function emptyDerived(now: string): CareerEvidenceDerived {
  return { comparisons: [], completeness: [], sourceCoverage: { github: "NONE", resume: "NONE", userProvided: "NONE", crossSourceSupport: 0, potentialGaps: 0 }, generatedAt: now };
}

export function attachResume(profile: CareerEvidenceProfile, document: ResumeDocumentEvidence, items: ResumeReviewItem[], now = new Date().toISOString()): CareerEvidenceProfile {
  return deriveCareerEvidence({ ...profile, updatedAt: now, resumeEvidence: document, resumeReview: items }, now);
}

function sameSource(left: ProvenanceRef, right: ProvenanceRef): boolean {
  return left.source === right.source && left.sourceId === right.sourceId && left.observedAt === right.observedAt;
}

function acceptedEvidence(profile: CareerEvidenceProfile, item: ResumeReviewItem): CareerRecord | SkillEvidence | undefined {
  const records = profile[item.section];
  if (item.acceptedRecordId) return records.find((record) => record.id === item.acceptedRecordId && record.provenance.some((source) => source.sourceId === item.id || sameSource(source, item.provenance)));
  // Older profiles have document-level source IDs. Match exact content before
  // adopting a link; never guess which independently edited record it belonged to.
  const matches = records.filter((record) => record.provenance.some((source) => sameSource(source, item.provenance)) && (
    "normalizedName" in record ? record.normalizedName === normalizeSkill(item.title) :
      record.title === (item.title || item.description || "Untitled item") &&
      (record.organization ?? "") === item.organization && (record.description ?? "") === item.description &&
      (record.startDate ?? "") === item.startDate && (record.endDate ?? "") === item.endDate &&
      (record.url ?? "") === item.url && JSON.stringify(record.technologies) === JSON.stringify(item.technologies)
  ));
  return matches.length === 1 ? matches[0] : undefined;
}

export function canEditReviewItem(profile: CareerEvidenceProfile, item: ResumeReviewItem): boolean {
  return item.status !== "ACCEPTED" || Boolean(acceptedEvidence(profile, item));
}

function removeAcceptedEvidence(profile: CareerEvidenceProfile, item: ResumeReviewItem, now: string): CareerEvidenceProfile {
  const accepted = acceptedEvidence(profile, item);
  if (!accepted) return profile;
  const sourceIndex = accepted.provenance.findIndex((source) => source.sourceId === item.id || sameSource(source, item.provenance));
  // Missing provenance means the record was independently replaced. Keep it.
  if (sourceIndex < 0) return profile;
  const retained = accepted.provenance.filter((_, index) => index !== sourceIndex);
  return { ...profile, [item.section]: profile[item.section].flatMap((record) => record.id !== accepted.id ? [record] : retained.length ? [{ ...record, provenance: retained, updatedAt: now }] : []) } as CareerEvidenceProfile;
}

export function editReviewItem(profile: CareerEvidenceProfile, itemId: string, changes: Partial<Pick<ResumeReviewItem, "title" | "organization" | "description" | "startDate" | "endDate" | "technologies" | "url">>, now = new Date().toISOString()): CareerEvidenceProfile {
  const item = profile.resumeReview.find((candidate) => candidate.id === itemId);
  if (!item || !canEditReviewItem(profile, item)) return profile;
  const accepted = item.status === "ACCEPTED" ? acceptedEvidence(profile, item) : undefined;
  const edited: ResumeReviewItem = { ...item, ...changes, status: "PENDING", provenance: provenance("USER_PROVIDED", item.id, now, "Edited during resume review") };
  delete edited.acceptedRecordId;
  const base = accepted ? removeAcceptedEvidence(profile, item, now) : profile;
  const next = { ...base, updatedAt: now, resumeReview: base.resumeReview.map((candidate) => candidate.id === itemId ? edited : candidate) };
  if (!accepted || !(edited.section === "skills" ? edited.title.trim() : edited.title.trim() || edited.description.trim())) return deriveCareerEvidence(next, now);
  // Preserve output selections when correcting one item, while letting renamed
  // shared skills split or merge without discarding their independent sources.
  const keepId = !base[item.section].some((record) => record.id === accepted.id) ? accepted.id : undefined;
  return acceptReviewItem(next, itemId, now, keepId);
}

export function removeReviewItem(profile: CareerEvidenceProfile, itemId: string, now = new Date().toISOString()): CareerEvidenceProfile {
  const item = profile.resumeReview.find((candidate) => candidate.id === itemId);
  if (!item || !canEditReviewItem(profile, item)) return profile;
  const base = item.status === "ACCEPTED" ? removeAcceptedEvidence(profile, item, now) : profile;
  return deriveCareerEvidence({ ...base, updatedAt: now, resumeReview: base.resumeReview.filter((candidate) => candidate.id !== itemId) }, now);
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

export function acceptReviewItem(profile: CareerEvidenceProfile, itemId: string, now = new Date().toISOString(), preferredRecordId?: string): CareerEvidenceProfile {
  const item = profile.resumeReview.find((candidate) => candidate.id === itemId);
  if (!item || item.status === "ACCEPTED" || !(item.section === "skills" ? item.title.trim() : item.title.trim() || item.description.trim())) return profile;
  const acceptedItem = { ...item, provenance: { ...item.provenance, sourceId: item.id } };
  let next = { ...profile, updatedAt: now };
  let acceptedRecordId: string;
  if (item.section === "skills") {
    const normalizedName = normalizeSkill(item.title);
    const existing = next.skills.find((skill) => skill.normalizedName === normalizedName);
    acceptedRecordId = existing?.id ?? preferredRecordId ?? id("skill");
    const skills: SkillEvidence[] = existing
      ? next.skills.map((skill) => skill.id === existing.id ? { ...skill, provenance: [...skill.provenance, acceptedItem.provenance], updatedAt: now } : skill)
      : [...next.skills, { id: acceptedRecordId, name: item.title.trim(), normalizedName, provenance: [acceptedItem.provenance], githubRepositoryIds: [], updatedAt: now }];
    next = { ...next, skills };
  } else {
    const record = recordFromItem(acceptedItem, now);
    acceptedRecordId = preferredRecordId ?? record.id;
    next = { ...next, [item.section]: [...next[item.section], { ...record, id: acceptedRecordId }] } as CareerEvidenceProfile;
  }
  next.resumeReview = profile.resumeReview.map((candidate) => candidate.id === itemId ? { ...acceptedItem, status: "ACCEPTED", acceptedRecordId } : candidate);
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
  const review = profile.resumeReview.find((item) => item.section === section && item.status === "ACCEPTED" && acceptedEvidence(profile, item)?.id === recordId);
  const source = provenance("USER_PROVIDED", review?.id ?? recordId, now, "Edited after acceptance");
  const records = profile[section].map((record) => record.id === recordId ? { ...record, ...changes, provenance: [source], updatedAt: now } : record);
  const edited = records.find((record) => record.id === recordId);
  const resumeReview = review && edited ? profile.resumeReview.map((item) => item.id === review.id ? {
    ...item, acceptedRecordId: recordId, title: edited.title, organization: edited.organization ?? "", description: edited.description ?? "",
    startDate: edited.startDate ?? "", endDate: edited.endDate ?? "", url: edited.url ?? "", technologies: edited.technologies, provenance: source,
  } : item) : profile.resumeReview;
  return deriveCareerEvidence({ ...profile, updatedAt: now, [section]: records, resumeReview } as CareerEvidenceProfile, now);
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
    const result = repositoryIds.length ? "MULTIPLE_SOURCE_SUPPORT" : hasResume ? "RESUME_ONLY" : "USER_ONLY";
    const sourceDescription = hasResume ? "accepted resume evidence" : "information you provided";
    comparisons.push({ id: `comparison:skill:${skill.normalizedName}`, subject: skill.name, result, explanation: repositoryIds.length ? `Observed in ${repositoryIds.length} selected public ${repositoryIds.length === 1 ? "repository" : "repositories"} and listed in ${sourceDescription}.` : `Listed in ${sourceDescription}; relevant public GitHub evidence was not detected.`, provenance: provenance("DERIVED", skill.id, now), githubRepositoryIds: repositoryIds });
    return { ...skill, githubRepositoryIds: repositoryIds, updatedAt: now };
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
      resume: !profile.resumeEvidence ? "NONE" : accepted > 0 && accepted === profile.resumeReview.length ? "COMPLETE" : "PARTIAL",
      userProvided: profile.userProvided.length >= 5 ? "COMPLETE" : profile.userProvided.length ? "PARTIAL" : "NONE",
      crossSourceSupport: multiple,
      potentialGaps: comparisons.filter((comparison) => comparison.result === "RESUME_ONLY" || comparison.result === "USER_ONLY" || comparison.result === "POTENTIAL_RESUME_OPPORTUNITY").length,
    },
    generatedAt: now,
  };
  return { ...profile, skills, derived, updatedAt: now };
}
