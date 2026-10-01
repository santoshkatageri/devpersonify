import { parseGitHubUsername } from "../features/github-audit/github-username";
import { workflowContextFromPath, type WorkflowContext } from "./workflow-context";

const LAST_WORKFLOW = "devpersonify:last-workflow:v1";
const prefixes = { career: "devpersonify:career-evidence:v1:", preparation: "devpersonify:preparation:v1:", audit: "devpersonify:audit:v1:" };
export interface SavedWorkflow extends WorkflowContext { to: string; hasCareer: boolean; updatedAt: number }
function read(key: string): Record<string, unknown> | null {
  try { const value: unknown = JSON.parse(localStorage.getItem(key) ?? "null"); return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null; } catch { return null; }
}
function username(value: unknown): value is string {
  return typeof value === "string" && parseGitHubUsername(value).ok && /^[a-z0-9-]+$/i.test(value);
}
function savedFor(name: string): SavedWorkflow[] {
  const key = name.toLowerCase();
  const career = read(prefixes.career + key);
  const preparation = read(prefixes.preparation + key);
  const audit = read(prefixes.audit + key);
  const hasCareer = Boolean(career?.schemaVersion === 1 && typeof career.username === "string" && career.username.toLowerCase() === key && career.identity && career.careerDirection && career.githubEvidence && Array.isArray(career.resumeReview) && career.derived);
  const hasPreparation = Boolean(preparation?.version === 1 && typeof preparation.username === "string" && preparation.username.toLowerCase() === key && preparation.profile && Array.isArray(preparation.portfolioOrder));
  const user = audit?.user as Record<string, unknown> | undefined;
  const hasAudit = Boolean(typeof user?.login === "string" && user.login.toLowerCase() === key && Array.isArray(audit?.repositories) && typeof audit?.savedAt === "string");
  const time = (value: unknown) => typeof value === "string" && Number.isFinite(Date.parse(value)) ? Date.parse(value) : 0;
  const encoded = encodeURIComponent(name);
  return [
    ...(hasCareer ? [{ username: name, stage: "career" as const, to: `/career/${encoded}?step=preview`, hasCareer, updatedAt: time(career?.updatedAt) }] : []),
    ...(hasPreparation ? [{ username: name, stage: "preparation" as const, to: `/audit/${encoded}/prepare`, hasCareer, updatedAt: time(preparation?.updatedAt) }] : []),
    ...(hasAudit ? [{ username: name, stage: "audit" as const, to: `/audit/${encoded}`, hasCareer, updatedAt: time(audit?.savedAt) }] : []),
  ];
}
function safeRoute(to: unknown): { to: string; context: WorkflowContext } | null {
  if (typeof to !== "string" || !/^\/(audit|career)\//.test(to)) return null;
  try {
    const url = new URL(to, "https://local.invalid");
    const context = workflowContextFromPath(url.pathname);
    if (url.origin !== "https://local.invalid" || !context || !username(context.username)) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    const allowed = parts[0] === "career" ? parts.length === 2 || (parts.length === 3 && ["readme", "resume", "linkedin-review"].includes(parts[2]!)) : parts.length === 2 || (parts.length === 3 && parts[2] === "prepare") || (parts.length === 5 && parts[2] === "repositories");
    return allowed ? { to: url.pathname + url.search, context } : null;
  } catch { return null; }
}
export function rememberWorkflow(to: string): void {
  const route = safeRoute(to);
  if (!route) return;
  // A tab keeps its own place; the browser-wide value also survives reopening.
  try { sessionStorage.setItem(LAST_WORKFLOW, route.to); } catch { /* Optional navigation aid. */ }
  try { localStorage.setItem(LAST_WORKFLOW, route.to); } catch { /* Core workflow remains available. */ }
}
export function savedWorkflow(): SavedWorkflow | null {
  try {
    let tabRoute: string | null = null;
    try { tabRoute = sessionStorage.getItem(LAST_WORKFLOW); } catch { /* Fall back to saved data. */ }
    for (const candidate of [tabRoute, localStorage.getItem(LAST_WORKFLOW)]) {
      const route = safeRoute(candidate);
      if (!route) continue;
      const saved = savedFor(route.context.username).sort((a, b) => b.updatedAt - a.updatedAt);
      if (!saved.length) continue;
      const needsCareer = route.to.startsWith("/career/");
      const matching = needsCareer ? saved.find((item) => item.hasCareer) : saved.find((item) => item.stage !== "career");
      if (matching) return { ...matching, ...route.context, to: route.to };
      return saved[0]!;
    }
    const names = new Set(Object.keys(localStorage).flatMap((key) => {
      const prefix = Object.values(prefixes).find((value) => key.startsWith(value));
      const name = prefix ? key.slice(prefix.length) : "";
      return username(name) ? [name] : [];
    }));
    return [...names].flatMap(savedFor).sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;
  } catch { return null; }
}
