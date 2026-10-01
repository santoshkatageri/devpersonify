import type { CareerEvidenceProfile } from "../../domain/career-evidence-profile";
import { reviewLinkedInText } from "./linkedin-review";

const profile = {
  identity: {}, professionalLinks: [],
  careerDirection: { professionalHeadline: { value: "Platform Engineer" }, shortIntroduction: { value: "Building reliable developer tools" } },
  experience: [{ title: "Senior Engineer" }],
  skills: [{ name: "TypeScript" }, { name: "Kubernetes" }],
  projects: [{ title: "Developer Portal" }],
  githubEvidence: { repositories: [{ name: "service-api", selectedForPortfolio: true }] },
} as unknown as CareerEvidenceProfile;

describe("manual LinkedIn review", () => {
  it("finds exact normalized phrases and leaves other evidence for review", () => {
    const results = reviewLinkedInText(profile, "Platform engineer. Senior Engineer at Example. TypeScript. Developer Portal.");
    expect(results.find((item) => item.label === "Platform Engineer")?.found).toBe(true);
    expect(results.find((item) => item.label === "Kubernetes")?.found).toBe(false);
    expect(results.find((item) => item.label === "service-api")?.found).toBe(false);
  });

  it("keeps C, C++, and C# distinct instead of reporting false support", () => {
    const symbols = { ...profile, skills: ["C", "C++", "C#"].map((name) => ({ name })) } as CareerEvidenceProfile;
    const results = reviewLinkedInText(symbols, "I build services in C#.").filter((item) => item.kind === "skill");
    expect(results.map(({ label, found }) => [label, found])).toEqual([["C", false], ["C++", false], ["C#", true]]);
  });
});
