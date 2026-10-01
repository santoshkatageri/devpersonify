export type LinkedInProfileUrl = { ok: true; username: string; url: string } | { ok: false; message: string };
export function parseLinkedInProfileUrl(input: string): LinkedInProfileUrl {
  let name = input.trim().replace(/^@/, "");
  const invalid: LinkedInProfileUrl = { ok: false, message: "Enter a LinkedIn public username or an https://www.linkedin.com/in/username profile URL." };
  if (!name) return invalid;
  if (/^(?:https?:\/\/|(?:[a-z]{2,3}\.)?linkedin\.com\/)/i.test(name)) {
    try {
      const url = new URL(/^https?:\/\//i.test(name) ? name : `https://${name}`);
      if (!/^https?:$/.test(url.protocol) || !/^(?:(?:www|[a-z]{2})\.)?linkedin\.com$/i.test(url.hostname) || url.username || url.password || url.port) return invalid;
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length !== 2 || parts[0] !== "in") return invalid;
      name = decodeURIComponent(parts[1]!);
    } catch { return invalid; }
  }
  if (!/^[\p{L}\p{N}][\p{L}\p{N}-]{1,199}$/u.test(name)) return invalid;
  return { ok: true, username: name, url: `https://www.linkedin.com/in/${encodeURIComponent(name)}` };
}
