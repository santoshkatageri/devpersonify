import { parseLinkedInPdf } from "./linkedin-pdf";
const mocks = vi.hoisted(() => ({ getDocument: vi.fn() }));
vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => ({ getDocument: mocks.getDocument, GlobalWorkerOptions: {} }));
function pdfFile() {
  const file = new File(["%PDF-1.4"], "profile.pdf", { type: "application/pdf" });
  Object.defineProperty(file, "arrayBuffer", { value: async () => new TextEncoder().encode("%PDF-1.4").buffer });
  return file;
}
it("rejects too many pages before extraction and releases the PDF task", async () => {
  const destroy = vi.fn(); const getPage = vi.fn();
  mocks.getDocument.mockReturnValue({ promise: Promise.resolve({ numPages: 21, getPage }), destroy });
  await expect(parseLinkedInPdf(pdfFile())).rejects.toThrow("20 pages");
  expect(getPage).not.toHaveBeenCalled(); expect(destroy).toHaveBeenCalledOnce();
});
it.each([["", "No selectable text"], ["a".repeat(30_001), "30,000 characters"]])("rejects an unreadable or excessive text layer and cleans up", async (str, message) => {
  const destroy = vi.fn();
  const page = { getTextContent: async () => ({ items: [{ str, transform: [1, 0, 0, 1, 20, 700], width: 100, height: 12, hasEOL: true }] }), getViewport: () => ({ width: 612 }), cleanup: vi.fn() };
  mocks.getDocument.mockReturnValue({ promise: Promise.resolve({ numPages: 1, getPage: async () => page }), destroy });
  await expect(parseLinkedInPdf(pdfFile())).rejects.toThrow(message);
  expect(destroy).toHaveBeenCalledOnce();
});
it("provides a paste fallback for locked PDFs and releases the failed task", async () => {
  const destroy = vi.fn();
  mocks.getDocument.mockReturnValue({ promise: Promise.reject(new Error("Password required")), destroy });
  await expect(parseLinkedInPdf(pdfFile())).rejects.toThrow("unlocked LinkedIn export");
  expect(destroy).toHaveBeenCalledOnce();
});
