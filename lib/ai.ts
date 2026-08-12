import type { TeamConfig } from "./teams";

const ANTHROPIC_MODEL = "claude-sonnet-5";

/** Calls Claude with a single forced tool, and returns that tool's structured input. */
export async function callClaudeTool<T>(opts: {
  system: string;
  userText: string;
  toolName: string;
  toolDescription: string;
  schema: Record<string, unknown>;
  maxTokens?: number;
}): Promise<T> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set.");
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: opts.maxTokens ?? 1024,
      system: opts.system,
      messages: [{ role: "user", content: opts.userText }],
      tools: [{ name: opts.toolName, description: opts.toolDescription, input_schema: opts.schema }],
      tool_choice: { type: "tool", name: opts.toolName },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Claude API error ${res.status}: ${errText.slice(0, 300)}`);
  }

  const body = await res.json();
  const toolUse = (body.content ?? []).find((block: { type: string }) => block.type === "tool_use");
  if (!toolUse) {
    throw new Error("Claude did not return a structured result.");
  }
  return toolUse.input as T;
}

/**
 * A JSON schema for extracting one team's monthly numbers from a free-text
 * recap. Every property is optional — the model is instructed to omit
 * anything the text doesn't actually mention, rather than guess or default
 * to zero, so the caller can merge the result into existing data without
 * clobbering fields the recap didn't touch.
 */
export function buildTeamExtractionSchema(team: TeamConfig) {
  const fieldProps: Record<string, unknown> = {};
  for (const f of team.fields) {
    fieldProps[f.key] = {
      type: "number",
      description: `${f.label}${f.unit ? ` (in ${f.unit})` : ""}. Omit if the text doesn't mention it.`,
    };
  }

  const sbProps: Record<string, unknown> = {};
  for (const sb of team.sourceBreakdowns ?? []) {
    sbProps[sb.key] = {
      type: "array",
      description:
        `${sb.label}${sb.unit ? ` (in ${sb.unit})` : ""} — one entry per source/client/channel mentioned. ` +
        `Omit this key entirely if the text doesn't mention it.`,
      items: {
        type: "object",
        properties: {
          source: { type: "string", description: "Name of the client, channel, or source." },
          count: { type: "number" },
        },
        required: ["source", "count"],
      },
    };
  }

  return {
    type: "object",
    properties: {
      fields: { type: "object", properties: fieldProps, additionalProperties: false },
      sourceBreakdowns: { type: "object", properties: sbProps, additionalProperties: false },
      notes: {
        type: "string",
        description: "Anything else worth calling out that doesn't fit a specific number. Omit if nothing extra.",
      },
      summary: {
        type: "string",
        description: "One or two plain-English sentences recapping what you extracted, shown back to the person for confirmation.",
      },
    },
    required: ["summary"],
  };
}

export const HIGHLIGHTS_SCHEMA = {
  type: "object",
  properties: {
    mainAchievements: { type: "string", description: "1-3 sentences on what went well across teams this month." },
    challenges: { type: "string", description: "1-3 sentences on difficulties or blockers this month." },
    newInitiatives: { type: "string", description: "1-3 sentences on what's starting up or planned." },
  },
  required: ["mainAchievements", "challenges", "newInitiatives"],
};
