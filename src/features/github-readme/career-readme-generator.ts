import type { CareerEvidenceProfile } from "../../domain/career-evidence-profile";
import type { GithubReadmeConfiguration } from "../../domain/github-readme";
import { escapeMarkdownContent } from "../github-preparation/preparation";

function safeUrl(value: string): string | null {
  if (!value.trim()) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch { return null; }
}

function csv(value: string): string[] { return value.split(",").map((item) => item.trim()).filter(Boolean); }

export function generateCareerGithubReadme(profile: CareerEvidenceProfile, config: GithubReadmeConfiguration): string {
  const selected = config.projectOrder
    .filter((id) => config.selectedProjectIds.includes(id))
    .map((id) => profile.githubEvidence.repositories.find((repository) => repository.repositoryId === id))
    .filter((repository): repository is CareerEvidenceProfile["githubEvidence"]["repositories"][number] => Boolean(repository));
  const sections: string[] = [`# Hi, I'm ${escapeMarkdownContent(profile.identity.name?.value ?? profile.githubEvidence.displayName ?? profile.username)}`];
  if (config.presentation.professionalHeadline) sections.push(`**${escapeMarkdownContent(config.presentation.professionalHeadline)}**`);
  if (config.sections.introduction && config.presentation.shortIntroduction) sections.push(`## Introduction\n\n${escapeMarkdownContent(config.presentation.shortIntroduction)}`);
  if (config.sections.whatIBuild && config.presentation.currentFocus) sections.push(`## What I build\n\n${escapeMarkdownContent(config.presentation.currentFocus)}`);
  if (config.sections.selectedProjects && selected.length) {
    const projects = selected.map((repository) => {
      const url = safeUrl(repository.url);
      const name = escapeMarkdownContent(repository.name);
      const title = url ? `**[${name}](${url})**` : `**${name}**`;
      return `- ${title}${repository.description ? ` — ${escapeMarkdownContent(repository.description)}` : ""}`;
    });
    sections.push(`## Selected projects\n\n${projects.join("\n")}`);
  }
  if (config.sections.technologies) {
    const languages = [...new Set(selected.map((repository) => repository.language).filter((value): value is string => Boolean(value)))];
    const careerSkills = [...new Set(profile.skills.map((skill) => skill.name))];
    const outputSpecific = [...new Set([...csv(config.presentation.preferredTechnologies), ...csv(config.presentation.additionalSkills)])];
    const lines: string[] = [];
    if (languages.length) lines.push(`- **Observed in selected GitHub repositories:** ${languages.map(escapeMarkdownContent).join(", ")}`);
    if (careerSkills.length) lines.push(`- **Accepted career profile evidence:** ${careerSkills.map(escapeMarkdownContent).join(", ")}`);
    if (outputSpecific.length) lines.push(`- **README presentation provided by me:** ${outputSpecific.map(escapeMarkdownContent).join(", ")}`);
    if (lines.length) sections.push(`## Technologies\n\n${lines.join("\n")}`);
  }
  if (config.sections.openSource) {
    const forks = selected.filter((repository) => repository.isFork);
    if (forks.length) sections.push(`## Open source\n\n${forks.map((repository) => {
      const url = safeUrl(repository.url); const name = escapeMarkdownContent(repository.name);
      return `- ${url ? `[${name}](${url})` : name} — selected fork; contribution context should be reviewed manually.`;
    }).join("\n")}`);
  }
  if (config.sections.contact) {
    const contact: string[] = [];
    const website = safeUrl(config.presentation.website);
    const linkedin = safeUrl(config.presentation.linkedinUrl);
    if (website) contact.push(`- [Website](${website})`);
    if (linkedin) contact.push(`- [LinkedIn](${linkedin})`);
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.presentation.email)) contact.push(`- Email: ${escapeMarkdownContent(config.presentation.email)}`);
    if (config.presentation.location) contact.push(`- Location: ${escapeMarkdownContent(config.presentation.location)}`);
    if (contact.length) sections.push(`## Contact\n\n${contact.join("\n")}`);
  }
  return `${sections.join("\n\n")}\n`;
}
