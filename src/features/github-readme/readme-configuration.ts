import type { CareerEvidenceProfile } from "../../domain/career-evidence-profile";
import { GITHUB_README_CONFIG_VERSION, type GithubReadmeConfiguration, type GithubReadmePresentation, type GithubReadmeSections } from "../../domain/github-readme";

function text(value: string | string[] | undefined): string { return Array.isArray(value) ? value.join(", ") : value ?? ""; }

export function createGithubReadmeConfiguration(profile: CareerEvidenceProfile, now = new Date().toISOString()): GithubReadmeConfiguration {
  const projectIds = profile.githubEvidence.repositories.map((repository) => repository.repositoryId);
  return {
    schemaVersion: GITHUB_README_CONFIG_VERSION,
    username: profile.username,
    updatedAt: now,
    selectedProjectIds: projectIds,
    projectOrder: projectIds,
    sections: { introduction: true, whatIBuild: true, selectedProjects: true, technologies: true, openSource: true, contact: true },
    presentation: {
      professionalHeadline: text(profile.careerDirection.professionalHeadline?.value),
      shortIntroduction: text(profile.careerDirection.shortIntroduction?.value ?? profile.githubEvidence.bio),
      currentFocus: text(profile.careerDirection.careerDirection?.value),
      additionalSkills: "",
      preferredTechnologies: text(profile.careerDirection.preferredTechnologies?.value),
      location: text(profile.identity.location?.value ?? profile.githubEvidence.location),
      website: text(profile.identity.website?.value ?? profile.githubEvidence.website),
      linkedinUrl: text(profile.identity.linkedin?.value),
      email: text(profile.identity.email?.value),
    },
  };
}

export function reconcileGithubReadmeConfiguration(config: GithubReadmeConfiguration, profile: CareerEvidenceProfile): GithubReadmeConfiguration {
  const valid = new Set(profile.githubEvidence.repositories.map((repository) => repository.repositoryId));
  return { ...config, username: profile.username, selectedProjectIds: config.selectedProjectIds.filter((id) => valid.has(id)), projectOrder: config.projectOrder.filter((id) => valid.has(id)) };
}

export function setReadmeProjectSelected(config: GithubReadmeConfiguration, projectId: string, selected: boolean, now = new Date().toISOString()): GithubReadmeConfiguration {
  const selectedProjectIds = selected ? (config.selectedProjectIds.includes(projectId) ? config.selectedProjectIds : [...config.selectedProjectIds, projectId]) : config.selectedProjectIds.filter((id) => id !== projectId);
  const projectOrder = selected ? (config.projectOrder.includes(projectId) ? config.projectOrder : [...config.projectOrder, projectId]) : config.projectOrder.filter((id) => id !== projectId);
  return { ...config, updatedAt: now, selectedProjectIds, projectOrder };
}

export function moveReadmeProject(config: GithubReadmeConfiguration, projectId: string, direction: -1 | 1, now = new Date().toISOString()): GithubReadmeConfiguration {
  const order = [...config.projectOrder];
  const index = order.indexOf(projectId);
  const next = index + direction;
  if (index < 0 || next < 0 || next >= order.length) return config;
  [order[index], order[next]] = [order[next]!, order[index]!];
  return { ...config, updatedAt: now, projectOrder: order };
}

export function setReadmeSection(config: GithubReadmeConfiguration, key: keyof GithubReadmeSections, enabled: boolean, now = new Date().toISOString()): GithubReadmeConfiguration {
  return { ...config, updatedAt: now, sections: { ...config.sections, [key]: enabled } };
}

export function setReadmePresentation(config: GithubReadmeConfiguration, key: keyof GithubReadmePresentation, value: string, now = new Date().toISOString()): GithubReadmeConfiguration {
  return { ...config, updatedAt: now, presentation: { ...config.presentation, [key]: value } };
}
