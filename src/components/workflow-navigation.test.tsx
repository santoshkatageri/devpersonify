import { contextualHeaderAction, workflowContextFromPath } from "./workflow-context";

describe("context-aware workflow navigation", () => {
  it.each([
    ["/audit/developer", { username: "developer", stage: "audit" }],
    ["/audit/developer/prepare", { username: "developer", stage: "preparation" }],
    ["/audit/developer/repositories/developer/project", { username: "developer", stage: "audit" }],
    ["/career/developer", { username: "developer", stage: "career" }],
    ["/career/developer/readme", { username: "developer", stage: "preparation" }],
    ["/career/developer/resume", { username: "developer", stage: "resume" }],
  ])("derives workflow context for %s", (path, expected) => expect(workflowContextFromPath(path)).toEqual(expected));

  it("provides contextual header actions without restarting the workflow", () => {
    expect(contextualHeaderAction("/audit/developer")).toEqual({ label: "Analyze my GitHub", to: "/audit/developer" });
    expect(contextualHeaderAction("/audit/developer/prepare")).toEqual({ label: "GitHub Audit", to: "/audit/developer" });
    expect(contextualHeaderAction("/career/developer")).toEqual({ label: "GitHub Preparation", to: "/audit/developer/prepare" });
    expect(contextualHeaderAction("/career/developer/resume")).toEqual({ label: "Career Profile", to: "/career/developer?step=preview" });
  });

  it("falls back to audit entry outside a username workflow", () => {
    expect(workflowContextFromPath("/")).toBeNull();
    expect(contextualHeaderAction("/")).toEqual({ label: "Analyze my GitHub", to: "/audit" });
  });
});
