import { LATEX_RESUME_CONFIG_VERSION, type LatexResumeConfiguration } from "../../domain/latex-resume";

const PREFIX = "devpersonify:latex-resume:v1:";

function key(username: string): string { return `${PREFIX}${username.toLowerCase()}`; }

export function saveLatexResumeConfiguration(config: LatexResumeConfiguration): boolean {
  try { localStorage.setItem(key(config.username), JSON.stringify(config)); return true; } catch { return false; }
}

export function loadLatexResumeConfiguration(username: string): LatexResumeConfiguration | null {
  try {
    const raw = localStorage.getItem(key(username));
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const config = value as Partial<LatexResumeConfiguration>;
    if (config.schemaVersion !== LATEX_RESUME_CONFIG_VERSION || config.username?.toLowerCase() !== username.toLowerCase() || !Array.isArray(config.sections) || !config.selections || !config.overrides) return null;
    return config as LatexResumeConfiguration;
  } catch { return null; }
}

export function clearLatexResumeConfiguration(username: string): void { localStorage.removeItem(key(username)); }
