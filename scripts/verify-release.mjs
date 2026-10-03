import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import process from "node:process";
import console from "node:console";

export const RELEASE_ROUTES = [
  "/", "/about", "/audit", "/guide", "/privacy", "/methodology", "/restore",
  "/audit/release-check/prepare", "/career/release-check",
  "/career/release-check/resume", "/career/release-check/readme", "/career/release-check/linkedin-review",
];

export function releaseTarget(input, expectedCommit) {
  const url = new globalThis.URL(input);
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Use an HTTPS site origin without credentials, a path, a query, or a fragment.");
  }
  if (!/^[a-f\d]{40}$/i.test(expectedCommit ?? "")) {
    throw new Error("Provide the full 40-character commit SHA expected in this deployment.");
  }
  return { origin: url.origin, commit: expectedCommit.toLowerCase() };
}

/** Read-only hosting smoke check. It does not invoke GitHub, submit feedback, or import user data. */
export async function verifyRelease(input, expectedCommit, fetcher = globalThis.fetch) {
  const { origin, commit } = releaseTarget(input, expectedCommit);
  const get = async (path) => {
    const response = await fetcher(`${origin}${path}`, {
      redirect: "error", cache: "no-store", signal: globalThis.AbortSignal.timeout(15_000),
      headers: { "Cache-Control": "no-cache" },
    });
    if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}.`);
    return response;
  };
  const metadataResponse = await get("/release.json");
  if (!metadataResponse.headers.get("content-type")?.includes("application/json")) {
    throw new Error("/release.json is not JSON; this may be an older build or an HTML fallback.");
  }
  const metadata = await metadataResponse.json();
  if (metadata.schemaVersion !== 1 || metadata.commit !== commit || metadata.dirty !== false) {
    throw new Error(`Deployment identity mismatch: expected clean ${commit}; received ${String(metadata.commit)} (dirty=${String(metadata.dirty)}).`);
  }
  if (!Array.isArray(metadata.assets) || metadata.assets.length === 0 || metadata.assets.length > 100) {
    throw new Error("Release metadata has no valid asset list.");
  }
  const assets = new Map();
  for (const asset of metadata.assets) {
    if (!/^\/assets\/[a-z\d_.-]+\.(?:m?js|css)$/i.test(asset.path ?? "") || !/^[a-f\d]{64}$/.test(asset.sha256 ?? "") || assets.has(asset.path)) {
      throw new Error("Release metadata contains an invalid or duplicate asset.");
    }
    assets.set(asset.path, asset.sha256);
  }
  for (const route of RELEASE_ROUTES) {
    const response = await get(route);
    const html = await response.text();
    if (!response.headers.get("content-type")?.includes("text/html") || !/<div\s+id=["']root["']/.test(html)) {
      throw new Error(`${route} did not return the application shell.`);
    }
    if (!html.includes(`<meta name="devpersonify-release" content="${commit}">`)) {
      throw new Error(`${route} serves a different or unidentifiable build.`);
    }
    const linkedAssets = [...html.matchAll(/(?:src|href)=["']([^"']+\.(?:m?js|css))["']/g)].map((match) => match[1]);
    if (!linkedAssets.some((asset) => /\.m?js$/.test(asset)) || linkedAssets.some((asset) => !assets.has(asset))) {
      throw new Error(`${route} references assets outside the verified release.`);
    }
  }
  for (const [path, expectedHash] of assets) {
    const response = await get(path);
    const contentType = response.headers.get("content-type") ?? "";
    const validType = path.endsWith(".css") ? contentType.includes("text/css") : /(?:javascript|ecmascript)/i.test(contentType);
    if (!validType) throw new Error(`${path} has an unexpected content type (possibly an HTML fallback).`);
    const content = new Uint8Array(await response.arrayBuffer());
    if (createHash("sha256").update(content).digest("hex") !== expectedHash) {
      throw new Error(`${path} content does not match the release manifest.`);
    }
  }
  return { origin, commit, routes: RELEASE_ROUTES.length, assets: assets.size };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await verifyRelease(process.argv[2], process.argv[3]);
    console.log(`Verified ${result.origin}: ${result.commit}; ${result.routes} direct routes and ${result.assets} asset hashes passed.`);
    console.log("This confirms the deployed build and hosting. Complete the user-flow checks in docs/release-verification.md before announcing.");
  } catch (error) {
    console.error(`Release verification failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
