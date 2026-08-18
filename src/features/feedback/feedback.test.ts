import { createFeedbackPayload, feedbackAreaFromPath, feedbackQuestion, loadLocalFeedback, saveFeedbackLocally } from "./feedback";

describe("privacy-preserving feedback", () => {
  it.each([
    ["/audit/developer", "github_audit"], ["/audit/developer/prepare", "github_preparation"], ["/audit/developer/repositories/developer/project", "repository_detail"],
    ["/career/developer", "career_profile"], ["/career/developer/readme", "github_readme"], ["/career/developer/resume", "resume_builder"], ["/", "general"],
  ] as const)("maps %s to %s without storing username context", (path, area) => expect(feedbackAreaFromPath(path)).toBe(area));

  it("creates a minimal payload with no career/resume/GitHub content fields", () => {
    const payload = createFeedbackPayload("resume_builder", "useful", "idea", "Add keyboard shortcut", "2026-08-18T00:00:00Z");
    expect(payload).toMatchObject({ product: "DevPersonify", area: "resume_builder", rating: "useful", category: "idea", message: "Add keyboard shortcut", delivery: "LOCAL_LAUNCH_STUB" });
    expect(Object.keys(payload).sort()).toEqual(["applicationVersion", "area", "category", "createdAt", "delivery", "id", "message", "product", "rating"]);
    expect(JSON.stringify(payload)).not.toMatch(/resumeText|careerProfile|repository|latex|markdown|username/i);
  });

  it("stores feedback locally and limits retained entries", () => {
    for (let index = 0; index < 25; index += 1) expect(saveFeedbackLocally(createFeedbackPayload("github_audit", "great", "experience", `Message ${index}`))).toBe(true);
    const stored = loadLocalFeedback();
    expect(stored).toHaveLength(20);
    expect(stored.at(-1)?.message).toBe("Message 24");
  });

  it("provides contextual questions", () => {
    expect(feedbackQuestion("repository_detail")).toMatch(/evidence trace/i);
    expect(feedbackQuestion("github_readme")).toMatch(/README builder/i);
    expect(feedbackQuestion("career_profile")).toMatch(/represent your experience/i);
    expect(feedbackQuestion("resume_builder")).toMatch(/resume export/i);
  });
});
