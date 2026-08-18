import { copyTextExactly, downloadTextFile } from "./browser-output";

function setClipboard(value: { writeText: (text: string) => Promise<void> } | undefined) {
  Object.defineProperty(navigator, "clipboard", { value, configurable: true });
}

function setExecCommand(value: (command: string) => boolean) {
  Object.defineProperty(document, "execCommand", { value, configurable: true });
}

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

describe("browser-local output actions", () => {
  it("prefers navigator.clipboard and writes the exact source", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });
    const source = "# Heading\n\n- **exact_source** &amp; text\n";
    await expect(copyTextExactly(source)).resolves.toBe("async-clipboard");
    expect(writeText).toHaveBeenCalledWith(source);
  });

  it("falls back to an offscreen textarea when the Clipboard API rejects", async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new DOMException("Denied", "NotAllowedError")) });
    let selectedValue = "";
    setExecCommand((command) => {
      selectedValue = (document.activeElement as HTMLTextAreaElement).value;
      return command === "copy";
    });
    const source = "exact\nMarkdown | source_with_underscores\n";
    await expect(copyTextExactly(source)).resolves.toBe("textarea-fallback");
    expect(selectedValue).toBe(source);
    expect(document.querySelector("textarea[aria-hidden='true']")).toBeNull();
  });

  it("reports failure when neither clipboard mechanism is permitted", async () => {
    setClipboard(undefined);
    setExecCommand(() => false);
    await expect(copyTextExactly("source")).rejects.toThrow(/unavailable/i);
  });

  it("creates an exact browser-local Markdown download", async () => {
    const createObjectURL = vi.fn().mockReturnValue("blob:test");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { value: createObjectURL, configurable: true });
    Object.defineProperty(URL, "revokeObjectURL", { value: revokeObjectURL, configurable: true });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const source = "# Exact\n\nMarkdown source\n";
    downloadTextFile(source, "developer-github-profile-readme.md", "text/markdown;charset=utf-8");
    const blob = createObjectURL.mock.calls[0]?.[0] as Blob;
    expect(blob.type).toBe("text/markdown;charset=utf-8");
    expect(await readBlob(blob)).toBe(source);
    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });
});
