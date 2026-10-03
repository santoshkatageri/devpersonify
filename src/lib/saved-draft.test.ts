import type { GithubReadmeConfiguration } from "../domain/github-readme";
import type { LatexResumeConfiguration } from "../domain/latex-resume";
import { DEFAULT_RESUME_SECTIONS } from "../features/latex-resume/resume-configuration";
import { readGithubReadmeDraft, replaceGithubReadmeDraft, saveGithubReadmeConfiguration } from "../features/github-readme/readme-storage";
import { readLatexResumeDraft, replaceLatexResumeDraft, saveLatexResumeConfiguration } from "../features/latex-resume/resume-storage";
const now = "2026-10-03T00:00:00Z";
const readme: GithubReadmeConfiguration = { schemaVersion: 1, username: "demo", updatedAt: now, selectedProjectIds: ["one"], projectOrder: ["one"], sections: { introduction: true, whatIBuild: true, selectedProjects: true, technologies: true, openSource: true, contact: false }, presentation: { professionalHeadline: "Engineer", shortIntroduction: "My text", currentFocus: "", additionalSkills: "", preferredTechnologies: "", location: "", website: "", linkedinUrl: "", email: "" } };
const resume: LatexResumeConfiguration = { schemaVersion: 1, username: "demo", updatedAt: now, templateId: "devpersonify-classic", templateVersion: "1.0", sections: DEFAULT_RESUME_SECTIONS.map((section) => ({ ...section, enabled: true })).reverse(), selections: { experience: ["role"], skills: [], projects: [], education: [], certifications: [], achievements: [], links: [] }, overrides: { summary: { key: "summary", value: "My private summary", source: "USER_PROVIDED", updatedAt: now } } };
const readmeKey = "devpersonify:github-readme:v1:demo";
const resumeKey = "devpersonify:latex-resume:v1:demo";
it("loads existing v1 drafts without changing selections, ordering, disabled sections, or private overrides", () => {
  expect(saveGithubReadmeConfiguration(readme)).toBe(true);
  expect(saveLatexResumeConfiguration(resume)).toBe(true);
  expect(readGithubReadmeDraft("DEMO").value).toEqual(readme);
  expect(readLatexResumeDraft("DEMO").value).toEqual(resume);
});
it.each([
  { ...readme, presentation: { ...readme.presentation, shortIntroduction: {} } },
  { ...readme, projectOrder: [2] }, { ...readme, selectedProjectIds: null },
  { ...readme, sections: { ...readme.sections, contact: "yes" } },
  { ...readme, username: "other" }, { ...readme, updatedAt: 3 },
])("rejects malformed nested README data and keeps its original bytes", (candidate) => {
  const raw = JSON.stringify(candidate); localStorage.setItem(readmeKey, raw);
  expect(readGithubReadmeDraft("demo").status).toBe("invalid");
  expect(saveGithubReadmeConfiguration(readme)).toBe(false);
  expect(localStorage.getItem(readmeKey)).toBe(raw);
});
it.each([
  { ...resume, selections: { ...resume.selections, experience: [false] } },
  { ...resume, selections: { ...resume.selections, unexpected: [] } },
  { ...resume, overrides: { summary: { key: "summary", value: [], source: "USER_PROVIDED", updatedAt: now } } },
  { ...resume, overrides: { summary: { key: "wrong", value: "x", source: "USER_PROVIDED", updatedAt: now } } },
  { ...resume, sections: [resume.sections[0], ...resume.sections] },
  { ...resume, sections: resume.sections.slice(1) },
  { ...resume, templateVersion: "2.0" }, { ...resume, selections: [] },
])("rejects unsafe resume settings before reconciliation or generation", (candidate) => {
  const raw = JSON.stringify(candidate); localStorage.setItem(resumeKey, raw);
  expect(readLatexResumeDraft("demo").status).toBe("invalid");
  expect(saveLatexResumeConfiguration(resume)).toBe(false);
  expect(localStorage.getItem(resumeKey)).toBe(raw);
});
it.each([0, 2, 100])("preserves unsupported version %i without attempting a guessed migration", (version) => {
  const raw = JSON.stringify({ ...resume, schemaVersion: version }); localStorage.setItem(resumeKey, raw);
  expect(readLatexResumeDraft("demo").status).toBe("unsupported");
  expect(saveLatexResumeConfiguration(resume)).toBe(false);
  expect(localStorage.getItem(resumeKey)).toBe(raw);
});
it("preserves invalid JSON until an explicit replacement and refuses stale recovery actions", () => {
  const raw = "{damaged but recoverable"; localStorage.setItem(readmeKey, raw);
  expect(readGithubReadmeDraft("demo")).toMatchObject({ status: "invalid", raw });
  expect(replaceGithubReadmeDraft(readme, "different original")).toBe(false);
  expect(localStorage.getItem(readmeKey)).toBe(raw);
  expect(replaceGithubReadmeDraft(readme, raw)).toBe(true);
  expect(readGithubReadmeDraft("demo").value).toEqual(readme);
});
it("leaves the original intact when explicit recovery hits a storage limit", () => {
  localStorage.setItem(resumeKey, "original");
  const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Full", "QuotaExceededError"); });
  try { expect(replaceLatexResumeDraft(resume, "original")).toBe(false); expect(localStorage.getItem(resumeKey)).toBe("original"); }
  finally { spy.mockRestore(); }
});
it("reports unavailable storage and rejects invalid values supplied for saving", () => {
  const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
  try { expect(readLatexResumeDraft("demo").status).toBe("unavailable"); } finally { spy.mockRestore(); }
  expect(saveGithubReadmeConfiguration({ ...readme, presentation: {} } as GithubReadmeConfiguration)).toBe(false);
});
