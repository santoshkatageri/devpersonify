import { readFile } from "node:fs/promises";
import { strFromU8, unzipSync } from "fflate";
import { expect, test, type Page, type Route } from "@playwright/test";

function failOnBrowserErrors(page: Page) {
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().startsWith("Failed to load resource:")) browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));
  return browserErrors;
}

async function expectNoHorizontalOverflow(page: Page) {
  const sizes = await page.evaluate(() => ({ body: document.body.scrollWidth, viewport: document.documentElement.clientWidth }));
  expect(sizes.body).toBeLessThanOrEqual(sizes.viewport);
}

const user = {
  login: "demo", id: 1, name: "Demo Developer", avatar_url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E", html_url: "https://github.com/demo",
  bio: "Public developer profile", company: null, blog: "", location: "Public GitHub", public_repos: 6, followers: 10, following: 2,
  created_at: "2018-01-01T00:00:00Z", updated_at: "2026-08-01T00:00:00Z",
};

function repository(id: number, name: string, overrides: Record<string, unknown> = {}) {
  return {
    id, name, full_name: `demo/${name}`, owner: { login: "demo", avatar_url: user.avatar_url }, html_url: `https://github.com/demo/${name}`,
    description: "A well documented public developer project with a clear purpose and useful details.", fork: false, archived: false, is_template: false,
    language: "TypeScript", topics: ["typescript", "developer-tools", "portfolio"], stargazers_count: 12, forks_count: 3, watchers_count: 12,
    open_issues_count: 1, default_branch: "main", created_at: "2024-01-01T00:00:00Z", updated_at: "2026-08-10T00:00:00Z",
    pushed_at: "2026-08-10T00:00:00Z", homepage: "https://example.dev", license: { spdx_id: "MIT" }, size: 100,
    has_issues: true, has_projects: true, has_wiki: false, visibility: "public", ...overrides,
  };
}

const repositories = [
  repository(1, "showcase-project"),
  repository(2, "keep-project", { homepage: null, stargazers_count: 1, forks_count: 0 }),
  repository(3, "archived-project", { archived: true, pushed_at: "2020-01-01T00:00:00Z", description: null, topics: [], license: null }),
  repository(4, "forked-project", { fork: true }),
  repository(5, "cleanup-project", { description: null, topics: [], stargazers_count: 0, forks_count: 0, homepage: null, license: null }),
  repository(6, "new-project", { created_at: "2026-08-15T00:00:00Z", description: null, topics: [], homepage: null }),
];

const rateHeaders = { "access-control-expose-headers": "x-ratelimit-limit,x-ratelimit-remaining,x-ratelimit-reset,link", "x-ratelimit-limit": "60", "x-ratelimit-remaining": "50", "x-ratelimit-reset": "1800000000" };

async function mockSuccessfulGitHub(page: Page, delay = 0) {
  const requests: string[] = [];
  await page.route("https://api.github.com/**", async (route: Route) => {
    const url = route.request().url();
    requests.push(url);
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    if (url.endsWith("/users/demo")) return route.fulfill({ json: user, headers: rateHeaders });
    if (url.includes("/users/demo/repos")) return route.fulfill({ json: repositories, headers: rateHeaders });
    if (url.includes("showcase-project/readme")) return route.fulfill({ json: { name: "README.md" }, headers: rateHeaders });
    if (url.endsWith("/readme")) return route.fulfill({ status: 404, json: { message: "Not Found" }, headers: rateHeaders });
    return route.fulfill({ status: 404, json: { message: "Not Found" }, headers: rateHeaders });
  });
  return requests;
}

test("refined landing page is clear, responsive, and console-clean", async ({ page }, testInfo) => {
  const errors = failOnBrowserErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Your work already tells a story");
  await expect(page.getByText("Illustrative output · example values")).toBeVisible();
  await expect(page.getByRole("link", { name: /Start here/i })).toBeVisible();
  await expect(page.getByText("Available")).toHaveCount(6);
  await expect(page.getByText(/planned/i)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Turn your evidence into a profile people can understand." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Turn the same evidence into a professional resume." })).toBeVisible();
  await expect(page.getByText(/LaTeX source and Word export/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your feedback becomes the next iteration." })).toBeVisible();
  await expect(page.getByText(/Feedback is currently saved locally/)).toBeVisible();
  await page.getByRole("heading", { name: "Your feedback becomes the next iteration." }).scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: /Send feedback/i }).last().click();
  const landingFeedback = page.getByRole("dialog", { name: "Help shape DevPersonify" });
  await expect(landingFeedback).toBeVisible();
  await expect(landingFeedback.getByText(/How was your DevPersonify experience/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Feedback", exact: true })).toHaveCount(0);
  await landingFeedback.getByRole("button", { name: "Close feedback" }).click();
  await expectNoHorizontalOverflow(page);
  if (testInfo.project.name === "desktop-chromium") await page.screenshot({ path: "docs/screenshots/phase-2-landing-desktop.png", fullPage: true });
  else await page.screenshot({ path: "docs/screenshots/phase-2-landing-mobile.png", fullPage: true });
  await page.goto("/audit");
  await expect(page.getByRole("heading", { level: 1, name: "See what your public work communicates." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start audit" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  expect(errors).toEqual([]);
});

test("successful audit supports stateful routed repository evidence navigation", async ({ page }, testInfo) => {
  const errors = failOnBrowserErrors(page);
  const requests = await mockSuccessfulGitHub(page, 120);
  const methods: string[] = [];
  page.on("request", (request) => { if (request.url().startsWith("https://api.github.com/")) methods.push(request.method()); });
  await page.goto("/audit/demo");
  await expect(page.getByText(/Fetching @demo|Analyzing repository evidence/)).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Demo Developer" })).toBeVisible();
  await expect(page.locator('nav[aria-label="Primary navigation"] a').filter({ hasText: "Analyze my GitHub" })).toHaveAttribute("href", "/audit/demo");
  const workflowNav = page.getByRole("navigation", { name: "DevPersonify workflow" });
  for (const label of ["Audit", "GitHub Profile", "Career Profile", "Resume"]) await expect(workflowNav.getByText(label, { exact: true })).toBeVisible();
  await expect(workflowNav).not.toContainText("1. Audit");
  await expect(workflowNav).not.toContainText("2. GitHub Profile");
  await expectNoHorizontalOverflow(page);

  await page.getByLabel("Search repositories").fill("ed-project");
  await page.getByLabel("Sort repositories").selectOption("name");
  await expect(page.getByRole("link", { name: /archived-project/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /forked-project/i }).first()).toBeVisible();
  await page.getByRole("link", { name: /archived-project/i }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "archived-project" })).toBeVisible();
  await expect(page.getByText("1 of 2")).toBeVisible();
  await expect(page.getByRole("link", { name: /Previous repository/i })).toHaveAttribute("aria-disabled", "true");
  await expect(page.getByRole("link", { name: /Next repository/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Complete evidence trace" })).toBeVisible();
  await expect(page.getByText("ABSENT").first()).toBeVisible();
  await expect(page.getByText("UNKNOWN").first()).toBeVisible();
  await expect(page.getByText("Description", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("No public repository description was observed.")).toBeVisible();
  await expect(page.getByText("This signal was not fetched and contributes neither positive nor negative points. Unknown is not absent.").first()).toBeVisible();
  await expect(page.getByText(/README not detected|Checking on demand/)).toBeVisible();
  await expect(page.getByText("Archive", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Keep", exact: true }).click();
  await expect(page.getByText("Your decision:").locator("..")).toContainText("KEEP");
  await page.getByRole("link", { name: /Next repository/i }).click();
  await expect(page.getByRole("heading", { level: 1, name: "forked-project" })).toBeVisible();
  await expect(page.getByText("2 of 2")).toBeVisible();
  await expect(page.getByRole("link", { name: /Next repository/i })).toHaveAttribute("aria-disabled", "true");
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1, name: "archived-project" })).toBeVisible();
  await page.goForward();
  await expect(page.getByRole("heading", { level: 1, name: "forked-project" })).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("heading", { level: 1, name: "archived-project" })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Your decision:").locator("..")).toContainText("KEEP");
  await page.getByRole("link", { name: /Back to repositories/i }).first().click();
  await expect(page.getByLabel("Search repositories")).toHaveValue("ed-project");
  await expect(page.getByLabel("Sort repositories")).toHaveValue("name");
  expect(page.url()).toContain("q=ed-project");
  expect(page.url()).toContain("sort=name");
  await page.goto("/audit/demo/repositories/demo/removed-repository?from=audit");
  await expect(page.getByRole("heading", { name: "This repository is no longer in the current audit." })).toBeVisible();

  expect(requests.filter((url) => url.includes("api.github.com")).length).toBeLessThanOrEqual(9);
  expect(methods.every((method) => method === "GET")).toBe(true);
  await page.goto("/audit/demo/repositories/demo/archived-project?q=ed-project&sort=name&from=audit");
  await expect(page.getByRole("heading", { level: 1, name: "archived-project" })).toBeVisible();
  if (testInfo.project.name === "desktop-chromium") await page.screenshot({ path: "docs/screenshots/phase-2-audit-detail-desktop.png", fullPage: true });
  else await page.screenshot({ path: "docs/screenshots/phase-2-audit-detail-mobile.png", fullPage: true });
  await expectNoHorizontalOverflow(page);
  expect(errors).toEqual([]);
});
test("persistent feedback is contextual, private, accessible, and mobile-safe", async ({ page }, testInfo) => {
  const errors = failOnBrowserErrors(page);
  const feedbackNetwork: string[] = [];
  let trackingFeedback = false;
  page.on("request", (request) => { if (trackingFeedback && !request.url().startsWith("http://127.0.0.1:4173")) feedbackNetwork.push(request.url()); });
  await mockSuccessfulGitHub(page);
  await page.goto("/audit/demo");
  await expect(page.getByRole("heading", { level: 1, name: "Demo Developer" })).toBeVisible();
  trackingFeedback = true;
  const feedbackButton = page.getByRole("button", { name: "Feedback", exact: true });
  await expect(feedbackButton).toBeVisible();
  const buttonBox = await feedbackButton.boundingBox();
  expect(buttonBox?.height).toBeGreaterThanOrEqual(40);
  await feedbackButton.click();
  const dialog = page.getByRole("dialog", { name: "Help shape DevPersonify" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/Did this audit help you understand your repositories/)).toBeVisible();
  const dialogBox = await dialog.boundingBox();
  const viewport = page.viewportSize()!;
  expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
  expect(dialogBox!.y).toBeGreaterThanOrEqual(0);
  expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(viewport.width);
  expect(dialogBox!.y + dialogBox!.height).toBeLessThanOrEqual(viewport.height);
  await dialog.getByRole("button", { name: "Useful" }).click();
  await dialog.getByRole("button", { name: "Bug" }).click();
  await dialog.getByLabel(/What should we improve/).fill("The filter could be clearer.");
  await dialog.getByRole("button", { name: "Send feedback" }).click();
  await expect(dialog.getByText(/Saved locally/)).toBeVisible();
  if (testInfo.project.name === "mobile-375") await page.screenshot({ path: "docs/screenshots/v1-feedback-375.png", fullPage: true });
  if (testInfo.project.name === "mobile-chromium") await page.screenshot({ path: "docs/screenshots/v1-feedback-390.png", fullPage: true });
  const payload = await page.evaluate(() => JSON.parse(localStorage.getItem("devpersonify:feedback:v1") ?? "[]").at(-1));
  expect(payload).toMatchObject({ product: "DevPersonify", area: "github_audit", rating: "useful", category: "bug", message: "The filter could be clearer.", delivery: "LOCAL_LAUNCH_STUB" });
  expect(Object.keys(payload).sort()).toEqual(["applicationVersion", "area", "category", "createdAt", "delivery", "id", "message", "product", "rating"]);
  await dialog.getByRole("button", { name: "Close feedback" }).click();
  await expect(dialog).not.toBeVisible();
  await feedbackButton.click();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expectNoHorizontalOverflow(page);
  expect(feedbackNetwork).toEqual([]);
  expect(errors).toEqual([]);
});

test("repository decisions, portfolio curation, README generation, and persistence work", async ({ page, context }, testInfo) => {
  const errors = failOnBrowserErrors(page);
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: "http://127.0.0.1:4173" });
  await mockSuccessfulGitHub(page);
  await page.goto("/audit/demo");
  await expect(page.getByRole("heading", { level: 1, name: "Demo Developer" })).toBeVisible();
  await page.getByRole("link", { name: /Prepare my GitHub/i }).click();
  await expect(page.getByRole("heading", { name: "Make the recommendation yours." })).toBeVisible();
  await expect(page.locator('nav[aria-label="Primary navigation"] a').filter({ hasText: "GitHub Audit" })).toHaveAttribute("href", "/audit/demo");
  await expectNoHorizontalOverflow(page);

  const showcaseDecision = page.getByLabel("Decision for showcase-project");
  await showcaseDecision.getByRole("button", { name: "Showcase", exact: true }).click();
  if (testInfo.project.name === "desktop-chromium") {
    await expect(page.getByText("Your decision: SHOWCASE").filter({ visible: true })).toBeVisible();
    await expect(page.getByText("Showcase", { exact: true }).filter({ visible: true }).first()).toBeVisible();
  } else {
    await expect(page.getByText("You: SHOWCASE", { exact: true })).toBeVisible();
    await expect(page.getByText(/DevPersonify: Showcase/i)).toBeVisible();
  }
  await page.getByLabel("Search repositories").fill("showcase-project");
  await page.getByLabel("Sort review workspace").selectOption("stars");
  await page.getByRole("link", { name: "showcase-project", exact: true }).filter({ visible: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "showcase-project" })).toBeVisible();
  await page.getByRole("button", { name: "Review", exact: true }).click();
  await page.getByRole("link", { name: /Back to repositories/i }).first().click();
  await expect(page.getByLabel("Search repositories")).toHaveValue("showcase-project");
  await expect(page.getByLabel("Sort review workspace")).toHaveValue("stars");
  await page.getByLabel("Search repositories").fill("");
  await page.getByLabel("Decision for showcase-project").getByRole("button", { name: "Showcase", exact: true }).click();

  await page.locator('input[aria-label="Select keep-project"]:visible').check();
  await page.locator('input[aria-label="Select cleanup-project"]:visible').check();
  await page.getByLabel("Bulk decision").selectOption("REVIEW");
  await expect(page.getByText(testInfo.project.name === "desktop-chromium" ? "Your decision: REVIEW" : "You: REVIEW", { exact: true }).filter({ visible: true }).first()).toBeVisible();

  await page.getByRole("button", { name: /Continue to portfolio/i }).click();
  await expect(page.getByRole("heading", { name: "My GitHub portfolio" })).toBeVisible();
  await expect(page.getByText("showcase-project").first()).toBeVisible();
  await page.getByRole("button", { name: "Add diverse suggestions" }).click();
  await expect(page.getByText(/selected projects/i).first()).toBeVisible();

  await page.getByRole("button", { name: /Continue to profile/i }).click();
  await page.getByLabel("Professional headline").fill("Platform engineer | Tooling & Automation");
  await page.getByLabel("Current focus").fill("Reliable developer platforms");
  await page.getByLabel("Short introduction").fill("I build practical developer tools.");
  await page.getByLabel("Location").fill("Remote | Worldwide");
  await page.getByLabel("Website").fill("https://example.dev/profile?from=github");
  await page.getByLabel("Additional skills").fill("Go, PostgreSQL");
  await page.getByRole("button", { name: /Generate README/i }).click();
  await expect(page.getByRole("heading", { name: "Prepare your profile README." })).toBeVisible();
  const preview = page.getByTestId("markdown-preview");
  await expect(preview.getByRole("heading", { level: 1 })).toBeVisible();
  const previewProjectLink = preview.getByRole("link", { name: "showcase-project" });
  await expect(previewProjectLink).toBeVisible();
  await expect(previewProjectLink.locator("xpath=ancestor::strong")).toHaveCount(1);
  await expect(preview.getByRole("list").first()).toBeVisible();
  await expect(preview.getByText("Platform engineer | Tooling & Automation")).toBeVisible();
  if (testInfo.project.name === "desktop-chromium") await page.screenshot({ path: "docs/screenshots/phase-3-readme-preview-desktop.png", fullPage: true });
  else await page.screenshot({ path: "docs/screenshots/phase-3-readme-preview-mobile.png", fullPage: true });

  await page.getByRole("button", { name: "Markdown source" }).click();
  const sourceField = page.getByLabel("Generated Markdown source");
  await expect(sourceField).toContainText("Platform engineer | Tooling &amp; Automation");
  await expect(sourceField).toContainText("- **[showcase-project](https://github.com/demo/showcase-project)**");
  await expect(sourceField).toContainText("[Website](https://example.dev/profile?from=github)");
  const markdownSource = await sourceField.inputValue();
  await page.getByRole("button", { name: "Copy", exact: true }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(markdownSource);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download .md" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("demo-github-profile-readme.md");
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  expect(await readFile(downloadPath!, "utf8")).toBe(markdownSource);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Make the recommendation yours." })).toBeVisible();
  await expect(page.getByText(testInfo.project.name === "desktop-chromium" ? "Your decision: SHOWCASE" : "You: SHOWCASE", { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await page.getByRole("button", { name: /Prepare$/ }).click();
  await expect(page.getByLabel("Professional headline")).toHaveValue("Platform engineer | Tooling & Automation");
  await expectNoHorizontalOverflow(page);
  if (testInfo.project.name === "desktop-chromium") await page.screenshot({ path: "docs/screenshots/phase-3-workspace-desktop.png", fullPage: true });
  else await page.screenshot({ path: "docs/screenshots/phase-3-workspace-mobile.png", fullPage: true });

  await page.getByRole("link", { name: /Build career profile/i }).click();
  await expect(page).toHaveURL(/\/career\/demo/);
  await expect(page.getByRole("heading", { name: "Add private career context." })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Add private career context." })).toBeVisible();
  await page.getByRole("link", { name: "GitHub audit", exact: true }).click();
  await expect(page).toHaveURL(/\/audit\/demo$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/career\/demo/);
  await page.getByRole("link", { name: /GitHub preparation/i }).first().click();
  await expect(page).toHaveURL(/\/audit\/demo\/prepare/);
  await expect(page.getByText(testInfo.project.name === "desktop-chromium" ? "Your decision: SHOWCASE" : "You: SHOWCASE", { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await page.getByRole("navigation", { name: "DevPersonify workflow" }).getByRole("link", { name: /Audit$/ }).click();
  await expect(page).toHaveURL(/\/audit\/demo$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/audit\/demo\/prepare/);
  await page.goBack();
  await expect(page).toHaveURL(/\/career\/demo/);
  await page.goForward();
  await expect(page).toHaveURL(/\/audit\/demo\/prepare/);
  expect(errors).toEqual([]);
});

test("career evidence profile preserves provenance, comparisons, privacy, and persistence", async ({ page, context }, testInfo) => {
  const errors = failOnBrowserErrors(page);
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: "http://127.0.0.1:4173" });
  const resumeExternalRequests: string[] = [];
  let trackingResume = false;
  page.on("request", (request) => { if (trackingResume && !request.url().startsWith("http://127.0.0.1:4173")) resumeExternalRequests.push(`${request.method()} ${request.url()}`); });
  await mockSuccessfulGitHub(page);
  await page.goto("/audit/demo");
  await expect(page.getByRole("heading", { level: 1, name: "Demo Developer" })).toBeVisible();
  await page.getByRole("link", { name: /Prepare my GitHub/i }).click();
  await expect(page.getByRole("heading", { name: "Make the recommendation yours." })).toBeVisible();
  await page.getByRole("link", { name: /Build career profile/i }).click();
  await expect(page).toHaveURL(/\/career\/demo/);
  await expect(page.getByRole("heading", { name: "Add private career context." })).toBeVisible();
  await expect(page.locator('nav[aria-label="Primary navigation"] a').filter({ hasText: "GitHub Preparation" })).toHaveAttribute("href", "/audit/demo/prepare");
  await expect(page.getByText("Your resume stays in your browser.")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  trackingResume = true;
  const upload = page.locator('input[type="file"]');
  await upload.setInputFiles({ name: "resume.rtf", mimeType: "application/rtf", buffer: Buffer.from("unsupported") });
  await expect(page.getByRole("alert")).toContainText("Supported resume files are PDF, DOCX, and UTF-8 TXT");
  await upload.setInputFiles({ name: "resume.txt", mimeType: "text/plain", buffer: Buffer.from("SKILLS\nTypeScript") });
  await expect(page.getByRole("heading", { name: "Review extracted evidence." })).toBeVisible();
  await page.getByRole("button", { name: /Resume$/ }).click();
  await page.getByRole("button", { name: "Clear resume" }).click();

  const resume = `EXPERIENCE\nSoftware Engineer\nExample Company\n2022 - Present\nBuilt developer tools.\n\nSKILLS\nTypeScript, AWS\n\nPROJECTS\nOther Project\nA private resume project\n\nEDUCATION\nB.Tech\nExample University`;
  await page.getByLabel("Paste resume text").fill(resume);
  await page.getByRole("button", { name: "Extract for review" }).click();
  await expect(page.getByRole("heading", { name: "Review extracted evidence." })).toBeVisible();
  const typeScriptCard = page.locator("article").filter({ has: page.locator('input[value="TypeScript"]') });
  await typeScriptCard.getByRole("button", { name: "Accept item" }).click();
  const awsCard = page.locator("article").filter({ has: page.locator('input[value="AWS"]') });
  await awsCard.getByRole("button", { name: "Accept item" }).click();
  const experienceCard = page.locator("article").filter({ has: page.locator('input[value="Software Engineer"]') });
  await experienceCard.getByRole("button", { name: "Accept item" }).click();
  await page.getByRole("button", { name: "+ Achievements" }).click();
  const manualCard = page.locator("article").filter({ has: page.getByText("You", { exact: true }) }).last();
  await manualCard.getByLabel("Title / skill / label").fill("Community contribution");
  await manualCard.getByRole("button", { name: "Accept item" }).click();
  await page.getByRole("button", { name: /Continue to profile/i }).click();

  await page.getByLabel("Professional headline").fill("Platform Engineer | C# & Cloud");
  await page.getByLabel("Current role").fill("Software Engineer");
  await page.getByLabel("Target role").fill("Platform Engineer");
  await page.getByLabel("Career direction").fill("Cloud | Platform | Infrastructure");
  await page.getByLabel("Short introduction").fill("I build useful developer tools.");
  await page.getByLabel("Location").fill("Remote");
  await page.getByLabel("Website").fill("https://example.dev");
  await page.getByRole("button", { name: /Compare evidence/i }).click();

  await expect(page.getByRole("heading", { name: "Compare evidence without judging claims." })).toBeVisible();
  await expect(page.getByText("Multiple-source support").first()).toBeVisible();
  await expect(page.getByText("Public GitHub evidence was not detected", { exact: false })).toBeVisible();
  await expect(page.getByText("GitHub only").first()).toBeVisible();
  await expect(page.getByText("Potential resume opportunity").first()).toBeVisible();
  await page.getByRole("button", { name: /Open career profile/i }).click();
  await expect(page.getByRole("heading", { name: "One profile, with sources preserved." })).toBeVisible();
  await expect(page.getByText("Platform Engineer | C# & Cloud").first()).toBeVisible();
  await expect(page.getByText(/Resume \+ GitHub/)).toBeVisible();
  await expectNoHorizontalOverflow(page);
  if (testInfo.project.name === "desktop-chromium") await page.screenshot({ path: "docs/screenshots/phase-4-career-profile-desktop.png", fullPage: true });
  else await page.screenshot({ path: "docs/screenshots/phase-4-career-profile-mobile.png", fullPage: true });

  await page.reload();
  await expect(page.getByRole("heading", { name: "One profile, with sources preserved." })).toBeVisible();
  await expect(page.getByText("Platform Engineer | C# & Cloud").first()).toBeVisible();
  await page.getByRole("link", { name: "showcase-project", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "showcase-project" })).toBeVisible();
  await page.getByRole("link", { name: /Back to repositories/i }).first().click();
  await expect(page.getByRole("heading", { name: "One profile, with sources preserved." })).toBeVisible();

  await page.getByRole("link", { name: /Build GitHub Profile README/i }).click();
  await expect(page.getByRole("heading", { name: "Build a profile README from shared evidence." })).toBeVisible();
  await page.getByRole("link", { name: "Evidence details for showcase-project" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "showcase-project" })).toBeVisible();
  await page.getByRole("link", { name: /Back to repositories/i }).first().click();
  await expect(page.getByRole("heading", { name: "Build a profile README from shared evidence." })).toBeVisible();
  await page.getByLabel("Current focus / what I build").fill("README-only developer platform focus.");
  await page.getByText("Contact / links").locator("..").getByRole("checkbox").uncheck();
  const readmePreview = page.getByTestId("markdown-preview");
  await expect(readmePreview.getByRole("heading", { name: "Selected projects" })).toBeVisible();
  await expect(readmePreview.getByRole("link", { name: "showcase-project" })).toBeVisible();
  await expect(readmePreview.getByText("README-only developer platform focus.")).toBeVisible();
  if (testInfo.project.name === "desktop-chromium") await page.screenshot({ path: "docs/screenshots/phase-5-readme-regression-desktop.png", fullPage: true });
  else await page.screenshot({ path: "docs/screenshots/phase-5-readme-regression-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Markdown source" }).click();
  const careerReadmeField = page.getByLabel("Generated career README Markdown source");
  const careerReadmeSource = await careerReadmeField.inputValue();
  expect(careerReadmeSource).toContain("## Selected projects");
  expect(careerReadmeSource).toContain("README-only developer platform focus.");
  await page.getByRole("button", { name: "Copy", exact: true }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(careerReadmeSource);
  const mdDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download .md" }).click();
  const mdDownload = await mdDownloadPromise;
  expect(mdDownload.suggestedFilename()).toBe("demo-github-profile-readme.md");
  const mdPath = await mdDownload.path();
  expect(mdPath).not.toBeNull();
  expect(await readFile(mdPath!, "utf8")).toBe(careerReadmeSource);
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    Object.defineProperty(document, "execCommand", { configurable: true, value: (command: string) => {
      (window as unknown as { __readmeFallbackCopy?: string }).__readmeFallbackCopy = (document.activeElement as HTMLTextAreaElement)?.value ?? "";
      return command === "copy";
    } });
  });
  await page.getByRole("button", { name: /Copied|Copy/, exact: true }).click();
  await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __readmeFallbackCopy?: string }).__readmeFallbackCopy)).toBe(careerReadmeSource);
  await page.reload();
  await expect(page.getByLabel("Current focus / what I build")).toHaveValue("README-only developer platform focus.");
  await page.goto("/career/demo");
  await page.getByRole("button", { name: /Evidence profile$/ }).click();

  await page.getByRole("link", { name: /Build LaTeX Resume/i }).click();
  await expect(page.getByRole("heading", { name: "Choose the evidence that belongs." })).toBeVisible();
  await expect(page.locator('nav[aria-label="Primary navigation"] a').filter({ hasText: "Career Profile" })).toHaveAttribute("href", "/career/demo?step=preview");
  await page.getByRole("link", { name: "Evidence details for showcase-project" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "showcase-project" })).toBeVisible();
  await page.getByRole("link", { name: /Back to repositories/i }).first().click();
  await expect(page.getByRole("heading", { name: "Choose the evidence that belongs." })).toBeVisible();
  await expect(page.getByText("Resume + GitHub").first()).toBeVisible();
  await page.getByLabel("Move AWS up").click();
  await page.getByRole("checkbox", { name: /Community contribution/i }).uncheck();
  await page.getByRole("button", { name: /Configure sections/i }).click();
  await expect(page.getByRole("heading", { name: "Set structure and presentation." })).toBeVisible();
  await page.getByLabel("Include Achievements").uncheck();
  await page.getByLabel("Move Skills up").click();
  await page.getByLabel("Move Skills up").click();
  await page.getByLabel("Resume summary presentation").fill("Evidence-backed platform engineering summary.");
  await page.getByRole("button", { name: /Review resume/i }).click();
  await expect(page.getByRole("heading", { name: "Review readiness and wording." })).toBeVisible();
  await page.getByLabel("Project description").first().fill("Resume-specific project wording & impact.");
  await page.getByRole("button", { name: /Generate LaTeX/i }).click();
  await expect(page.getByRole("heading", { name: "Your evidence-backed LaTeX resume." })).toBeVisible();
  await expect(page.getByTestId("latex-structured-preview").getByText("Evidence-backed platform engineering summary.")).toBeVisible();
  await expect(page.getByTestId("latex-structured-preview").getByText("Resume-specific project wording & impact.")).toBeVisible();
  await expectNoHorizontalOverflow(page);
  if (testInfo.project.name === "desktop-chromium") await page.screenshot({ path: "docs/screenshots/phase-5-latex-resume-desktop.png", fullPage: true });
  else await page.screenshot({ path: "docs/screenshots/phase-5-latex-resume-mobile.png", fullPage: true });

  await page.getByRole("button", { name: "LaTeX source" }).click();
  const latexSourceField = page.getByLabel("Generated LaTeX source");
  const latexSource = await latexSourceField.inputValue();
  expect(latexSource).toContain("Platform Engineer \\textbar{} C\\# \\& Cloud");
  expect(latexSource).toContain("Resume-specific project wording \\& impact.");
  expect(latexSource).toContain("\\textbf{Technical Skills:} AWS, TypeScript");
  expect(latexSource.indexOf("\\section{Skills}")).toBeLessThan(latexSource.indexOf("\\section{Experience}"));
  expect(latexSource).not.toContain("Community contribution");
  await page.getByRole("button", { name: "Copy", exact: true }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(latexSource);
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new DOMException("Denied", "NotAllowedError")) }, configurable: true });
    Object.defineProperty(document, "execCommand", { configurable: true, value: (command: string) => {
      (window as unknown as { __latexFallbackCopy?: string }).__latexFallbackCopy = (document.activeElement as HTMLTextAreaElement)?.value ?? "";
      return command === "copy";
    } });
  });
  await page.getByRole("button", { name: /Copied|Copy/, exact: true }).click();
  await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __latexFallbackCopy?: string }).__latexFallbackCopy)).toBe(latexSource);
  await page.evaluate(() => Object.defineProperty(document, "execCommand", { configurable: true, value: () => false }));
  await page.getByRole("button", { name: /Copied|Copy/, exact: true }).click();
  await expect(page.getByRole("button", { name: "Copy failed" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy" })).toBeVisible({ timeout: 3000 });
  const texDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download .tex" }).click();
  const texDownload = await texDownloadPromise;
  const texPath = await texDownload.path();
  expect(texPath).not.toBeNull();
  expect(await readFile(texPath!, "utf8")).toBe(latexSource);
  const docxDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download .docx" }).click();
  const docxDownload = await docxDownloadPromise;
  expect(docxDownload.suggestedFilename()).toBe("demo-resume.docx");
  const docxPath = await docxDownload.path();
  expect(docxPath).not.toBeNull();
  const docxBytes = new Uint8Array(await readFile(docxPath!));
  expect(docxBytes[0]).toBe(0x50);
  expect(docxBytes[1]).toBe(0x4b);
  const docxFiles = unzipSync(docxBytes);
  expect(docxFiles["[Content_Types].xml"]).toBeDefined();
  const docxXml = strFromU8(docxFiles["word/document.xml"]!);
  expect(docxXml).toContain("Evidence-backed platform engineering summary.");
  expect(docxXml).toContain("Resume-specific project wording &amp; impact.");
  expect(docxXml).toContain("Technical Skills: AWS, TypeScript");
  expect(docxXml).not.toContain("Community contribution");
  await expectNoHorizontalOverflow(page);

  await page.getByRole("link", { name: /Back to career profile/i }).click();
  await expect(page).toHaveURL(/\/career\/demo\?step=preview/);
  await expect(page.getByRole("heading", { name: "One profile, with sources preserved." })).toBeVisible();
  await page.getByRole("navigation", { name: "DevPersonify workflow" }).getByRole("link", { name: /Resume$/ }).click();
  await expect(page).toHaveURL(/\/career\/demo\/resume/);
  await page.reload();
  await page.getByRole("button", { name: /Configure$/ }).click();
  await expect(page.getByLabel("Resume summary presentation")).toHaveValue("Evidence-backed platform engineering summary.");
  await page.goto("/career/demo/readme");
  await expect(page.getByLabel("Current focus / what I build")).toHaveValue("README-only developer platform focus.");
  await page.getByRole("button", { name: "Markdown source" }).click();
  expect(await page.getByLabel("Generated career README Markdown source").inputValue()).toBe(careerReadmeSource);
  await page.getByRole("button", { name: "Clear README configuration" }).click();
  await expect(page.getByLabel("Current focus / what I build")).toHaveValue("Cloud | Platform | Infrastructure");
  await page.goto("/career/demo/resume");
  await page.getByRole("button", { name: /Configure$/ }).click();
  await expect(page.getByLabel("Resume summary presentation")).toHaveValue("Evidence-backed platform engineering summary.");
  await page.getByRole("link", { name: /Back to career profile/i }).click();
  await expect(page.getByRole("heading", { name: "One profile, with sources preserved." })).toBeVisible();
  await page.getByRole("link", { name: /GitHub preparation/i }).first().click();
  await expect(page.getByRole("heading", { name: "Make the recommendation yours." })).toBeVisible();
  await page.getByRole("navigation", { name: "DevPersonify workflow" }).getByRole("link", { name: /Audit$/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Demo Developer" })).toBeVisible();
  expect(resumeExternalRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test("not-found, rate-limit, malformed, network, and empty states recover clearly", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.startsWith("mobile"), "Error-state matrix is covered once in desktop Chromium.");
  const errors = failOnBrowserErrors(page);
  await page.route("https://api.github.com/**", async (route) => {
    const url = route.request().url();
    if (url.endsWith("/users/missing")) return route.fulfill({ status: 404, json: { message: "Not Found" }, headers: rateHeaders });
    if (url.endsWith("/users/limited")) return route.fulfill({ status: 403, json: { message: "API rate limit exceeded" }, headers: { ...rateHeaders, "x-ratelimit-remaining": "0" } });
    if (url.endsWith("/users/malformed")) return route.fulfill({ json: { login: "malformed" }, headers: rateHeaders });
    if (url.endsWith("/users/offline")) return route.abort("failed");
    if (url.endsWith("/users/empty")) return route.fulfill({ json: { ...user, login: "empty", name: "Empty Profile", public_repos: 0 }, headers: rateHeaders });
    if (url.includes("/users/empty/repos")) return route.fulfill({ json: [], headers: rateHeaders });
    return route.fulfill({ status: 404, json: { message: "Not Found" }, headers: rateHeaders });
  });

  await page.goto("/audit/missing");
  await expect(page.getByRole("heading", { name: "GitHub user not found" })).toBeVisible();
  await page.goto("/audit/limited");
  await expect(page.getByRole("heading", { name: "GitHub rate limit reached" })).toBeVisible();
  await page.goto("/audit/malformed");
  await expect(page.getByRole("heading", { name: "Unexpected GitHub response" })).toBeVisible();
  await page.goto("/audit/offline");
  await expect(page.getByRole("heading", { name: "Could not reach GitHub" })).toBeVisible();
  await page.goto("/audit/empty");
  await expect(page.getByRole("heading", { name: "No public repositories to audit." })).toBeVisible();
  await page.goto("/audit/empty/prepare");
  await expect(page.getByRole("heading", { name: "Make the recommendation yours." })).toBeVisible();
  await expect(page.getByText("0 of 0 reviewed")).toBeVisible();
  expect(errors).toEqual([]);
});
