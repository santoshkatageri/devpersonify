import { resumeDescriptionParagraphs } from "./resume-paragraphs";

describe("resume paragraph boundaries", () => {
  it("keeps explicit bullets together across PDF visual lines", () => {
    expect(resumeDescriptionParagraphs("Intro spanning\ntwo lines.\n• Built a service across\nmultiple regions.\n• Reduced deployment\ntime by half.")).toEqual([
      "Intro spanning two lines.", "Built a service across multiple regions.", "Reduced deployment time by half.",
    ]);
  });

  it("repairs older imports using exact source boundaries, including uppercase continuations", () => {
    const source = "EXPERIENCE\nEngineer\nExample Company\nIntro using\nTypeScript.\n• Built APIs across\nAWS and Azure.\n• Improved reliability.";
    expect(resumeDescriptionParagraphs("Intro using\nTypeScript.\nBuilt APIs across\nAWS and Azure.\nImproved reliability.", source)).toEqual([
      "Intro using TypeScript.", "Built APIs across AWS and Azure.", "Improved reliability.",
    ]);
  });

  it("preserves authored line lists, paragraph breaks, and unmatched changes", () => {
    expect(resumeDescriptionParagraphs("Built APIs\nReduced latency\n\nMentored engineers")).toEqual(["Built APIs", "Reduced latency", "Mentored engineers"]);
    expect(resumeDescriptionParagraphs("Built APIs\nEntirely changed wording", "• Built APIs\nfor clients.")).toEqual(["Built APIs", "Entirely changed wording"]);
    expect(resumeDescriptionParagraphs("• Built APIs\n\nStandalone detail\n• Reduced latency")).toEqual(["Built APIs", "Standalone detail", "Reduced latency"]);
  });

  it("retains real hyphens and removes only explicit discretionary hyphens", () => {
    expect(resumeDescriptionParagraphs("• Replaced a semi-\nmanual process with auto\u00ad\nmation.")).toEqual(["Replaced a semi-manual process with automation."]);
  });

  it("does not guess when a repeated source line has ambiguous predecessors", () => {
    expect(resumeDescriptionParagraphs("Updated services.\nAcross teams.", "• Updated services.\nAcross teams.\nOther section\n• Updated services.\nAcross teams.")).toEqual(["Updated services.", "Across teams."]);
  });
});
