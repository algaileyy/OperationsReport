import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, checkCredentials, createSessionToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json().catch(() => ({ username: undefined, password: "" }));

  if (typeof password !== "string" || (username != null && typeof username !== "string")) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const role = checkCredentials(username || undefined, password);
  if (!role) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const token = await createSessionToken(role);
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
