import { strFromU8, unzipSync } from "fflate";

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const MAX_XML_BYTES = 2 * 1024 * 1024;
export interface WordParagraph { text: string; list: boolean; entryHeading: boolean; bold: boolean }
const elements = (parent: Element | Document, name: string) => [...parent.getElementsByTagNameNS(W, name)];
const attr = (element: Element | undefined, name = "val") => element?.getAttributeNS(W, name) ?? "";

/** Reads document structure locally. Never fetches relationships or external content. */
export function readWordParagraphs(data: Uint8Array): WordParagraph[] {
  let total = 0;
  const files = unzipSync(data, { filter: (entry) => {
    if (!/^(word\/(document|styles|header\d+|footer\d+)\.xml|word\/_rels\/document\.xml\.rels)$/.test(entry.name)) return false;
    total += entry.originalSize;
    if (entry.originalSize > MAX_XML_BYTES || total > 12 * 1024 * 1024) throw new Error("Document XML is too large");
    return true;
  } });
  const parse = (name: string): Document | undefined => {
    const bytes = files[name];
    if (!bytes) return undefined;
    const xml = new DOMParser().parseFromString(strFromU8(bytes), "application/xml");
    if (xml.getElementsByTagName("parsererror").length) throw new Error("Invalid Word XML");
    return xml;
  };
  const document = parse("word/document.xml");
  if (!document || !elements(document, "body").length) throw new Error("Missing Word document");
  const styles = new Map<string, Element>();
  const styleXml = parse("word/styles.xml");
  if (styleXml) for (const style of elements(styleXml, "style")) styles.set(attr(style, "styleId"), style);
  const relationships = new Map<string, string>();
  const rels = parse("word/_rels/document.xml.rels");
  if (rels) for (const rel of [...rels.getElementsByTagNameNS("*", "Relationship")]) {
    const target = rel.getAttribute("Target") ?? "";
    if (/^(https?:\/\/|mailto:)/i.test(target)) relationships.set(rel.getAttribute("Id") ?? "", target.replace(/^mailto:/i, ""));
  }
  function textOf(node: Element): string {
    if (node.namespaceURI === W) {
      if (["del", "moveFrom", "instrText", "pPr", "rPr"].includes(node.localName)) return "";
      if (node.localName === "t") return node.textContent ?? "";
      if (node.localName === "tab") return "\t";
      if (["br", "cr"].includes(node.localName)) return "\n";
      if (node.localName === "softHyphen") return "\u00ad";
      if (node.localName === "noBreakHyphen") return "-";
    }
    const text = [...node.children].map(textOf).join("");
    if (node.localName === "hyperlink") {
      const target = relationships.get(node.getAttributeNS(R, "id") ?? "");
      return target && !text.includes(target) ? `${text} ${target}`.trim() : text;
    }
    return text;
  }
  function paragraph(node: Element): WordParagraph {
    const styleId = attr(elements(node, "pStyle")[0]);
    const inherited: Element[] = [];
    let current = styleId;
    const seen = new Set<string>();
    while (current && !seen.has(current)) {
      seen.add(current);
      const style = styles.get(current);
      if (!style) break;
      inherited.push(style);
      current = attr(elements(style, "basedOn")[0]);
    }
    const properties = [node, ...inherited];
    const list = properties.some((source) => elements(source, "numPr").some((num) => attr(elements(num, "numId")[0]) !== "0"));
    const entryHeading = /^(Heading[2-9]|EntryTitle)$/i.test(styleId) || inherited.some((style) => elements(style, "outlineLvl").some((level) => Number(attr(level)) > 0 && Number(attr(level)) < 9));
    const runs = elements(node, "r").filter((run) => elements(run, "t").some((text) => text.textContent?.trim()));
    const bold = runs.length > 0 && runs.every((run) => elements(run, "b").some((b) => !["0", "false", "off"].includes(attr(b))));
    let text = textOf(node).trim();
    if (list && text && !/^[•●▪◦*-]\s/.test(text)) text = `• ${text}`;
    return { text, list: list || /^[•●▪◦]\s/.test(text), entryHeading, bold };
  }
  function walk(parent: Element): WordParagraph[] {
    return [...parent.children].flatMap((child): WordParagraph[] => {
      if (["del", "moveFrom"].includes(child.localName)) return [];
      if (child.localName === "p") return [paragraph(child)];
      if (child.localName === "tr") {
        const cells = [...child.children].filter((cell) => cell.localName === "tc").map(walk);
        // Typical role/date table rows belong together; multi-paragraph cells
        // remain in document order rather than interleaving their contents.
        if (cells.every((cell) => cell.length === 1)) {
          const row = cells.flat();
          return [{ text: row.map((item) => item.text).join("\t"), list: row.some((item) => item.list), entryHeading: row.some((item) => item.entryHeading), bold: row.some((item) => item.bold) }];
        }
        return cells.flat();
      }
      return walk(child);
    });
  }
  const headers = Object.keys(files).filter((name) => /^word\/header\d+\.xml$/.test(name)).sort();
  const footers = Object.keys(files).filter((name) => /^word\/footer\d+\.xml$/.test(name)).sort();
  const extra = (names: string[]) => names.flatMap((name) => { const xml = parse(name); return xml ? walk(xml.documentElement).filter((item) => item.text && !/^(?:page\s*)?\d+(?:\s*(?:of|\/)\s*\d+)?$/i.test(item.text)) : []; });
  return [...extra(headers), ...extra(footers), { text: "", list: false, entryHeading: false, bold: false }, ...walk(elements(document, "body")[0]!)];
}
