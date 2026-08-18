export const GITHUB_README_CONFIG_VERSION = 1 as const;

export interface GithubReadmeSections {
  introduction: boolean;
  whatIBuild: boolean;
  selectedProjects: boolean;
  technologies: boolean;
  openSource: boolean;
  contact: boolean;
}

export interface GithubReadmePresentation {
  professionalHeadline: string;
  shortIntroduction: string;
  currentFocus: string;
  additionalSkills: string;
  preferredTechnologies: string;
  location: string;
  website: string;
  linkedinUrl: string;
  email: string;
}

export interface GithubReadmeConfiguration {
  schemaVersion: typeof GITHUB_README_CONFIG_VERSION;
  username: string;
  updatedAt: string;
  selectedProjectIds: string[];
  projectOrder: string[];
  sections: GithubReadmeSections;
  presentation: GithubReadmePresentation;
}
