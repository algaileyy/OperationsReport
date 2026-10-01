// Lightweight shared-password auth using Web Crypto (crypto.subtle), which
// runs identically in Next.js middleware (Edge runtime) and in API routes
// (Node runtime) — no extra auth library needed for a small internal tool.

export const SESSION_COOKIE = "ops_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export type Role = "admin" | "member";

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

export async function createSessionToken(role: Role): Promise<string> {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const signature = await hmac(`${expiresAt}.${role}`);
  return `${expiresAt}.${role}.${signature}`;
}

/** Verifies the signature and expiry, and returns the role it was issued for — null if missing,
 * expired, tampered with, or signed for neither known role. */
export async function verifySession(token: string | undefined | null): Promise<Role | null> {
  if (!token) return null;
  const [expiresAtRaw, role, signature] = token.split(".");
  if (!expiresAtRaw || !role || !signature) return null;
  if (role !== "admin" && role !== "member") return null;
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;
  const expected = await hmac(`${expiresAtRaw}.${role}`);
  return expected === signature ? role : null;
}

/** Plain authed/not-authed check, for places (middleware) that don't need the role itself. */
export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  return (await verifySession(token)) !== null;
}

/** Member sign-in is the shared password alone, same as always. Admin sign-in is a separate
 * username + password pair (a distinct "Sign in as admin" path on the login page), not just a
 * second password tried against the same field, so a member can't stumble into admin by guessing. */
export function checkCredentials(username: string | undefined, password: string): Role | null {
  if (username) {
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminUsername || !adminPassword) return null;
    return username === adminUsername && password === adminPassword ? "admin" : null;
  }
  const memberPassword = process.env.INPUT_PASSWORD;
  if (!memberPassword) {
    throw new Error("INPUT_PASSWORD environment variable is not set.");
  }
  return password === memberPassword ? "member" : null;
}
