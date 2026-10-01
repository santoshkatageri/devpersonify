import type { CareerEvidenceProfile } from "../../domain/career-evidence-profile";
import { reviewLinkedInText, type LinkedInReviewItem } from "./linkedin-review";

export const LINKEDIN_SECTIONS = [
  { key: "headline", title: "Headline & header", short: "Headline", hint: "Paste your headline and optional location or professional focus. Review your photo and banner visually on LinkedIn.", kinds: ["headline"], prompts: ["Make your role or area of interest easy to understand. Distinguish a target role from a role you currently hold.", "Use the header to introduce your work. Check the photo, banner crop, location, and contact visibility yourself."] },
  { key: "about", title: "About / summary", short: "About", hint: "Paste your About section. Summary is another name for this section; you do not need to enter it twice.", kinds: ["summary"], prompts: ["Open with what you do or are learning, who it helps, and what you want to work on next.", "Use a concrete example, your contribution, and a result you can support. Short paragraphs make the story easier to scan."] },
  { key: "experience", title: "Experience", short: "Experience", hint: "Include role titles, organizations, dates, and descriptions. Internships, volunteering, and substantial project work can provide context too.", kinds: ["experience"], prompts: ["Check every title, employer, and date against your records. Phrase matches do not establish that they belong to the same role.", "Describe what you contributed, how you did it, and the outcome. Add numbers only when you can substantiate them."] },
  { key: "education", title: "Education", short: "Education", hint: "Include institution, qualification or program, field of study, and dates where relevant. Add useful coursework or academic projects.", kinds: ["education"], prompts: ["Use the accurate institution and program names. Mark an ongoing qualification as in progress.", "Include relevant coursework or projects if they help explain your direction; grades and dates are your choice."] },
  { key: "skills", title: "Skills", short: "Skills", hint: "Paste your skills as a list, one per line or separated by commas. Enter endorsements separately.", kinds: ["skill"], prompts: ["Prioritize skills relevant to the work you want, then connect them to experience or projects.", "Keep skills you can explain and demonstrate. A keyword match is not evidence of proficiency."] },
  { key: "endorsements", title: "Endorsements & recommendations", short: "Endorsements", hint: "Optionally describe which skills are endorsed or paste a recommendation you want to review. You can omit names and personal details.", kinds: [], prompts: ["Endorsements relate to skills; recommendations are written accounts of working with you. Their authenticity cannot be verified here.", "Ask people who know your work for specific, honest feedback. Endorsement counts are not a measure of ability, and none are required to use this review."] },
  { key: "featured", title: "Featured & projects", short: "Featured", hint: "Paste featured project titles, short descriptions, and destination links. Add what you personally contributed.", kinds: ["project"], prompts: ["Choose a few relevant examples and explain your contribution, the problem, and what someone can inspect.", "Open every link yourself and check that it is accessible to the intended audience. This review does not visit links."] },
  { key: "posts", title: "Posts & activity", short: "Posts", hint: "Paste one or two posts you want to improve. Include their text and optional links; impressions and engagement are not fetched.", kinds: [], prompts: ["Give a post one clear idea: a project decision, a lesson learned, or a useful explanation. Include context and a specific example.", "Attribute other people’s work and avoid confidential employer details. Posting is optional; this review cannot predict reach or hiring outcomes."] },
  { key: "certifications", title: "Certifications", short: "Certifications", hint: "Include the credential name, issuing organization, and any verification link or expiry date you want to show.", kinds: ["certification"], prompts: ["Check the issuer, credential name, and current status against the issuing organization’s records.", "Separate completed credentials from courses you are taking. Include a public verification link only if you want it shared."] },
  { key: "contact", title: "Contact & links", short: "Contact", hint: "Paste the professional contact or portfolio links you want to review. Include only information you are comfortable sharing.", kinds: ["link"], prompts: ["Choose a contact route appropriate for your intended audience. Review its visibility in LinkedIn settings.", "Test portfolio and website destinations yourself. Text matching does not check ownership, safety, or availability."] },
] as const;
export type LinkedInSectionKey = typeof LINKEDIN_SECTIONS[number]["key"];
export type LinkedInSections = Record<LinkedInSectionKey, string>;
export const LINKEDIN_TEXT_LIMIT = 30_000;
export const emptyLinkedInSections = (): LinkedInSections => Object.fromEntries(LINKEDIN_SECTIONS.map((section) => [section.key, ""])) as LinkedInSections;
const aliases: Record<string, LinkedInSectionKey> = { headline: "headline", header: "headline", introduction: "headline", about: "about", summary: "about", experience: "experience", education: "education", skills: "skills", endorsements: "endorsements", recommendations: "endorsements", featured: "featured", projects: "featured", posts: "posts", activity: "posts", certifications: "certifications", "licenses & certifications": "certifications", "licenses and certifications": "certifications", contact: "contact", "contact info": "contact", "contact information": "contact" };

// Only explicit headings establish sections. Unlabelled profile text is compared
// globally, never silently assigned to an experience or About field.
export function splitLinkedInPaste(text: string): LinkedInSections {
  const sections = emptyLinkedInSections();
  let key: LinkedInSectionKey | null = null;
  for (const line of text.slice(0, LINKEDIN_TEXT_LIMIT).split(/\r?\n/)) {
    const heading = line.trim().replace(/:$/, "").replace(/\s*\(\d+\)$/, "").toLowerCase();
    if (aliases[heading]) key = aliases[heading];
    else if (key) sections[key] += `${sections[key] ? "\n" : ""}${line}`;
  }
  return sections;
}
export interface SectionReview {
  key: LinkedInSectionKey;
  title: string;
  supplied: boolean;
  characters: number;
  matches: LinkedInReviewItem[];
  observations: string[];
  prompts: string[];
  reference: string[];
}
export interface LinkedInReviewReport {
  mode: "paste" | "sections";
  sections: SectionReview[];
  phrases: LinkedInReviewItem[];
  supplied: number;
}

function references(profile: CareerEvidenceProfile, key: LinkedInSectionKey): string[] {
  const records = key === "experience" ? profile.experience : key === "education" ? profile.education : key === "certifications" ? profile.certifications : [];
  return (records ?? []).map((record) => [record.title, record.organization, [record.startDate, record.endDate].filter(Boolean).join(" – ")].filter(Boolean).join(" · "));
}
export function reviewLinkedInSections(profile: CareerEvidenceProfile, input: string | LinkedInSections): LinkedInReviewReport {
  const mode = typeof input === "string" ? "paste" : "sections";
  const content = typeof input === "string" ? splitLinkedInPaste(input) : input;
  const sections = LINKEDIN_SECTIONS.map((section): SectionReview => {
    const text = content[section.key].trim();
    const kinds: readonly string[] = section.kinds;
    const matches = text ? reviewLinkedInText(profile, text).filter((item) => kinds.includes(item.kind)) : [];
    const observations: string[] = [];
    if (text) {
      observations.push(`${text.length.toLocaleString()} characters supplied for this section.`);
      if (matches.length) observations.push(`${matches.filter((item) => item.found).length} of ${matches.length} saved reference phrases found. Wording differences need manual review.`);
      if ((section.key === "experience" || section.key === "certifications") && !/\b(?:19|20)\d{2}\b|\bpresent\b|\bcurrent\b/i.test(text)) observations.push("No year or current-date wording detected in this paste. Check whether dates or validity details would help.");
      if (section.key === "about" && text.split(/\s+/).length > 80 && text.split(/\n\s*\n/).length === 1) observations.push("This is one long paragraph. Consider separating your introduction, an example, and your next direction.");
      if (section.key === "headline" && text.split(/\s+/).length > 30) observations.push("This headline is over 30 words. Consider a shorter opening that makes your focus easier to scan; this is an editorial suggestion, not a LinkedIn limit.");
      if (section.key === "featured" || section.key === "contact") observations.push(/https?:\/\/\S+/i.test(text) ? "A web link is present in the paste. Its destination has not been opened or verified." : "No full web link detected. If you intend to share a destination, include its URL and check it manually.");
      if (section.key === "skills") {
        const names = text.split(/[,;\n]/).map((item) => item.replace(/^[\s•*-]+/, "").trim().toLowerCase()).filter(Boolean);
        const duplicates = [...new Set(names.filter((name, index) => names.indexOf(name) !== index))];
        if (duplicates.length) observations.push(`Repeated entries in your list: ${duplicates.join(", ")}. Consider consolidating them.`);
      }
      if (section.key === "endorsements") observations.push("Manual review only. This text cannot verify who endorsed a skill, the accuracy of a count, or a recommendation’s authenticity.");
      if (section.key === "posts") observations.push("Only the pasted post text is available. Posting frequency, reactions, impressions, and audience reach have not been assessed.");
      if (section.key === "headline") observations.push("Photo and banner appearance are not assessed from text. Check them directly on LinkedIn.");
    }
    const prompts: string[] = [...section.prompts];
    const target = profile.careerDirection.targetRole?.value;
    if (target && ["headline", "about", "skills"].includes(section.key)) prompts.push(`Your saved target role is “${target}”. Use it as direction, without presenting it as a position you already hold.`);
    if (section.key === "posts") {
      const selected = profile.githubEvidence.repositories.filter((item) => item.selectedForPortfolio || item.selectedForShowcase).slice(0, 2);
      for (const project of selected) prompts.push(`Post outline for “${project.name}”: the problem → your contribution → one design decision → what you learned. Add only details you can support.`);
    }
    return { key: section.key, title: section.title, supplied: Boolean(text), characters: text.length, matches, observations, prompts, reference: references(profile, section.key) };
  });
  return { mode, sections, phrases: typeof input === "string" ? reviewLinkedInText(profile, input.slice(0, LINKEDIN_TEXT_LIMIT)) : sections.flatMap((section) => section.matches), supplied: sections.filter((section) => section.supplied).length };
}

export function formatLinkedInReview(report: LinkedInReviewReport, username: string): string {
  return [`LinkedIn review for @${username}`, `${report.supplied} of ${LINKEDIN_SECTIONS.length} sections supplied or identified. This is input coverage, not a quality score.`, "Based on supplied text and saved career evidence. No live profile, identity, dates, endorsements, links, or engagement were verified. Unprovided sections are unknown, not missing from LinkedIn. This file contains findings and guidance, not the complete supplied profile.", ...report.sections.flatMap((section) => ["", section.title.toUpperCase(), section.supplied ? "Text supplied" : report.mode === "paste" ? "Section not identified in paste" : "Not supplied", ...section.observations.map((text) => `- ${text}`), ...section.matches.map((item) => `- ${item.found ? "Phrase found" : "Review wording"}: ${item.label}`), ...section.reference.map((text) => `- Saved reference (check manually): ${text}`), ...section.prompts.map((text) => `- Suggested action: ${text}`)]), ...(report.mode === "paste" ? ["", "WHOLE-PASTE PHRASE COMPARISON", ...report.phrases.map((item) => `${item.found ? "Phrase found" : "Review wording"}: ${item.label}`)] : [])].join("\n");
}
