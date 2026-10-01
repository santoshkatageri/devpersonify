import type { ISODateTime } from "./developer-profile";

export const CAREER_EVIDENCE_SCHEMA_VERSION = 1 as const;

export type EvidenceProvenance = "GITHUB_OBSERVED" | "RESUME_PROVIDED" | "USER_PROVIDED" | "DERIVED";
export type CareerSection = "experience" | "education" | "skills" | "projects" | "certifications" | "achievements" | "professionalLinks" | "other";
export type ReviewStatus = "PENDING" | "ACCEPTED";

export interface ProvenanceRef {
  source: EvidenceProvenance;
  sourceId: string;
  observedAt: ISODateTime;
  note?: string;
}

export interface EvidenceValue<T> {
  id: string;
  value: T;
  provenance: ProvenanceRef[];
  updatedAt: ISODateTime;
}

export interface ResumeDocumentEvidence {
  id: string;
  fileName?: string;
  fileType: "PDF" | "DOCX" | "TXT" | "PASTED_TEXT";
  text: string;
  importedAt: ISODateTime;
  sizeBytes: number;
  private: true;
}

export interface ResumeReviewItem {
  id: string;
  section: CareerSection;
  title: string;
  organization: string;
  description: string;
  startDate: string;
  endDate: string;
  technologies: string[];
  url: string;
  status: ReviewStatus;
  acceptedRecordId?: string;
  provenance: ProvenanceRef;
}

export interface CareerRecord {
  id: string;
  title: string;
  organization?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  technologies: string[];
  url?: string;
  provenance: ProvenanceRef[];
  updatedAt: ISODateTime;
}

export interface SkillEvidence {
  id: string;
  name: string;
  normalizedName: string;
  provenance: ProvenanceRef[];
  githubRepositoryIds: string[];
  updatedAt: ISODateTime;
}

export interface GitHubRepositoryEvidence {
  repositoryId: string;
  name: string;
  url: string;
  description?: string;
  language?: string;
  topics: string[];
  pushedAt?: string;
  isFork: boolean;
  selectedForPortfolio: boolean;
  selectedForShowcase: boolean;
  provenance: ProvenanceRef;
}

export interface GitHubCareerEvidence {
  username: string;
  profileUrl: string;
  displayName?: string;
  bio?: string;
  location?: string;
  website?: string;
  observedAt: ISODateTime;
  repositories: GitHubRepositoryEvidence[];
}

export interface CareerDirection {
  professionalHeadline?: EvidenceValue<string>;
  currentRole?: EvidenceValue<string>;
  targetRole?: EvidenceValue<string>;
  careerDirection?: EvidenceValue<string>;
  shortIntroduction?: EvidenceValue<string>;
  yearsOfExperience?: EvidenceValue<string>;
  preferredTechnologies?: EvidenceValue<string[]>;
}

export interface CareerIdentity {
  name?: EvidenceValue<string>;
  location?: EvidenceValue<string>;
  email?: EvidenceValue<string>;
  website?: EvidenceValue<string>;
  linkedin?: EvidenceValue<string>;
  otherInformation?: EvidenceValue<string>;
}

export type ComparisonResult = "MULTIPLE_SOURCE_SUPPORT" | "RESUME_ONLY" | "USER_ONLY" | "GITHUB_ONLY" | "POTENTIAL_RESUME_OPPORTUNITY";

export interface EvidenceComparison {
  id: string;
  subject: string;
  result: ComparisonResult;
  explanation: string;
  provenance: ProvenanceRef;
  githubRepositoryIds: string[];
}

export interface ProfileCompletenessItem {
  key: string;
  label: string;
  complete: boolean;
  explanation: string;
}

export interface CareerEvidenceDerived {
  comparisons: EvidenceComparison[];
  completeness: ProfileCompletenessItem[];
  sourceCoverage: {
    github: "NONE" | "PARTIAL" | "STRONG";
    resume: "NONE" | "PARTIAL" | "COMPLETE";
    userProvided: "NONE" | "PARTIAL" | "COMPLETE";
    crossSourceSupport: number;
    potentialGaps: number;
  };
  generatedAt: ISODateTime;
}

export interface CareerProfileSectionPreferences {
  headline: boolean;
  summary: boolean;
  experience: boolean;
  selectedProjects: boolean;
  skills: boolean;
  education: boolean;
  certifications: boolean;
  achievements: boolean;
  links: boolean;
}

export interface CareerEvidenceProfile {
  schemaVersion: typeof CAREER_EVIDENCE_SCHEMA_VERSION;
  id: string;
  username: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  identity: CareerIdentity;
  careerDirection: CareerDirection;
  experience: CareerRecord[];
  education: CareerRecord[];
  skills: SkillEvidence[];
  projects: CareerRecord[];
  certifications: CareerRecord[];
  achievements: CareerRecord[];
  professionalLinks: CareerRecord[];
  other: CareerRecord[];
  githubEvidence: GitHubCareerEvidence;
  resumeEvidence?: ResumeDocumentEvidence;
  resumeReview: ResumeReviewItem[];
  userProvided: ProvenanceRef[];
  derived: CareerEvidenceDerived;
  sectionPreferences: CareerProfileSectionPreferences;
}
