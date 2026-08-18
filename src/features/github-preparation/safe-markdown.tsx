import { Fragment, type ReactNode } from "react";

function decodeEntities(value: string): string {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&amp;", "&");
}

function safeLink(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function findClosing(value: string, marker: string, start: number): number {
  let index = start;
  while (index < value.length) {
    const found = value.indexOf(marker, index);
    if (found === -1) return -1;
    let backslashes = 0;
    for (let cursor = found - 1; cursor >= 0 && value[cursor] === "\\"; cursor -= 1) backslashes += 1;
    if (backslashes % 2 === 0) return found;
    index = found + 1;
  }
  return -1;
}

function renderMarkdownInline(value: string, keyPrefix = "inline"): ReactNode[] {
  const nodes: ReactNode[] = [];
  let text = "";
  let index = 0;
  const flush = () => {
    if (!text) return;
    nodes.push(<Fragment key={`${keyPrefix}-text-${nodes.length}`}>{decodeEntities(text)}</Fragment>);
    text = "";
  };

  while (index < value.length) {
    if (value[index] === "\\" && index + 1 < value.length) {
      text += value[index + 1];
      index += 2;
      continue;
    }
    if (value.startsWith("**", index)) {
      const closing = findClosing(value, "**", index + 2);
      if (closing !== -1) {
        flush();
        const content = value.slice(index + 2, closing);
        nodes.push(<strong key={`${keyPrefix}-strong-${nodes.length}`}>{renderMarkdownInline(content, `${keyPrefix}-strong-${nodes.length}`)}</strong>);
        index = closing + 2;
        continue;
      }
    }
    if (value[index] === "[") {
      const labelEnd = findClosing(value, "]", index + 1);
      if (labelEnd !== -1 && value[labelEnd + 1] === "(") {
        const urlEnd = findClosing(value, ")", labelEnd + 2);
        if (urlEnd !== -1) {
          const href = safeLink(value.slice(labelEnd + 2, urlEnd));
          if (href) {
            flush();
            const label = value.slice(index + 1, labelEnd);
            nodes.push(<a key={`${keyPrefix}-link-${nodes.length}`} href={href} target="_blank" rel="noreferrer" className="text-cobalt-600 underline decoration-cobalt-200 underline-offset-2">{renderMarkdownInline(label, `${keyPrefix}-link-${nodes.length}`)}</a>);
            index = urlEnd + 1;
            continue;
          }
        }
      }
    }
    text += value[index];
    index += 1;
  }
  flush();
  return nodes;
}

interface MarkdownBlock {
  type: "heading1" | "heading2" | "paragraph" | "list";
  lines: string[];
}

function parseSafeMarkdown(markdown: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  let paragraph: string[] = [];
  let list: string[] = [];
  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: "paragraph", lines: [paragraph.join(" ")] });
    paragraph = [];
  };
  const flushList = () => {
    if (list.length) blocks.push({ type: "list", lines: list });
    list = [];
  };

  for (const line of lines) {
    if (!line.trim()) {
      flushParagraph();
      flushList();
    } else if (line.startsWith("# ")) {
      flushParagraph(); flushList(); blocks.push({ type: "heading1", lines: [line.slice(2)] });
    } else if (line.startsWith("## ")) {
      flushParagraph(); flushList(); blocks.push({ type: "heading2", lines: [line.slice(3)] });
    } else if (line.startsWith("- ")) {
      flushParagraph(); list.push(line.slice(2));
    } else {
      flushList(); paragraph.push(line);
    }
  }
  flushParagraph();
  flushList();
  return blocks;
}

export function SafeMarkdownPreview({ markdown }: { markdown: string }) {
  const blocks = parseSafeMarkdown(markdown);
  return <article className="space-y-4" data-testid="markdown-preview">{blocks.map((block, index) => {
    const key = `block-${index}`;
    if (block.type === "heading1") return <h1 key={key} className="text-3xl font-semibold tracking-[-.035em]">{renderMarkdownInline(block.lines[0] ?? "", key)}</h1>;
    if (block.type === "heading2") return <h2 key={key} className="border-b border-slate-200 pb-2 pt-4 text-xl font-semibold tracking-[-.02em]">{renderMarkdownInline(block.lines[0] ?? "", key)}</h2>;
    if (block.type === "list") return <ul key={key} className="list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">{block.lines.map((line, lineIndex) => <li key={`${key}-${lineIndex}`}>{renderMarkdownInline(line, `${key}-${lineIndex}`)}</li>)}</ul>;
    return <p key={key} className="text-sm leading-6 text-slate-600">{renderMarkdownInline(block.lines[0] ?? "", key)}</p>;
  })}</article>;
}
