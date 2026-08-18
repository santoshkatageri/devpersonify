export type ClipboardMethod = "async-clipboard" | "textarea-fallback";

function copyWithTextareaFallback(source: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = source;
  textarea.setAttribute("readonly", "");
  textarea.setAttribute("aria-hidden", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  textarea.style.width = "1px";
  textarea.style.height = "1px";
  textarea.style.padding = "0";
  textarea.style.border = "0";
  textarea.style.opacity = "0";
  textarea.style.fontSize = "16px";

  const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const selection = document.getSelection();
  const ranges: Range[] = [];
  if (selection) for (let index = 0; index < selection.rangeCount; index += 1) ranges.push(selection.getRangeAt(index).cloneRange());

  document.body.appendChild(textarea);
  try {
    textarea.focus({ preventScroll: true });
    textarea.select();
    textarea.setSelectionRange(0, source.length);
    return typeof document.execCommand === "function" && document.execCommand("copy");
  } finally {
    textarea.remove();
    if (selection) {
      selection.removeAllRanges();
      ranges.forEach((range) => selection.addRange(range));
    }
    activeElement?.focus({ preventScroll: true });
  }
}

export async function copyTextExactly(source: string): Promise<ClipboardMethod> {
  if (!source) throw new Error("Nothing to copy");
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(source);
      return "async-clipboard";
    }
  } catch {
    // Permission policy and sandboxed previews can reject the modern API.
    // Continue to the synchronous user-gesture fallback below.
  }
  if (copyWithTextareaFallback(source)) return "textarea-fallback";
  throw new Error("Clipboard access is unavailable");
}

export function downloadTextFile(source: string, filename: string, mimeType: string): void {
  if (!source) throw new Error("Nothing to download");
  downloadBlob(new Blob([source], { type: mimeType }), filename);
}

export function downloadBlob(blob: Blob, filename: string): void {
  if (!blob.size) throw new Error("Nothing to download");
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  try { anchor.click(); }
  finally {
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
