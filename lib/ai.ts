import type { TeamConfig } from "./teams";

const GEMINI_MODEL = "gemini-flash-latest";

/** Gemini's structured-output schema is an OpenAPI subset: uppercase type enums, no additionalProperties. */
function toGeminiSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toGeminiSchema);
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === "additionalProperties") continue;
      if (k === "type" && typeof v === "string") {
        out.type = v.toUpperCase();
        continue;
      }
      out[k] = toGeminiSchema(v);
    }
    return out;
  }
  return node;
}

/** Calls Gemini with a forced JSON response shaped by `schema`, and returns the parsed result. */
export async function callAiTool<T>(opts: {
  system: string;
  userText: string;
  toolName: string;
  toolDescription: string;
  schema: Record<string, unknown>;
  maxTokens?: number;
}): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set.");
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: `${opts.system} ${opts.toolDescription}` }] },
        contents: [{ role: "user", parts: [{ text: opts.userText }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: toGeminiSchema(opts.schema),
          maxOutputTokens: opts.maxTokens ?? 1024,
        },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 300)}`);
  }

  const body = await res.json();
  const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini did not return a structured result.");
  }
  return JSON.parse(text) as T;
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
    const unitHint = f.unit ? ` (in ${f.unit})` : f.unitOptions ? ` (in ${f.unitOptions.join(" or ")})` : "";
    fieldProps[f.key] = {
      type: "number",
      description: `${f.label}${unitHint}. Omit if the text doesn't mention it.`,
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
      fields: { type: "object", properties: fieldProps },
      sourceBreakdowns: { type: "object", properties: sbProps },
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
