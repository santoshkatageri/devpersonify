import type { EvidenceProvenance } from "./career-evidence-profile";

export const LATEX_RESUME_CONFIG_VERSION = 1 as const;
export const CLASSIC_TEMPLATE_ID = "devpersonify-classic" as const;
export const CLASSIC_TEMPLATE_VERSION = "1.0" as const;

export type ResumeSectionKey = "header" | "summary" | "experience" | "skills" | "projects" | "education" | "certifications" | "achievements" | "openSource" | "links";
export type SelectableContentType = "experience" | "skills" | "projects" | "education" | "certifications" | "achievements" | "links";

export interface ResumeSectionConfig {
  key: ResumeSectionKey;
  label: string;
  enabled: boolean;
}

export interface ResumePresentationOverride {
  key: string;
  value: string;
  source: "USER_PROVIDED";
  updatedAt: string;
}

export interface LatexResumeConfiguration {
  schemaVersion: typeof LATEX_RESUME_CONFIG_VERSION;
  username: string;
  templateId: typeof CLASSIC_TEMPLATE_ID;
  templateVersion: typeof CLASSIC_TEMPLATE_VERSION;
  updatedAt: string;
  sections: ResumeSectionConfig[];
  selections: Record<SelectableContentType, string[]>;
  overrides: Record<string, ResumePresentationOverride>;
}

export interface ResumeSelectableItem {
  id: string;
  type: SelectableContentType;
  title: string;
  subtitle?: string;
  description?: string;
  provenance: EvidenceProvenance[];
}

export interface ResumeReadinessItem {
  key: string;
  label: string;
  ready: boolean;
  optional: boolean;
  explanation: string;
}

export interface ResumeGenerationResult {
  source: string;
  includedSections: ResumeSectionKey[];
  omittedEmptySections: ResumeSectionKey[];
  warnings: string[];
}
