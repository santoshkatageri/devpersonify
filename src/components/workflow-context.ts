export type WorkflowStage = "audit" | "preparation" | "career" | "resume";

export interface WorkflowContext {
  username: string;
  stage: WorkflowStage;
}

export function workflowContextFromPath(pathname: string): WorkflowContext | null {
  const segments = pathname.split("/").filter(Boolean);
  const decode = (value: string) => { try { return decodeURIComponent(value); } catch { return value; } };
  if (segments[0] === "audit" && segments[1]) {
    const username = decode(segments[1]);
    return { username, stage: segments[2] === "prepare" ? "preparation" : "audit" };
  }
  if (segments[0] === "career" && segments[1]) {
    const username = decode(segments[1]);
    if (segments[2] === "resume") return { username, stage: "resume" };
    if (segments[2] === "readme") return { username, stage: "preparation" };
    return { username, stage: "career" };
  }
  return null;
}

export function contextualHeaderAction(pathname: string): { label: string; to: string } {
  const context = workflowContextFromPath(pathname);
  if (!context) return { label: "Analyze my GitHub", to: "/audit" };
  const username = encodeURIComponent(context.username);
  if (context.stage === "audit") return { label: "Analyze my GitHub", to: `/audit/${username}` };
  if (context.stage === "preparation") return { label: "GitHub Audit", to: `/audit/${username}` };
  if (context.stage === "career") return { label: "GitHub Preparation", to: `/audit/${username}/prepare` };
  return { label: "Career Profile", to: `/career/${username}?step=preview` };
}
