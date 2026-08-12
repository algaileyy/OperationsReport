import { NextRequest, NextResponse } from "next/server";
import { getTeam } from "@/lib/teams";
import { callClaudeTool, buildTeamExtractionSchema } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const teamKey = body?.teamKey;
  const text = body?.text;

  if (typeof teamKey !== "string" || typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "Missing team or text." }, { status: 400 });
  }

  const team = getTeam(teamKey);
  if (!team) {
    return NextResponse.json({ error: "Unknown team." }, { status: 400 });
  }

  try {
    const result = await callClaudeTool({
      system:
        `You extract structured monthly operations numbers for the "${team.name}" team from a free-text ` +
        `recap written by the team. Only include a field or source-breakdown key if the text actually ` +
        `mentions or clearly implies a value for it — omit anything not mentioned rather than guessing ` +
        `or defaulting to zero.`,
      userText: text,
      toolName: "extract_team_report",
      toolDescription: `Extract this month's numbers for ${team.name} from the recap.`,
      schema: buildTeamExtractionSchema(team),
    });
    return NextResponse.json({ data: result });
  } catch (err) {
    console.error("ai-fill error:", err);
    return NextResponse.json({ error: "AI extraction failed. Try again in a moment." }, { status: 500 });
  }
}
