import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { createCareerEvidenceProfile, updateProfileField } from "../src/features/career-profile/career-profile";
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
