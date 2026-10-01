import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { addManualReviewItem, createCareerEvidenceProfile, updateProfileField } from "../src/features/career-profile/career-profile";
import { exportProfileBackup } from "../src/features/career-profile/profile-backup";
import { createPreparationState } from "../src/features/github-preparation/preparation";
import { calculateAuditSummary } from "../src/features/github-audit/scoring-engine";

const now = "2026-10-01T00:00:00.000Z";
const profile = updateProfileField(createCareerEvidenceProfile({
  auditAt: now, repositories: [], warnings: [], fromCache: false,
  summary: calculateAuditSummary([], now),
  user: { login: "demo", id: 1, name: "Demo Developer", avatarUrl: "", htmlUrl: "https://github.com/demo", publicRepos: 0, followers: 0, following: 0, createdAt: now, updatedAt: now, fetchedAt: now },
}, createPreparationState("demo", now), now), "careerDirection", "professionalHeadline", "Platform Engineer", now);

test("a backup restores on a new browser without GitHub and supports private LinkedIn review", async ({ page }) => {
  const externalRequests: string[] = [];
  page.on("request", (request) => { if (!request.url().startsWith("http://127.0.0.1:4173")) externalRequests.push(request.url()); });
  await page.route("https://api.github.com/**", (route) => route.abort());
  await page.goto("/restore");
  await expect(page.getByText("No career profile is saved on this website in this browser yet.")).toBeVisible();
  await page.getByLabel("Profile backup file").setInputFiles({ name: "profile.json", mimeType: "application/json", buffer: Buffer.from(exportProfileBackup(profile)) });
  await expect(page).toHaveURL(/\/career\/demo\?step=preview/);
  await expect(page.getByRole("heading", { name: "Demo Developer" })).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download profile backup" }).click();
  const download = await downloadPromise;
  expect(JSON.parse(await readFile((await download.path())!, "utf8")).profile.careerDirection.professionalHeadline.value).toBe("Platform Engineer");
  await page.goto("/restore");
  const backupDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download backup for @demo" }).click();
  expect(JSON.parse(await readFile((await (await backupDownload).path())!, "utf8")).profile.username).toBe("demo");
  await page.getByRole("link", { name: "@demo", exact: true }).click();
  await page.getByRole("link", { name: /Review LinkedIn profile/ }).click();
  await page.getByLabel("Your LinkedIn profile text").fill("Platform Engineer. Private draft sentence.");
  await page.getByRole("button", { name: "Compare profiles" }).click();
  await expect(page.getByText("Phrase found", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Your LinkedIn profile text")).toHaveValue("");
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain("Private draft sentence");
  expect(externalRequests).toEqual([]);
});

test("milestone reminders and profile history recover edits without losing the working version", async ({ page }) => {
  await page.route("https://api.github.com/**", (route) => route.abort());
  await page.goto("/restore");
  await page.getByLabel("Profile backup file").setInputFiles({ name: "profile.json", mimeType: "application/json", buffer: Buffer.from(exportProfileBackup(profile)) });
  const safety = page.getByRole("region", { name: "Profile backup and history" });
  await expect(safety.getByRole("button", { name: "Back up now" })).toBeVisible();
  await page.getByRole("navigation", { name: "Career profile steps" }).getByRole("button", { name: /^(3\.\s*)?Profile$/ }).click();
  await page.getByLabel("Professional headline", { exact: true }).fill("Senior Platform Engineer");
  await page.getByRole("button", { name: "Compare evidence →" }).click();
  await expect(safety.getByText(/Profile details updated. Download a backup/)).toBeVisible();
  await safety.locator("summary").click();
  await expect(safety.getByText("Profile details updated", { exact: true })).toBeVisible();
  await page.reload();
  await safety.locator("summary").click();
  await safety.getByRole("button", { name: /^Restore Backup imported from/ }).click();
  await safety.getByRole("button", { name: "Confirm restore", exact: true }).click();
  await expect(safety.getByText("Profile version restored. Your previous profile is available in history.")).toBeVisible();
  await page.getByRole("navigation", { name: "Career profile steps" }).getByRole("button", { name: /^(3\.\s*)?Profile$/ }).click();
  await expect(page.getByLabel("Professional headline", { exact: true })).toHaveValue("Platform Engineer");
  await expect(safety.getByText(/Senior Platform Engineer ·/)).toBeVisible();
  const backupEvent = page.waitForEvent("download");
  await safety.getByRole("button", { name: "Back up now" }).click();
  const backup = await backupEvent;
  expect(JSON.parse(await readFile((await backup.path())!, "utf8")).profile.careerDirection.professionalHeadline.value).toBe("Platform Engineer");
  await expect(safety.getByText(/Last backup download requested:.*current version/)).toBeVisible();
  await expect(safety.getByRole("button", { name: "Dismiss backup reminder" })).toHaveCount(0);
  await page.getByLabel("Professional headline", { exact: true }).fill("Platform Lead");
  await page.getByRole("button", { name: "Compare evidence →" }).click();
  await expect(safety.getByText(/newer changes need a backup/)).toBeVisible();
  await expect(safety.getByText(/Profile details updated. Download a backup/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("resume and review milestones offer a dismissible backup reminder", async ({ page }) => {
  await page.route("https://api.github.com/**", (route) => route.abort());
  await page.goto("/restore");
  await page.getByLabel("Profile backup file").setInputFiles({ name: "profile.json", mimeType: "application/json", buffer: Buffer.from(exportProfileBackup(profile)) });
  const safety = page.getByRole("region", { name: "Profile backup and history" });
  await page.getByRole("navigation", { name: "Career profile steps" }).getByRole("button", { name: /Resume$/ }).click();
  await page.getByLabel("Paste resume text").fill("SKILLS\nTypeScript");
  await page.getByRole("button", { name: "Extract for review" }).click();
  await expect(safety.getByText(/Resume added. Download a backup/)).toBeVisible();
  await safety.getByRole("button", { name: "Dismiss backup reminder" }).click();
  await expect(safety.getByText(/Resume added. Download a backup/)).toHaveCount(0);
  await page.getByRole("button", { name: "Accept item", exact: true }).click();
  await expect(safety.getByText(/Evidence review completed. Download a backup/)).toBeVisible();
  await safety.locator("summary").click();
  await expect(safety.getByText("Resume added", { exact: true })).toBeVisible();
  await expect(safety.getByText("Evidence review completed", { exact: true })).toBeVisible();
  await safety.getByRole("button", { name: /^Restore Backup imported from/ }).click();
  await safety.getByRole("button", { name: "Confirm restore", exact: true }).click();
  await page.getByRole("navigation", { name: "Career profile steps" }).getByRole("button", { name: /Evidence profile$/ }).click();
  await page.getByRole("button", { name: "Clear resume", exact: true }).click();
  await expect(safety.locator("summary")).toHaveText("Profile history (0)");
  expect(await page.evaluate(() => localStorage.getItem("devpersonify:profile-history:v1:demo"))).toBeNull();
});

test("failed autosave blocks replacing unsaved profile edits", async ({ page }) => {
  await page.route("https://api.github.com/**", (route) => route.abort());
  await page.goto("/restore");
  await page.getByLabel("Profile backup file").setInputFiles({ name: "profile.json", mimeType: "application/json", buffer: Buffer.from(exportProfileBackup(profile)) });
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith("devpersonify:career-evidence:")) throw new DOMException("Storage full", "QuotaExceededError");
      original.call(this, key, value);
    };
  });
  await page.getByRole("navigation", { name: "Career profile steps" }).getByRole("button", { name: /^(3\.\s*)?Profile$/ }).click();
  await page.getByLabel("Professional headline", { exact: true }).fill("Unsaved test edits");
  const safety = page.getByRole("region", { name: "Profile backup and history" });
  await expect(safety.getByRole("alert")).toContainText("Restoring is disabled");
  await safety.getByRole("button", { name: "Save version", exact: true }).click();
  await safety.locator("summary").click();
  await expect(safety.getByRole("button", { name: /^Restore Saved manually from/ })).toBeDisabled();
  await page.getByRole("navigation", { name: "Career profile steps" }).getByRole("button", { name: /Evidence profile$/ }).click();
  await expect(page.getByLabel("Import profile backup")).toBeDisabled();
  const downloadEvent = page.waitForEvent("download");
  await safety.getByRole("button", { name: "Back up now" }).click();
  expect(JSON.parse(await readFile((await (await downloadEvent).path())!, "utf8")).profile.careerDirection.professionalHeadline.value).toBe("Unsaved test edits");
});


test("restored profile populates Home, keeps backups usable and opens drafts without GitHub", async ({ page }) => {
  const githubRequests: string[] = [];
  page.on("request", (request) => { if (request.url().includes("api.github.com")) githubRequests.push(request.url()); });
  await page.route("https://api.github.com/**", (route) => route.abort());
  await page.goto("/restore");
  // An old tab marker must not override the newly restored account.
  await page.evaluate(() => {
    sessionStorage.setItem("devpersonify:last-workflow:v1", "/career/previous?step=review");
    localStorage.setItem("devpersonify:last-workflow:v1", "/career/previous?step=review");
  });
  await page.getByLabel("Profile backup file").setInputFiles({ name: "profile.json", mimeType: "application/json", buffer: Buffer.from(exportProfileBackup(addManualReviewItem(profile, "experience", now))) });
  await expect(page).toHaveURL(/\/career\/demo\?step=preview/);
  await page.getByRole("navigation", { name: "DevPersonify workflow" }).getByRole("link", { name: "Home", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Welcome back, @demo" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Review 1 evidence item" })).toBeVisible();
  await expect(page.getByText("Platform Engineer", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Continue saved session →", exact: true })).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Analyze my GitHub", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "View saved evidence →", exact: true })).toHaveAttribute("href", "/career/demo?step=preview");
  const safety = page.getByRole("region", { name: "Profile backup and history" });
  const downloadEvent = page.waitForEvent("download");
  await safety.getByRole("button", { name: "Back up now" }).click();
  const backup = JSON.parse(await readFile((await (await downloadEvent).path())!, "utf8"));
  expect(backup.profile.resumeReview).toHaveLength(1);
  await expect(safety.getByText(/current version/)).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(accessibility.violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Review 1 evidence item" })).toBeVisible();
  await page.getByRole("link", { name: "Open Resume Studio →", exact: true }).click();
  await expect(page.getByRole("heading", { name: /DevPersonify Classic/ })).toBeVisible();
  expect(githubRequests).toEqual([]);
});

test("guided LinkedIn review separates sections, validates profile links, exports and clears private input", async ({ page }) => {
  const externalRequests: string[] = [];
  page.on("request", (request) => { if (!request.url().startsWith("http://127.0.0.1:4173")) externalRequests.push(request.url()); });
  await page.route("https://api.github.com/**", (route) => route.abort());
  await page.goto("/restore");
  await page.getByLabel("Profile backup file").setInputFiles({ name: "profile.json", mimeType: "application/json", buffer: Buffer.from(exportProfileBackup(profile)) });
  await page.getByRole("link", { name: /Review LinkedIn profile/ }).click();
  await page.getByLabel("LinkedIn username or profile URL").fill("https://linkedin.com.evil.test/in/demo");
  await page.getByRole("button", { name: "Prepare profile link" }).click();
  await expect(page.getByRole("link", { name: "Open profile on LinkedIn ↗" })).toHaveCount(0);
  await page.getByLabel("LinkedIn username or profile URL").fill("demo-user");
  await page.getByRole("button", { name: "Prepare profile link" }).click();
  await expect(page.getByRole("link", { name: "Open profile on LinkedIn ↗" })).toHaveAttribute("href", "https://www.linkedin.com/in/demo-user");
  await expect(page.getByRole("link", { name: "Open profile on LinkedIn ↗" })).toHaveAttribute("target", "_blank");
  await page.getByRole("button", { name: "Guided sections", exact: true }).click();
  await page.getByLabel("Headline & header", { exact: true }).fill("Platform Engineer");
  await page.getByRole("button", { name: "Next section →", exact: true }).click();
  await page.getByLabel("About / summary", { exact: true }).fill("Private guided profile test. I build developer tools.");
  await page.getByRole("button", { name: "Compare profiles", exact: true }).click();
  await expect(page.getByText("Phrase found", { exact: true })).toBeVisible();
  await expect(page.getByText(/2 of 10 sections supplied. This describes/)).toBeVisible();
  const reportEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download review (.txt)" }).click();
  const report = await readFile((await (await reportEvent).path())!, "utf8");
  expect(report).toContain("HEADLINE & HEADER");
  expect(report).toContain("ENDORSEMENTS & RECOMMENDATIONS");
  expect(report).not.toContain("Private guided profile test");
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain("Private guided profile test");
  expect(await page.evaluate(() => JSON.stringify(sessionStorage))).not.toContain("Private guided profile test");
  const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(accessibility.violations.map((item) => ({ id: item.id, nodes: item.nodes.map((node) => node.target) }))).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByLabel("About / summary", { exact: true }).fill("Edited draft");
  await expect(page.getByRole("heading", { name: "Review results" })).toHaveCount(0);
  await page.getByRole("button", { name: "Clear review input" }).click();
  await expect(page.getByLabel("About / summary", { exact: true })).toHaveValue("");
  await expect(page.getByRole("button", { name: "Compare profiles" })).toBeDisabled();
  await page.reload();
  await expect(page.getByLabel("Your LinkedIn profile text")).toHaveValue("");
  expect(externalRequests).toEqual([]);
});

test("LinkedIn PDF import previews deterministic sections, preserves drafts on errors and clears private text", async ({ page }) => {
  const externalRequests: string[] = [];
  page.on("request", (request) => { if (!request.url().startsWith("http://127.0.0.1:4173")) externalRequests.push(request.url()); });
  await page.goto("/restore");
  await page.getByLabel("Profile backup file").setInputFiles({ name: "profile.json", mimeType: "application/json", buffer: Buffer.from(exportProfileBackup(profile)) });
  await page.getByRole("link", { name: /Review LinkedIn profile/ }).click();
  await page.getByLabel("Your LinkedIn profile text").fill("Keep my existing draft");
  const { profilePdfFixture } = await import("../src/test/pdf-fixture");
  await page.getByLabel("LinkedIn profile PDF", { exact: true }).setInputFiles({ name: "profile.pdf", mimeType: "application/pdf", buffer: process.env.LINKEDIN_TEST_PDF ? await readFile(process.env.LINKEDIN_TEST_PDF) : Buffer.from(profilePdfFixture()) });
  await expect(page.getByText(/pages read · 7 sections detected/)).toBeVisible();
  await expect(page.getByLabel("Your LinkedIn profile text")).toHaveValue("Keep my existing draft");
  await page.getByText("Check extracted text and placement", { exact: true }).click();
  await expect(page.getByRole("heading", { name: "Unmapped text — kept for manual review" })).toBeVisible();
  await page.getByRole("button", { name: "Use detected sections", exact: true }).click();
  await expect(page.getByLabel("Headline & header", { exact: true })).not.toHaveValue("");
  await page.getByRole("button", { name: "Next section →", exact: true }).click();
  const about = await page.getByLabel("About / summary", { exact: true }).inputValue();
  expect(about).not.toContain("Page 1 of");
  await page.getByRole("button", { name: "Compare profiles", exact: true }).click();
  await expect(page.getByText(/7 of 10 sections supplied. This describes/)).toBeVisible();
  await page.getByLabel("LinkedIn profile PDF", { exact: true }).setInputFiles({ name: "broken.pdf", mimeType: "application/pdf", buffer: Buffer.from("invalid") });
  await expect(page.getByText(/This file does not contain a readable PDF/)).toBeVisible();
  await expect(page.getByLabel("About / summary", { exact: true })).toHaveValue(about);
  const stored = await page.evaluate(() => JSON.stringify([localStorage, sessionStorage]));
  expect(stored).not.toContain(about.slice(0, 60));
  expect(stored).not.toContain("Keep my existing draft");
  const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(accessibility.violations.map((item) => item.id)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Clear review input", exact: true }).click();
  await expect(page.getByLabel("About / summary", { exact: true })).toHaveValue("");
  await expect(page.getByText(/pages read ·/)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Review results" })).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel("Your LinkedIn profile text")).toHaveValue("");
  expect(externalRequests).toEqual([]);
});
