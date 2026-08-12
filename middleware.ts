import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const authed = await verifySessionToken(token);

  if (!authed) {
    const loginUrl = new URL("/input/login", req.url);
    loginUrl.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/input",
    "/input/",
    "/input/preview",
    "/input/history",
    "/input/compare",
    "/api/save",
    "/api/publish",
    "/api/report-data",
    "/api/ai-fill",
    "/api/ai-highlights",
  ],
};
