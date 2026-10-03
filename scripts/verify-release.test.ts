import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { describe, expect, it } from "vitest";
import { releaseTarget, RELEASE_ROUTES, verifyRelease } from "./verify-release.mjs";
import { resolveCommit } from "./release-metadata";

const commit = "a".repeat(40);
const origin = "https://example.test";
const assetPath = "/assets/index-123.js";
const assetCode = "console.log('release test')";
const shell = `<html><head><meta name="devpersonify-release" content="${commit}"><script type="module" src="${assetPath}"></script></head><body><div id="root"></div></body></html>`;
const manifest = {
  schemaVersion: 1, commit, dirty: false,
  assets: [{ path: assetPath, sha256: createHash("sha256").update(assetCode).digest("hex") }],
};

function fixture(overrides: Record<string, () => Response> = {}) {
  const visited: string[] = [];
  const fetcher = async (url: string) => {
    const path = new URL(url).pathname;
    visited.push(path);
    if (overrides[path]) return overrides[path]();
    if (path === "/release.json") return Response.json(manifest);
    if (path === assetPath) return new Response(assetCode, { headers: { "Content-Type": "text/javascript" } });
    return new Response(shell, { headers: { "Content-Type": "text/html" } });
  };
  return { fetcher, visited };
}

describe("deployed release verification", () => {
  it("checks the expected release, every direct route, and asset contents", async () => {
    const { fetcher, visited } = fixture();
    await expect(verifyRelease(origin, commit, fetcher)).resolves.toEqual({ origin, commit, routes: RELEASE_ROUTES.length, assets: 1 });
    expect(visited).toEqual(["/release.json", ...RELEASE_ROUTES, assetPath]);
  });

  it.each(["http://example.test", "https://user:secret@example.test", "https://example.test/nested", "https://example.test?secret=x", "https://example.test#fragment"])("rejects ambiguous or insecure target %s", (url) => {
    expect(() => releaseTarget(url, commit)).toThrow("HTTPS site origin");
  });

  it("requires the exact full commit, not a short revision", () => {
    expect(() => releaseTarget(origin, "abcdef0")).toThrow("40-character");
  });

  it.each([
    { ...manifest, commit: "b".repeat(40) },
    { ...manifest, dirty: true },
    { ...manifest, dirty: undefined },
    { ...manifest, schemaVersion: 2 },
  ])("fails unverified or wrong release identity", async (metadata) => {
    const { fetcher } = fixture({ "/release.json": () => Response.json(metadata) });
    await expect(verifyRelease(origin, commit, fetcher)).rejects.toThrow("identity mismatch");
  });

  it("rejects the SPA HTML fallback masquerading as release metadata", async () => {
    const { fetcher } = fixture({ "/release.json": () => new Response(shell, { headers: { "Content-Type": "text/html" } }) });
    await expect(verifyRelease(origin, commit, fetcher)).rejects.toThrow("not JSON");
  });

  it("fails when a direct route serves an older build", async () => {
    const { fetcher } = fixture({ "/restore": () => new Response(shell.replace(commit, "b".repeat(40)), { headers: { "Content-Type": "text/html" } }) });
    await expect(verifyRelease(origin, commit, fetcher)).rejects.toThrow("/restore serves a different");
  });

  it("rejects a page loading an asset outside its manifest", async () => {
    const { fetcher } = fixture({ "/": () => new Response(shell.replace(assetPath, "/assets/old.js"), { headers: { "Content-Type": "text/html" } }) });
    await expect(verifyRelease(origin, commit, fetcher)).rejects.toThrow("outside the verified release");
  });

  it.each([
    ["missing", () => new Response("Not found", { status: 404 }), "HTTP 404"],
    ["HTML fallback", () => new Response(shell, { headers: { "Content-Type": "text/html" } }), "unexpected content type"],
    ["stale content", () => new Response("old code", { headers: { "Content-Type": "application/javascript" } }), "does not match"],
  ] as const)("rejects an asset with %s", async (_label, response, error) => {
    const { fetcher } = fixture({ [assetPath]: response });
    await expect(verifyRelease(origin, commit, fetcher)).rejects.toThrow(error);
  });

  it("does not follow attacker-controlled asset paths", async () => {
    const { fetcher, visited } = fixture({ "/release.json": () => Response.json({ ...manifest, assets: [{ ...manifest.assets[0], path: "//other.example/secret.js" }] }) });
    await expect(verifyRelease(origin, commit, fetcher)).rejects.toThrow("invalid or duplicate asset");
    expect(visited).toEqual(["/release.json"]);
  });
});

describe("public build identity", () => {
  it("hashes final emitted bytes after Vite rewrites dynamic-import preload dependencies", async () => {
    const root = await realpath(await mkdtemp(join(tmpdir(), "devpersonify-release-test-")));
    try {
      await Promise.all([
        writeFile(join(root, "index.html"), '<div id="root"></div><script type="module" src="/entry.js"></script>'),
        writeFile(join(root, "entry.js"), 'import "./main.css"; document.querySelector("#root").onclick = () => import("./lazy.js");'),
        writeFile(join(root, "main.css"), "body { color: red; }"),
        writeFile(join(root, "lazy.js"), 'import "./lazy.css"; document.body.dataset.loaded = "true";'),
        writeFile(join(root, "lazy.css"), "body { background: white; }"),
      ]);
      const configPath = join(root, "vite.config.mts");
      const metadataModule = join(process.cwd(), "scripts/release-metadata.ts");
      await writeFile(configPath, `import { releaseMetadata } from ${JSON.stringify(metadataModule)}; export default { root: ${JSON.stringify(root)}, logLevel: "silent", plugins: [releaseMetadata()] };`);
      // The build runs in Node, outside jsdom's different Uint8Array realm.
      execFileSync(process.execPath, [join(process.cwd(), "node_modules/vite/bin/vite.js"), "build", "--config", configPath], { timeout: 15_000 });
      const metadata = JSON.parse(await readFile(join(root, "dist/release.json"), "utf8"));
      expect(metadata.assets.length).toBeGreaterThanOrEqual(4);
      for (const asset of metadata.assets) {
        const content = await readFile(join(root, "dist", asset.path));
        expect(createHash("sha256").update(content).digest("hex")).toBe(asset.sha256);
      }
      expect(await readFile(join(root, "dist/index.html"), "utf8")).toContain(`<meta name="devpersonify-release" content="${metadata.commit}">`);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("prefers the Cloudflare commit, then CI, then the checkout", () => {
    expect(resolveCommit({ CF_PAGES_COMMIT_SHA: commit, GITHUB_SHA: "b".repeat(40) }, "c".repeat(40))).toBe(commit);
    expect(resolveCommit({ GITHUB_SHA: commit }, "c".repeat(40))).toBe(commit);
    expect(resolveCommit({}, commit)).toBe(commit);
  });
  it("never publishes arbitrary environment text in a commit field", () => {
    expect(resolveCommit({ CF_PAGES_COMMIT_SHA: "unexpected environment contents" }, commit)).toBe("unknown");
    expect(resolveCommit({}, "")).toBe("unknown");
  });
});
