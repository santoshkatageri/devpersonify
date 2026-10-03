import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import process from "node:process";
import type { Plugin } from "vite";

export function resolveCommit(environment: Record<string, string | undefined>, gitCommit: string): string {
  const commit = environment.CF_PAGES_COMMIT_SHA || environment.GITHUB_SHA || gitCommit;
  return /^[a-f\d]{40}$/i.test(commit) ? commit.toLowerCase() : "unknown";
}

function git(...args: string[]): string {
  try { return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); }
  catch { return ""; }
}

/** Public build identity only. Never includes environment values other than a validated commit SHA. */
export function releaseMetadata(): Plugin {
  const commit = resolveCommit(process.env, git("rev-parse", "HEAD"));
  const dirty = commit === "unknown" || git("status", "--porcelain").length > 0;
  return {
    name: "devpersonify-release-metadata",
    apply: "build",
    enforce: "post",
    transformIndexHtml() {
      return [{ tag: "meta", attrs: { name: "devpersonify-release", content: commit }, injectTo: "head" }];
    },
    // Vite rewrites dynamic-import preloads late; hash only after those changes.
    generateBundle: { order: "post", handler(_options, bundle) {
      const assets = Object.values(bundle)
        .filter((entry) => /\.(?:m?js|css)$/.test(entry.fileName))
        .map((entry) => ({
          path: `/${entry.fileName}`,
          sha256: createHash("sha256").update(entry.type === "chunk" ? entry.code : entry.source).digest("hex"),
        }))
        .sort((left, right) => left.path.localeCompare(right.path));
      this.emitFile({
        type: "asset", fileName: "release.json",
        source: JSON.stringify({ schemaVersion: 1, commit, dirty, builtAt: new Date().toISOString(), assets }, null, 2),
      });
    } },
  };
}
