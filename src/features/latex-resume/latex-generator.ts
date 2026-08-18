import type { CareerEvidenceProfile, CareerRecord, SkillEvidence } from "../../domain/career-evidence-profile";
import { CLASSIC_TEMPLATE_ID, CLASSIC_TEMPLATE_VERSION, type LatexResumeConfiguration, type ResumeGenerationResult, type ResumeReadinessItem, type ResumeSectionKey } from "../../domain/latex-resume";
import { presentationValue } from "./resume-configuration";

export function escapeLatexContent(value: string): string {
  const replacements: Record<string, string> = {
    "\\": "\\textbackslash{}", "&": "\\&", "%": "\\%", "$": "\\$", "#": "\\#", "_": "\\_", "{": "\\{", "}": "\\}",
    "~": "\\textasciitilde{}", "^": "\\textasciicircum{}", "<": "\\textless{}", ">": "\\textgreater{}", "|": "\\textbar{}",
    "–": "--", "—": "---", "•": "\\textbullet{}",
  };
  return [...value.replace(/\r?\n+/g, " ")].map((character) => replacements[character] ?? character).join("");
}

export function normalizeSafeHttpUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch { return null; }
}

export function escapeLatexUrl(value: string): string | null {
  const safe = normalizeSafeHttpUrl(value);
  if (!safe) return null;
  return safe.replaceAll("~", "%7E").replace(/([%#&_{}])/g, "\\$1");
}

function href(url: string, label: string): string | null {
  const safeUrl = escapeLatexUrl(url);
  return safeUrl ? `\\href{${safeUrl}}{${escapeLatexContent(label)}}` : null;
}

function override(config: LatexResumeConfiguration, type: string, id: string, field: string, source: string): string {
  return presentationValue(config, `${type}:${id}:${field}`, source);
}

export interface ResolvedResumeProject {
  id: string;
  title: string;
  description: string;
  url: string;
  technologies: string[];
  source: "github" | "profile";
  isFork: boolean;
}

export interface ResolvedResumeContent {
  name: string;
  headline: string;
  summary: string;
  location: string;
  experience: CareerRecord[];
  skills: SkillEvidence[];
  projects: ResolvedResumeProject[];
  education: CareerRecord[];
  certifications: CareerRecord[];
  achievements: CareerRecord[];
  links: Array<{ id: string; label: string; value: string }>;
  openSource: ResolvedResumeProject[];
}

export function resolveResumeContent(profile: CareerEvidenceProfile, config: LatexResumeConfiguration): ResolvedResumeContent {
  const selected = (type: keyof LatexResumeConfiguration["selections"], id: string) => config.selections[type].includes(id);
  const orderedRecords = (type: "experience" | "education" | "certifications" | "achievements", records: CareerRecord[]) => config.selections[type].map((id) => records.find((record) => record.id === id)).filter((record): record is CareerRecord => Boolean(record));
  const githubProjects: ResolvedResumeProject[] = profile.githubEvidence.repositories.filter((item) => selected("projects", item.repositoryId)).map((item) => ({
    id: item.repositoryId,
    title: override(config, "projects", item.repositoryId, "title", item.name),
    description: override(config, "projects", item.repositoryId, "description", item.description ?? ""),
    url: item.url,
    technologies: [item.language, ...item.topics].filter((value): value is string => Boolean(value)),
    source: "github",
    isFork: item.isFork,
  }));
  const profileProjects: ResolvedResumeProject[] = profile.projects.filter((item) => selected("projects", item.id)).map((item) => ({
    id: item.id,
    title: override(config, "projects", item.id, "title", item.title),
    description: override(config, "projects", item.id, "description", item.description ?? ""),
    url: item.url ?? "",
    technologies: item.technologies,
    source: "profile",
    isFork: false,
  }));
  const links = [
    ...profile.professionalLinks.filter((item) => selected("links", item.id)).map((item) => ({ id: item.id, label: override(config, "links", item.id, "title", item.title), value: override(config, "links", item.id, "value", item.url ?? item.description ?? "") })),
    ...([profile.identity.website, profile.identity.linkedin, profile.identity.email].filter(Boolean).filter((item) => selected("links", item!.id)).map((item) => ({ id: item!.id, label: item!.id === profile.identity.email?.id ? "Email" : item!.id === profile.identity.linkedin?.id ? "LinkedIn" : "Website", value: String(item!.value) }))),
    ...(selected("links", `github:profile:${profile.username}`) ? [{ id: `github:profile:${profile.username}`, label: "GitHub", value: profile.githubEvidence.profileUrl }] : []),
  ];
  const allProjects = [...githubProjects, ...profileProjects];
  const projects = config.selections.projects.map((id) => allProjects.find((project) => project.id === id)).filter((project): project is ResolvedResumeProject => Boolean(project));
  const orderedLinks = config.selections.links.map((id) => links.find((link) => link.id === id)).filter((link): link is { id: string; label: string; value: string } => Boolean(link));
  return {
    name: override(config, "header", "profile", "name", profile.identity.name?.value ?? profile.githubEvidence.displayName ?? profile.username),
    headline: override(config, "header", "profile", "headline", profile.careerDirection.professionalHeadline?.value ?? ""),
    summary: presentationValue(config, "summary", profile.careerDirection.shortIntroduction?.value ?? ""),
    location: override(config, "header", "profile", "location", profile.identity.location?.value ?? profile.githubEvidence.location ?? ""),
    experience: orderedRecords("experience", profile.experience),
    skills: config.selections.skills.map((id) => profile.skills.find((skill) => skill.id === id)).filter((skill): skill is SkillEvidence => Boolean(skill)),
    projects,
    education: orderedRecords("education", profile.education),
    certifications: orderedRecords("certifications", profile.certifications),
    achievements: orderedRecords("achievements", profile.achievements),
    links: orderedLinks,
    openSource: projects.filter((item) => item.isFork),
  };
}

function recordDates(record: CareerRecord): string {
  return [record.startDate, record.endDate].filter(Boolean).join(" -- ");
}

function latexBullets(value: string): string {
  const bullets = value.split(/\n|•/).map((item) => item.trim()).filter(Boolean);
  if (!bullets.length) return "";
  return `\n\\begin{itemize}\n${bullets.map((item) => `  \\item ${escapeLatexContent(item)}`).join("\n")}\n\\end{itemize}`;
}

function renderHeader(content: ResolvedResumeContent): string {
  if (!content.name && !content.headline && !content.links.length) return "";
  const contacts: string[] = [];
  if (content.location) contacts.push(escapeLatexContent(content.location));
  for (const link of content.links) {
    if (link.label === "Email" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(link.value)) contacts.push(escapeLatexContent(link.value));
    else {
      const rendered = href(link.value, link.label);
      if (rendered) contacts.push(rendered);
    }
  }
  return `\\begin{center}
  {\\LARGE\\bfseries ${escapeLatexContent(content.name)}}\\par
  ${content.headline ? `\\vspace{2pt}{\\large ${escapeLatexContent(content.headline)}}\\par\n  ` : ""}${contacts.length ? `\\vspace{4pt}\\small ${contacts.join(" \\textbar{} ")}\\par` : ""}
\\end{center}`;
}

function renderRecords(records: CareerRecord[], config: LatexResumeConfiguration, type: string): string {
  return records.map((record) => {
    const title = override(config, type, record.id, "title", record.title);
    const organization = override(config, type, record.id, "organization", record.organization ?? "");
    const description = override(config, type, record.id, "description", record.description ?? "");
    const technologies = override(config, type, record.id, "technologies", record.technologies.join(", "));
    return `\\resumeEntry{${escapeLatexContent(title)}}{${escapeLatexContent(organization)}}{${escapeLatexContent(recordDates(record))}}${description ? latexBullets(description) : ""}${technologies ? `\n\\resumeTechnologies{${escapeLatexContent(technologies)}}` : ""}`;
  }).join("\n\n");
}

function renderProjects(projects: ResolvedResumeProject[]): string {
  return projects.map((project) => {
    const projectTitle = href(project.url, project.title) ?? escapeLatexContent(project.title);
    return `\\resumeProject{${projectTitle}}{${escapeLatexContent(project.technologies.join(", "))}}${project.description ? latexBullets(project.description) : ""}`;
  }).join("\n\n");
}

function renderSection(key: ResumeSectionKey, content: ResolvedResumeContent, config: LatexResumeConfiguration): string {
  if (key === "header") return renderHeader(content);
  if (key === "summary") return content.summary ? `\\section{Summary}\n${escapeLatexContent(content.summary)}` : "";
  if (key === "experience") return content.experience.length ? `\\section{Experience}\n${renderRecords(content.experience, config, "experience")}` : "";
  if (key === "skills") {
    if (!content.skills.length) return "";
    const label = presentationValue(config, "skills:groupLabel", "Technical Skills");
    return `\\section{Skills}\n\\textbf{${escapeLatexContent(label)}:} ${content.skills.map((skill) => escapeLatexContent(override(config, "skills", skill.id, "name", skill.name))).join(", ")}`;
  }
  if (key === "projects") return content.projects.length ? `\\section{Selected Projects}\n${renderProjects(content.projects)}` : "";
  if (key === "education") return content.education.length ? `\\section{Education}\n${renderRecords(content.education, config, "education")}` : "";
  if (key === "certifications") return content.certifications.length ? `\\section{Certifications}\n${renderRecords(content.certifications, config, "certifications")}` : "";
  if (key === "achievements") return content.achievements.length ? `\\section{Achievements}\n${content.achievements.map((item) => `\\resumeItem{${escapeLatexContent(override(config, "achievements", item.id, "title", item.title))}}{${escapeLatexContent(override(config, "achievements", item.id, "description", item.description ?? ""))}}`).join("\n")}` : "";
  if (key === "openSource") return content.openSource.length ? `\\section{Open Source}\n${renderProjects(content.openSource)}` : "";
  if (key === "links") {
    const links = content.links.map((link) => href(link.value, link.label)).filter((value): value is string => Boolean(value));
    return links.length ? `\\section{Links}\n${links.map((link) => `\\resumeLink{${link}}`).join("\n")}` : "";
  }
  return "";
}

const PREAMBLE = `\\documentclass[10pt,letterpaper]{article}

% DevPersonify ATS-friendly resume template
% Template: ${CLASSIC_TEMPLATE_ID} v${CLASSIC_TEMPLATE_VERSION}
\\usepackage[margin=0.68in]{geometry}
\\usepackage{iftex}
\\ifPDFTeX
  \\usepackage[T1]{fontenc}
  \\usepackage[utf8]{inputenc}
\\else
  \\usepackage{fontspec}
  \\defaultfontfeatures{Ligatures=TeX}
\\fi
\\usepackage{lmodern}
\\usepackage{xcolor}
\\usepackage{hyperref}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{parskip}

\\definecolor{linkcolor}{HTML}{1F3BA3}
\\hypersetup{colorlinks=true,urlcolor=linkcolor,pdfborder={0 0 0}}
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\setlist[itemize]{leftmargin=1.25em,itemsep=1pt,topsep=2pt,parsep=0pt}
\\titleformat{\\section}{\\large\\bfseries}{}{0pt}{}[\\titlerule]
\\titlespacing*{\\section}{0pt}{8pt}{4pt}

\\newcommand{\\resumeEntry}[3]{%
  \\textbf{#1}\\hfill #3\\par
  \\textit{#2}\\par
}
\\newcommand{\\resumeProject}[2]{%
  \\textbf{#1}\\hfill \\textit{#2}\\par
}
\\newcommand{\\resumeTechnologies}[1]{\\textit{Technologies: #1}\\par}
\\newcommand{\\resumeItem}[2]{\\textbf{#1}\\if\\relax\\detokenize{#2}\\relax\\else{} --- #2\\fi\\par}
\\newcommand{\\resumeLink}[1]{#1\\par}

\\begin{document}`;

export function generateLatexResume(profile: CareerEvidenceProfile, config: LatexResumeConfiguration): ResumeGenerationResult {
  const content = resolveResumeContent(profile, config);
  const rendered: string[] = [];
  const includedSections: ResumeSectionKey[] = [];
  const omittedEmptySections: ResumeSectionKey[] = [];
  for (const section of config.sections) {
    if (!section.enabled) continue;
    const value = renderSection(section.key, content, config);
    if (value.trim()) { rendered.push(value); includedSections.push(section.key); }
    else omittedEmptySections.push(section.key);
  }
  const warnings: string[] = [];
  for (const link of content.links) if (link.label !== "Email" && link.value && !normalizeSafeHttpUrl(link.value)) warnings.push(`${link.label} was omitted because its URL is malformed or uses an unsafe protocol.`);
  const source = `${PREAMBLE}\n\n${rendered.join("\n\n")}\n\n\\end{document}\n`;
  return { source, includedSections, omittedEmptySections, warnings };
}

export function calculateResumeReadiness(profile: CareerEvidenceProfile, config: LatexResumeConfiguration): ResumeReadinessItem[] {
  const content = resolveResumeContent(profile, config);
  return [
    { key: "name", label: "Name", ready: Boolean(content.name), optional: false, explanation: content.name ? "Name evidence is available." : "Add a name before sharing the resume." },
    { key: "contact", label: "Contact", ready: content.links.length > 0 || Boolean(content.location), optional: true, explanation: content.links.length || content.location ? "Contact or location evidence is selected." : "No contact link or location selected." },
    { key: "experience", label: "Experience", ready: content.experience.length > 0, optional: true, explanation: `${content.experience.length} experience record(s) selected.` },
    { key: "projects", label: "Selected projects", ready: content.projects.length > 0, optional: true, explanation: `${content.projects.length} project(s) selected; ${content.projects.filter((project) => project.source === "github").length} have GitHub evidence.` },
    { key: "skills", label: "Skills", ready: content.skills.length > 0, optional: true, explanation: `${content.skills.length} skill(s) selected.` },
    { key: "education", label: "Education", ready: content.education.length > 0, optional: true, explanation: `${content.education.length} education record(s) selected.` },
    { key: "targetRole", label: "Target role", ready: Boolean(profile.careerDirection.targetRole?.value), optional: true, explanation: profile.careerDirection.targetRole ? "Target role was explicitly provided." : "Target role has not been specified." },
  ];
}
