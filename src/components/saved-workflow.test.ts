import { rememberWorkflow, savedWorkflow } from "./saved-workflow";
const marker = "devpersonify:last-workflow:v1";
function audit(username: string, savedAt = "2026-10-01T10:00:00Z") { localStorage.setItem(`devpersonify:audit:v1:${username}`, JSON.stringify({ user: { login: username }, repositories: [], savedAt })); }
function prep(username: string) { localStorage.setItem(`devpersonify:preparation:v1:${username}`, JSON.stringify({ username, version: 1, profile: {}, portfolioOrder: [], updatedAt: "2026-10-01T09:00:00Z" })); }
function career(username: string) { localStorage.setItem(`devpersonify:career-evidence:v1:${username}`, JSON.stringify({ username, schemaVersion: 1, identity: {}, careerDirection: {}, githubEvidence: {}, resumeReview: [], derived: {}, updatedAt: "2026-10-01T08:00:00Z" })); }
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
afterEach(() => sessionStorage.clear());
describe("returning to a saved workflow", () => {
  it("remembers the active user's stage and query while general pages leave it intact", () => {
    prep("developer"); audit("another", "2026-10-01T12:00:00Z");
    rememberWorkflow("/audit/developer/prepare?step=portfolio");
    rememberWorkflow("/privacy");
    expect(savedWorkflow()).toMatchObject({ username: "developer", to: "/audit/developer/prepare?step=portfolio", stage: "preparation" });
  });
  it("keeps tabs independent and recovers a saved route when reopening", () => {
    audit("developer"); audit("another"); career("developer");
    rememberWorkflow("/career/developer/resume?step=generate");
    localStorage.setItem(marker, "/audit/another");
    expect(savedWorkflow()?.to).toBe("/career/developer/resume?step=generate");
    sessionStorage.clear();
    expect(savedWorkflow()?.to).toBe("/audit/another");
  });
  it("finds existing saved data even before session tracking was introduced", () => {
    career("older"); audit("newer");
    expect(savedWorkflow()).toMatchObject({ username: "newer", stage: "audit" });
  });
  it("does not send users to deleted profiles or revive cleared sessions", () => {
    career("developer"); prep("developer");
    rememberWorkflow("/career/developer/resume?step=generate");
    localStorage.removeItem("devpersonify:career-evidence:v1:developer");
    expect(savedWorkflow()?.to).toBe("/audit/developer/prepare");
    localStorage.removeItem("devpersonify:preparation:v1:developer");
    expect(savedWorkflow()).toBeNull();
  });
  it("ignores malformed entries, external routes, and unavailable storage", () => {
    localStorage.setItem("devpersonify:career-evidence:v1:broken", "{");
    localStorage.setItem("devpersonify:audit:v1:invalid", JSON.stringify({ user: { login: "someone-else" }, repositories: [] }));
    localStorage.setItem(marker, "https://example.com/audit/developer");
    expect(savedWorkflow()).toBeNull();
    rememberWorkflow("//example.com/audit/developer");
    expect(sessionStorage.getItem(marker)).toBeNull();
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("Blocked"); });
    expect(savedWorkflow()).toBeNull();
    spy.mockRestore();
  });
});
