import type { CareerEvidenceProfile } from "../../domain/career-evidence-profile";
import { exportProfileBackup, importProfileBackup } from "./profile-backup";

const observedAt = "2026-10-01T00:00:00.000Z";
const source = { source: "USER_PROVIDED" as const, sourceId: "user:headline", observedAt };
const profile: CareerEvidenceProfile = {
  schemaVersion: 1, id: "career:developer", username: "developer", createdAt: observedAt, updatedAt: observedAt,
  identity: { name: { id: "name", value: "Developer", provenance: [source], updatedAt: observedAt } },
  careerDirection: { professionalHeadline: { id: "headline", value: "Platform Engineer", provenance: [source], updatedAt: observedAt } },
  githubEvidence: {
    username: "developer", profileUrl: "https://github.com/developer", observedAt,
    repositories: [{
      repositoryId: "repo-1", name: "service-api", url: "https://github.com/developer/service-api",
      topics: ["TypeScript"], isFork: false, selectedForPortfolio: true, selectedForShowcase: true,
      provenance: { source: "GITHUB_OBSERVED", sourceId: "repo-1", observedAt },
    }],
  },
  resumeEvidence: { id: "resume-1", fileType: "PASTED_TEXT", text: "Private resume content", importedAt: observedAt, sizeBytes: 22, private: true },
  resumeReview: [{
    id: "review-1", section: "skills", title: "TypeScript", organization: "", description: "",
    startDate: "", endDate: "", technologies: [], url: "", status: "ACCEPTED", provenance: source,
  }],
  experience: [], education: [],
  skills: [{ id: "skill-1", name: "TypeScript", normalizedName: "typescript", provenance: [source], githubRepositoryIds: [], updatedAt: observedAt }],
  projects: [], certifications: [], achievements: [], professionalLinks: [], other: [],
  userProvided: [source],
  derived: {
    comparisons: [], completeness: [],
    sourceCoverage: { github: "NONE", resume: "NONE", userProvided: "NONE", crossSourceSupport: 0, potentialGaps: 0 },
    generatedAt: observedAt,
  },
  sectionPreferences: {
    headline: true, summary: true, experience: true, selectedProjects: true, skills: true,
    education: true, certifications: true, achievements: true, links: true,
  },
};

function damaged(change: (value: CareerEvidenceProfile) => void): string {
  const envelope = JSON.parse(exportProfileBackup(profile)) as { profile: CareerEvidenceProfile };
  change(envelope.profile);
  return JSON.stringify(envelope);
}

describe("career profile backup", () => {
  it("round trips private data and recomputes derived evidence", () => {
    const restored = importProfileBackup(exportProfileBackup(profile));
    expect(restored.resumeEvidence?.text).toBe("Private resume content");
    expect(restored.derived.sourceCoverage.github).toBe("PARTIAL");
    expect(restored.derived.comparisons.some((item) => item.subject === "TypeScript")).toBe(true);
  });

  it("rejects a different username, malformed JSON, and incomplete profiles", () => {
    expect(() => importProfileBackup(exportProfileBackup(profile), "another-user")).toThrow(/another username/);
    expect(() => importProfileBackup(damaged((value) => { value.username = "not/a/username"; }))).toThrow(/another username/);
    expect(() => importProfileBackup("{", "developer")).toThrow(/valid JSON/);
    expect(() => importProfileBackup(damaged((value) => { value.skills = undefined as never; }), "developer")).toThrow(/incomplete/);
  });

  it("rejects nested corrupt data before replacing the current profile", () => {
    const corrupt = [
      damaged((value) => { value.identity.name!.value = [] as never; }),
      damaged((value) => { value.githubEvidence.repositories[0]!.topics = null as never; }),
      damaged((value) => { value.githubEvidence.repositories[0]!.provenance = {} as never; }),
      damaged((value) => { value.skills[0]!.provenance = [null] as never; }),
      damaged((value) => { value.resumeReview[0]!.status = "BROKEN" as never; }),
      damaged((value) => { value.sectionPreferences.skills = "yes" as never; }),
    ];
    for (const source of corrupt) expect(() => importProfileBackup(source, "developer")).toThrow(/incomplete or damaged/);
  });
});
