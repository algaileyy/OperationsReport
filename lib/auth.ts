// Lightweight shared-password auth using Web Crypto (crypto.subtle), which
// runs identically in Next.js middleware (Edge runtime) and in API routes
// (Node runtime) — no extra auth library needed for a small internal tool.

export const SESSION_COOKIE = "ops_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

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

export async function createSessionToken(): Promise<string> {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const signature = await hmac(String(expiresAt));
  return `${expiresAt}.${signature}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const [expiresAtRaw, signature] = token.split(".");
  if (!expiresAtRaw || !signature) return false;
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;
  const expected = await hmac(expiresAtRaw);
  return expected === signature;
}

export function checkPassword(candidate: string): boolean {
  const expected = process.env.INPUT_PASSWORD;
  if (!expected) {
    throw new Error("INPUT_PASSWORD environment variable is not set.");
  }
  return candidate === expected;
}
