/**
 * Canonical developer profile used by every DevPersonify output.
 *
 * Observed evidence is data retrieved from a source. User claims are explicitly
 * marked so the UI never presents an unverified claim as externally observed.
 */

export const DEVELOPER_PROFILE_SCHEMA_VERSION = 1 as const;

export type ISODate = string;
export type ISODateTime = string;
export type EvidenceOrigin = "observed" | "user_claim" | "derived";
export type EvidenceSource =
  | "github"
  | "linkedin_manual"
  | "resume_upload"
  | "personal_website"
  | "user_input"
  | "system_rule";

export interface EvidenceRef {
  id: string;
  origin: EvidenceOrigin;
  source: EvidenceSource;
  sourceUrl?: string;
  observedAt?: ISODateTime;
  note?: string;
}

export interface Identity {
  displayName: string;
  professionalHeadline?: string;
  location?: string;
  pronouns?: string;
  summary?: string;
}

export interface Contact {
  email?: string;
  phone?: string;
  location?: string;
}

export type LinkKind =
  | "github"
  | "linkedin"
  | "portfolio"
  | "blog"
  | "stackoverflow"
  | "kaggle"
  | "huggingface"
  | "npm"
  | "pypi"
  | "devto"
  | "hashnode"
  | "medium"
  | "other";

export interface ProfileLink {
  id: string;
  kind: LinkKind;
  label: string;
  url: string;
  evidence: EvidenceRef;
}

export type RoleSeniority =
  | "intern"
  | "junior"
  | "mid"
  | "senior"
  | "staff"
  | "principal"
  | "lead"
  | "manager"
  | "unspecified";

export interface TargetRole {
  id: string;
  title: string;
  seniority: RoleSeniority;
  priority: "primary" | "secondary";
  domains: string[];
  evidence: EvidenceRef;
}

export type SkillLevel = "learning" | "working" | "proficient" | "advanced";

export interface Skill {
  id: string;
  name: string;
  normalizedName: string;
  category:
    | "language"
    | "framework"
    | "library"
    | "database"
    | "cloud"
    | "devops"
    | "tool"
    | "method"
    | "domain"
    | "other";
  level?: SkillLevel;
  evidenceRefs: string[];
  evidence: EvidenceRef;
}

export interface DateRange {
  start?: ISODate;
  end?: ISODate;
  current?: boolean;
}

export interface ExperienceItem {
  id: string;
  organization: string;
  title: string;
  location?: string;
  dateRange: DateRange;
  summary?: string;
  highlights: string[];
  skillRefs: string[];
  evidenceRefs: string[];
  evidence: EvidenceRef;
}

export interface EducationItem {
  id: string;
  institution: string;
  qualification: string;
  field?: string;
  dateRange: DateRange;
  location?: string;
  highlights: string[];
  evidence: EvidenceRef;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  issuedOn?: ISODate;
  expiresOn?: ISODate;
  credentialId?: string;
  credentialUrl?: string;
  evidence: EvidenceRef;
}

export type ProjectStatus = "active" | "maintained" | "complete" | "paused" | "archived";

export interface Project {
  id: string;
  name: string;
  description: string;
  role?: string;
  status: ProjectStatus;
  startDate?: ISODate;
  endDate?: ISODate;
  url?: string;
  repositoryRefs: string[];
  skillRefs: string[];
  highlights: string[];
  selectedForShowcase: boolean;
  evidenceRefs: string[];
  evidence: EvidenceRef;
}

export interface RepositoryEvidence {
  id: string;
  provider: "github";
  providerId: number;
  owner: string;
  name: string;
  fullName: string;
  url: string;
  description?: string;
  isFork: boolean;
  isArchived: boolean;
  isTemplate: boolean;
  primaryLanguage?: string;
  topics: string[];
  stars: number;
  forks: number;
  openIssues: number;
  defaultBranch: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  pushedAt?: ISODateTime;
  homepageUrl?: string;
  licenseSpdxId?: string;
  hasReadme?: boolean;
  hasReleases?: boolean;
  evidence: EvidenceRef;
}

export interface OpenSourceContribution {
  id: string;
  projectName: string;
  description: string;
  url?: string;
  contributionType: "commit" | "pull_request" | "issue" | "maintainer" | "release" | "other";
  occurredOn?: ISODate;
  skillRefs: string[];
  evidence: EvidenceRef;
}

export interface WritingItem {
  id: string;
  title: string;
  publication?: string;
  publishedOn?: ISODate;
  url?: string;
  topics: string[];
  evidence: EvidenceRef;
}

export interface Achievement {
  id: string;
  title: string;
  description?: string;
  awardedBy?: string;
  awardedOn?: ISODate;
  url?: string;
  evidence: EvidenceRef;
}

export interface ProfessionalProfile {
  id: string;
  platform: LinkKind;
  url?: string;
  headline?: string;
  about?: string;
  suppliedSections: string[];
  lastReviewedAt?: ISODateTime;
  evidence: EvidenceRef;
}

export interface CareerPreferences {
  employmentTypes: Array<"full_time" | "part_time" | "contract" | "internship" | "freelance">;
  workplaceModes: Array<"remote" | "hybrid" | "onsite">;
  preferredLocations: string[];
  industries: string[];
  openToRelocation?: boolean;
}

export interface DeveloperProfile {
  schemaVersion: typeof DEVELOPER_PROFILE_SCHEMA_VERSION;
  id: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  identity: Identity;
  contact: Contact;
  links: ProfileLink[];
  targetRoles: TargetRole[];
  skills: Skill[];
  experience: ExperienceItem[];
  education: EducationItem[];
  certifications: Certification[];
  projects: Project[];
  repositories: RepositoryEvidence[];
  openSource: OpenSourceContribution[];
  writing: WritingItem[];
  achievements: Achievement[];
  professionalProfiles: ProfessionalProfile[];
  careerPreferences: CareerPreferences;
  evidence: EvidenceRef[];
}

export function createEmptyDeveloperProfile(id: string, now: ISODateTime): DeveloperProfile {
  return {
    schemaVersion: DEVELOPER_PROFILE_SCHEMA_VERSION,
    id,
    createdAt: now,
    updatedAt: now,
    identity: { displayName: "" },
    contact: {},
    links: [],
    targetRoles: [],
    skills: [],
    experience: [],
    education: [],
    certifications: [],
    projects: [],
    repositories: [],
    openSource: [],
    writing: [],
    achievements: [],
    professionalProfiles: [],
    careerPreferences: {
      employmentTypes: [],
      workplaceModes: [],
      preferredLocations: [],
      industries: [],
    },
    evidence: [],
  };
}
