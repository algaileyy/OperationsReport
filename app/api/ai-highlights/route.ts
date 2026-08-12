import { NextRequest, NextResponse } from "next/server";
import { TEAMS } from "@/lib/teams";
import { normalizeReport } from "@/lib/report";
import { callAiTool, HIGHLIGHTS_SCHEMA } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const report = normalizeReport(body?.data);

  const lines: string[] = [];
  for (const team of TEAMS) {
    const teamData = report.teams[team.key] ?? {};
    const fieldsText = team.fields.map((f) => `${f.label}: ${teamData[f.key] ?? 0}${f.unit ?? ""}`).join(", ");
    lines.push(`${team.name} — ${fieldsText}`);

    for (const sb of team.sourceBreakdowns ?? []) {
      const entries = report.sourceBreakdowns[team.key]?.[sb.key] ?? [];
      if (entries.length > 0) {
        lines.push(`  ${sb.label}: ` + entries.map((e) => `${e.source} ${e.count}${sb.unit ?? ""}`).join(", "));
      }
    }

    const note = report.notes[team.key];
    if (note) lines.push(`  Note: ${note}`);
  }

  try {
    const result = await callAiTool({
      system:
        "You write a concise, management-facing monthly report summary for a media operations report, " +
        "synthesizing across all teams' numbers and notes provided by the user.",
      userText: lines.join("\n"),
      toolName: "draft_highlights",
      toolDescription: "Draft the Main Achievements, Challenges, and New Initiatives sections of the report.",
      schema: HIGHLIGHTS_SCHEMA,
    });
    return NextResponse.json({ data: result });
  } catch (err) {
    console.error("ai-highlights error:", err);
    return NextResponse.json({ error: "AI draft failed. Try again in a moment." }, { status: 500 });
  }
}
