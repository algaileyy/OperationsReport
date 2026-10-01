// Lightweight shared-password auth using Web Crypto (crypto.subtle), which
// runs identically in Next.js middleware (Edge runtime) and in API routes
// (Node runtime) — no extra auth library needed for a small internal tool.

export const SESSION_COOKIE = "ops_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export type Role = "admin" | "member";
export type Session = { role: Role; name: string };

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET environment variable is not set.");
  }
  return secret;
}

async function hmac(message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Dot-delimited tokens need the name segment guaranteed free of dots — base64 never produces one.
function encodeName(name: string): string {
  return btoa(encodeURIComponent(name));
}
function decodeName(encoded: string): string | null {
  try {
    return decodeURIComponent(atob(encoded));
  } catch {
    return null;
  }
}

export async function createSessionToken(session: Session): Promise<string> {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = `${expiresAt}.${session.role}.${encodeName(session.name)}`;
  const signature = await hmac(payload);
  return `${payload}.${signature}`;
}

/** Verifies the signature and expiry, and returns who the session is for — null if missing,
 * expired, tampered with, or malformed. */
export async function verifySession(token: string | undefined | null): Promise<Session | null> {
  if (!token) return null;
  const [expiresAtRaw, role, encodedName, signature] = token.split(".");
  if (!expiresAtRaw || !role || !encodedName || !signature) return null;
  if (role !== "admin" && role !== "member") return null;
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;
  const payload = `${expiresAtRaw}.${role}.${encodedName}`;
  const expected = await hmac(payload);
  if (expected !== signature) return null;
  const name = decodeName(encodedName);
  if (!name) return null;
  return { role, name };
}

/** Plain authed/not-authed check, for places (middleware) that don't need who it is. */
export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  return (await verifySession(token)) !== null;
}

export function checkAdminCredentials(username: string, password: string): Session | null {
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminUsername || !adminPassword) return null;
  return username === adminUsername && password === adminPassword ? { role: "admin", name: username } : null;
}

/** Each team member signs in with their own name (picked from MEMBER_USERNAMES, a comma-separated
 * allowlist) plus the one shared password — not a generic anonymous "team" login — so every save
 * can be attributed to a real person in the history log. Matching is case-insensitive, but the
 * returned name is always the allowlist's canonical casing, so history stays consistent regardless
 * of how someone typed their name at login. */
export function checkMemberCredentials(name: string, password: string): Session | null {
  const memberPassword = process.env.INPUT_PASSWORD;
  if (!memberPassword) {
    throw new Error("INPUT_PASSWORD environment variable is not set.");
  }
  const allowedNames = (process.env.MEMBER_USERNAMES ?? "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
  const match = allowedNames.find((n) => n.toLowerCase() === name.trim().toLowerCase());
  if (!match) return null;
  return password === memberPassword ? { role: "member", name: match } : null;
}
