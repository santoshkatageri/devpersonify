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
