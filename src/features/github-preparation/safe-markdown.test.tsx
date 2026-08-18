import { render, screen, within } from "@testing-library/react";
import { SafeMarkdownPreview } from "./safe-markdown";

describe("safe Markdown preview", () => {
  const markdown = `# Hi, I'm Navin Barange

## Introduction

Software Developer | AI &amp; Automation Enthusiast | Building useful tools

## Selected projects

- **[weather_forecast](https://github.com/example/weather_forecast)** — Weather Forecast | Dashboard
- **[web-scrapest](https://github.com/example/web-scrapest)** — Chrome extension

## Contact

- [Website](https://example.dev/profile?from=github)
- Location: Remote | Worldwide
`;

  it("renders headings, bold project links, ordinary pipes, underscores, URLs, and lists", () => {
    render(<SafeMarkdownPreview markdown={markdown} />);
    expect(screen.getByRole("heading", { level: 1, name: "Hi, I'm Navin Barange" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Selected projects" })).toBeInTheDocument();
    const projectLink = screen.getByRole("link", { name: "weather_forecast" });
    expect(projectLink).toHaveAttribute("href", "https://github.com/example/weather_forecast");
    expect(projectLink.closest("strong")).not.toBeNull();
    expect(screen.getByText(/Software Developer \| AI & Automation Enthusiast/)).toBeInTheDocument();
    expect(screen.getAllByRole("list")).toHaveLength(2);
    expect(within(screen.getAllByRole("list")[0]!).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Website" })).toHaveAttribute("href", "https://example.dev/profile?from=github");
  });

  it("renders escaped HTML and malicious link syntax as inert text", () => {
    const malicious = `# Safe profile

&lt;script&gt;window.hacked = true&lt;/script&gt;

- \\[click me\\](javascript:alert(1))
- **Safe \\*headline\\***
`;
    const { container } = render(<SafeMarkdownPreview markdown={malicious} />);
    expect(container.querySelector("script")).toBeNull();
    expect(screen.queryByRole("link", { name: "click me" })).not.toBeInTheDocument();
    expect(screen.getByText(/<script>window\.hacked = true<\/script>/)).toBeInTheDocument();
    expect(screen.getByText("Safe *headline*")).toBeInTheDocument();
  });
});
