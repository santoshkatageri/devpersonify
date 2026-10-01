import type { CareerEvidenceProfile, CareerRecord } from "../../domain/career-evidence-profile";
import type { LatexResumeConfiguration } from "../../domain/latex-resume";

const marker = /^(?:[•●▪◦]|[-*]\s)\s*/;
const withoutMarker = (value: string) => value.trim().replace(marker, "");

function appendWrappedLine(previous: string, line: string): string {
  // A soft hyphen explicitly marks a discretionary break. Ordinary hyphens may
  // be meaningful (for example, "semi-manual"), so retain them.
  if (previous.endsWith("\u00ad")) return previous.slice(0, -1) + line;
  return previous + (previous.endsWith("-") ? "" : " ") + line;
}

/** Preserve authored lines; repair PDF wrapping only with original-source evidence. */
export function resumeDescriptionParagraphs(value: string, pdfText?: string): string[] {
  const lines = value.replaceAll("\r\n", "\n").split("\n").map((line) => line.trim());
  const source = pdfText?.split("\n").map((line) => line.trim()) ?? [];
  const hasMarkers = lines.some((line) => marker.test(line));
  const paragraphs: string[] = [];
  let previousSourceIndex = -1;
  let separated = true;
  for (const line of lines) {
    if (!line) { separated = true; previousSourceIndex = -1; continue; }
    const clean = withoutMarker(line);
    if (!clean) continue;
    const matches = source.flatMap((candidate, index) => {
      const normalized = withoutMarker(candidate);
      // Also accommodate a user adding detail to an existing extracted line.
      return normalized === clean || (normalized.length >= 40 && clean.startsWith(normalized)) ? [index] : [];
    });
    const sourceIndex = previousSourceIndex >= 0 && matches.includes(previousSourceIndex + 1) ? previousSourceIndex + 1 : matches.length === 1 ? matches[0]! : -1;
    const sourceContinues = sourceIndex > 0 && sourceIndex === previousSourceIndex + 1 && !marker.test(source[sourceIndex]!);
    const explicitContinuation = hasMarkers && !marker.test(line);
    if (!separated && paragraphs.length && (hasMarkers ? explicitContinuation : sourceContinues)) {
      paragraphs[paragraphs.length - 1] = appendWrappedLine(paragraphs[paragraphs.length - 1]!, clean);
    } else paragraphs.push(clean);
    separated = false;
    previousSourceIndex = sourceIndex;
  }
  return paragraphs;
}

export function resumeRecordParagraphs(profile: CareerEvidenceProfile, config: LatexResumeConfiguration, type: string, record: CareerRecord): string[] {
  const override = config.overrides[`${type}:${record.id}:description`];
  return resumeDescriptionParagraphs(override?.value ?? record.description ?? "", !override && profile.resumeEvidence?.fileType === "PDF" ? profile.resumeEvidence.text : undefined);
}
