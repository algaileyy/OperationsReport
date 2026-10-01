import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { addCustomActivity, getCustomActivities } from "@/lib/db";

/** Any signed-in team member can add a new Production Support Activity (e.g. "Production support
 * meeting") at any time — not just admins, since this is the team's own section to extend. */
export async function GET(req: NextRequest) {
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const activities = await getCustomActivities();
  return NextResponse.json({ activities });
}

export async function POST(req: NextRequest) {
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const label = typeof body?.label === "string" ? body.label.trim() : "";
  if (!label) {
    return NextResponse.json({ error: "Activity name required." }, { status: 400 });
  }
  const activity = await addCustomActivity(label);
  return NextResponse.json({ activity });
}
