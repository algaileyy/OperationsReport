import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, checkAdminCredentials, checkMemberCredentials, createSessionToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const password = body?.password;

  if (typeof password !== "string") {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const session =
    body?.mode === "admin"
      ? typeof body.username === "string"
        ? checkAdminCredentials(body.username, password)
        : null
      : typeof body?.name === "string"
        ? checkMemberCredentials(body.name, password)
        : null;

  if (!session) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const token = await createSessionToken(session);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
