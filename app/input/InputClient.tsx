"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MonthPicker from "./MonthPicker";
import { monthLabel } from "@/lib/months";
import { TEAMS } from "@/lib/teams";
import type { MonthlyReport, ReportHighlights, SourceEntry } from "@/lib/report";

const ACCENT_HEX: Record<string, string> = {
  blue: "#2a78d6",
  orange: "#eb6834",
  aqua: "#1baf7a",
  violet: "#4a3aa7",
};

const inputStyle = {
  borderColor: "var(--border)",
  background: "var(--surface)",
  color: "var(--ink-primary)",
} as const;

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-lg border p-5 shadow-xl"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold" style={{ color: "var(--ink-primary)" }}>
            {title}
          </h3>
          <button onClick={onClose} aria-label="Close" className="text-lg leading-none" style={{ color: "var(--ink-muted)" }}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

type Props = {
  publishedMonth: string | null;
  monthsWithData: string[];
  defaultMonth: string;
  initialData: MonthlyReport;
  initialRecipients: string[];
};

export default function InputClient({
  publishedMonth,
  monthsWithData,
  defaultMonth,
  initialData,
  initialRecipients,
}: Props) {
  const router = useRouter();
  const [month, setMonth] = useState(defaultMonth);
  const [data, setData] = useState<MonthlyReport>(initialData);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const [live, setLive] = useState(publishedMonth);
  const [publishMonth, setPublishMonth] = useState(publishedMonth ?? defaultMonth);
  const [publishing, setPublishing] = useState(false);
  const [activeTeam, setActiveTeam] = useState(TEAMS[0].key);

  const [aiText, setAiText] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [aiSummary, setAiSummary] = useState<Record<string, string>>({});
  const [aiError, setAiError] = useState<Record<string, string | null>>({});
  const [aiModalTeam, setAiModalTeam] = useState<string | null>(null);
  const [highlightsLoading, setHighlightsLoading] = useState(false);
  const [highlightsError, setHighlightsError] = useState<string | null>(null);
  const [highlightsModalOpen, setHighlightsModalOpen] = useState(false);

  const [recipients, setRecipients] = useState<{ id: string; email: string }[]>(
    initialRecipients.map((email) => ({ id: newId("rcpt"), email }))
  );
  const [recipientsSaving, setRecipientsSaving] = useState(false);
  const [recipientsMsg, setRecipientsMsg] = useState<string | null>(null);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderMsg, setReminderMsg] = useState<string | null>(null);

  async function onSaveRecipients() {
    const emails = recipients.map((r) => r.email.trim()).filter(Boolean);
    setRecipientsSaving(true);
    setRecipientsMsg(null);
    const res = await fetch("/api/reminder-recipients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipients: emails }),
    });
    setRecipientsSaving(false);
    setRecipientsMsg(res.ok ? "Saved." : "Failed to save — check that every address looks valid.");
  }

  async function onSendReminderNow() {
    setSendingReminder(true);
    setReminderMsg(null);
    try {
      const res = await fetch("/api/send-reminder", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to send.");
      setReminderMsg(`Sent to ${body.sent} recipient${body.sent === 1 ? "" : "s"}.`);
    } catch (err) {
      setReminderMsg(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSendingReminder(false);
    }
  }

  async function loadMonth(m: string) {
    setMonth(m);
    setLoading(true);
    setSaveMsg(null);
    const res = await fetch(`/api/report-data?month=${m}`);
    const body = await res.json();
    setData(body.data);
    setLoading(false);
  }

  function setField(teamKey: string, fieldKey: string, value: string) {
    setData((d) => ({
      ...d,
      teams: {
        ...d.teams,
        [teamKey]: {
          ...d.teams[teamKey],
          [fieldKey]: value === "" ? 0 : Number(value),
        },
      },
    }));
  }

  function setHighlight(field: keyof ReportHighlights, value: string) {
    setData((d) => ({
      ...d,
      highlights: { ...d.highlights, [field]: value },
    }));
  }

  function setQcHoursTotal(value: string) {
    setData((d) => ({ ...d, qcHoursTotal: value === "" ? 0 : Number(value) }));
  }

  function setNote(teamKey: string, value: string) {
    setData((d) => ({
      ...d,
      notes: { ...d.notes, [teamKey]: value },
    }));
  }

  function setSourceEntries(teamKey: string, breakdownKey: string, entries: SourceEntry[]) {
    setData((d) => ({
      ...d,
      sourceBreakdowns: {
        ...d.sourceBreakdowns,
        [teamKey]: { ...d.sourceBreakdowns[teamKey], [breakdownKey]: entries },
      },
    }));
  }

  async function onAiFill(teamKey: string) {
    const text = (aiText[teamKey] ?? "").trim();
    if (!text) return;
    setAiLoading((s) => ({ ...s, [teamKey]: true }));
    setAiError((s) => ({ ...s, [teamKey]: null }));
    try {
      const res = await fetch("/api/ai-fill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamKey, text }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "AI extraction failed.");
      const result = body.data as {
        fields?: Record<string, number>;
        sourceBreakdowns?: Record<string, { source: string; count: number }[]>;
        notes?: string;
        summary?: string;
      };

      setData((d) => {
        const nextTeamData = { ...d.teams[teamKey], ...(result.fields ?? {}) };
        const nextSbForTeam = { ...d.sourceBreakdowns[teamKey] };
        for (const [key, entries] of Object.entries(result.sourceBreakdowns ?? {})) {
          nextSbForTeam[key] = entries.map((e) => ({ id: newId("src"), source: e.source, count: e.count }));
        }
        return {
          ...d,
          teams: { ...d.teams, [teamKey]: nextTeamData },
          sourceBreakdowns: { ...d.sourceBreakdowns, [teamKey]: nextSbForTeam },
          notes: result.notes ? { ...d.notes, [teamKey]: result.notes } : d.notes,
        };
      });
      setAiSummary((s) => ({ ...s, [teamKey]: result.summary ?? "" }));
    } catch (err) {
      setAiError((s) => ({ ...s, [teamKey]: err instanceof Error ? err.message : "Something went wrong." }));
    } finally {
      setAiLoading((s) => ({ ...s, [teamKey]: false }));
    }
  }

  async function onAiDraftHighlights() {
    setHighlightsLoading(true);
    setHighlightsError(null);
    try {
      const res = await fetch("/api/ai-highlights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "AI draft failed.");
      setData((d) => ({ ...d, highlights: body.data }));
    } catch (err) {
      setHighlightsError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setHighlightsLoading(false);
    }
  }

  async function onSave() {
    setSaving(true);
    setSaveMsg(null);
    const res = await fetch("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, data }),
    });
    setSaving(false);
    if (!res.ok) {
      setSaveMsg("Failed to save.");
    } else if (month === live) {
      setSaveMsg("Saved — this month is already live, no need to republish.");
    } else {
      setSaveMsg(`Saved. ${monthLabel(month)} is not the live report yet — use "Live report month" above to publish it.`);
    }
  }

  async function onPublish() {
    setPublishing(true);
    const res = await fetch("/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month: publishMonth }),
    });
    setPublishing(false);
    if (res.ok) setLive(publishMonth);
  }

  async function onSignOut() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--ink-primary)" }}>
            Media Operations Report — Data Entry
          </h1>
          <p className="text-sm" style={{ color: "var(--ink-secondary)" }}>
            Enter each team&apos;s numbers, then control which month is live on the public report.
          </p>
        </div>
        <button onClick={onSignOut} className="text-sm underline" style={{ color: "var(--ink-muted)" }}>
          Sign out
        </button>
      </div>

      <section className="mb-8 rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <h2 className="mb-2 text-sm font-semibold" style={{ color: "var(--ink-primary)" }}>
          Live report month
        </h2>
        <p className="mb-3 text-sm" style={{ color: "var(--ink-secondary)" }}>
          Currently showing on the public report: <strong>{live ? monthLabel(live) : "nothing published yet"}</strong>
        </p>
        <div className="flex items-end gap-2">
          <MonthPicker value={publishMonth} onChange={setPublishMonth} markedMonths={monthsWithData} />
          <button
            onClick={onPublish}
            disabled={publishing || publishMonth === live}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            style={{ background: "#0ca30c" }}
          >
            {publishing ? "Publishing…" : "Set as live report"}
          </button>
        </div>
      </section>

      <section className="mb-8 rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <h2 className="mb-2 text-sm font-semibold" style={{ color: "var(--ink-primary)" }}>
          Team Reminders
        </h2>
        <p className="mb-3 text-sm" style={{ color: "var(--ink-secondary)" }}>
          These emails get a reminder to submit their numbers automatically near the end of each month, or whenever
          you send one manually below.
        </p>
        <div className="flex flex-col gap-2">
          {recipients.map((r) => (
            <div key={r.id} className="flex items-center gap-2">
              <input
                type="email"
                placeholder="name@example.com"
                value={r.email}
                onChange={(e) =>
                  setRecipients((list) => list.map((x) => (x.id === r.id ? { ...x, email: e.target.value } : x)))
                }
                className="flex-1 rounded-md border px-3 py-2 text-sm"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => setRecipients((list) => list.filter((x) => x.id !== r.id))}
                aria-label="Remove recipient"
                className="px-2 text-sm"
                style={{ color: "#d03b3b" }}
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setRecipients((list) => [...list, { id: newId("rcpt"), email: "" }])}
            className="self-start rounded-md border px-3 py-1.5 text-sm font-medium"
            style={{ borderColor: "var(--border)", color: "var(--ink-secondary)" }}
          >
            + Add recipient
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            onClick={onSaveRecipients}
            disabled={recipientsSaving}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            style={{ background: "#2a78d6" }}
          >
            {recipientsSaving ? "Saving…" : "Save recipients"}
          </button>
          <button
            onClick={onSendReminderNow}
            disabled={sendingReminder}
            className="rounded-md border px-3 py-1.5 text-sm font-medium disabled:opacity-50"
            style={{ borderColor: "var(--border)", color: "var(--ink-secondary)" }}
          >
            {sendingReminder ? "Sending…" : "Send reminder now"}
          </button>
          {(recipientsMsg || reminderMsg) && (
            <span className="text-sm" style={{ color: "var(--ink-secondary)" }}>
              {recipientsMsg} {reminderMsg}
            </span>
          )}
        </div>
      </section>

      <div className="mb-6 flex items-end justify-between gap-3">
        <MonthPicker value={month} onChange={loadMonth} markedMonths={monthsWithData} label="Editing month" />
        <Link href={`/input/preview?month=${month}`} className="text-sm underline" style={{ color: "var(--ink-secondary)" }}>
          Export this month&apos;s report
        </Link>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
          Loading…
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          <section className="rounded-lg border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold" style={{ color: "var(--ink-primary)" }}>
                Report Highlights
              </h2>
              <button
                type="button"
                onClick={() => setHighlightsModalOpen(true)}
                className="rounded-md border px-3 py-1.5 text-sm font-medium"
                style={{ borderColor: "var(--border)", color: "var(--ink-secondary)" }}
              >
                ✨ Draft with AI
              </button>
            </div>
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-sm" style={{ color: "var(--ink-secondary)" }}>
                  QC Hours Total
                </span>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={data.qcHoursTotal ?? ""}
                  onChange={(e) => setQcHoursTotal(e.target.value)}
                  placeholder="Total hours spent on QC this month, across all teams"
                  className="w-48 rounded-md border px-3 py-2 text-sm"
                  style={inputStyle}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm" style={{ color: "var(--ink-secondary)" }}>
                  Main Achievements
                </span>
                <textarea
                  value={data.highlights.mainAchievements}
                  onChange={(e) => setHighlight("mainAchievements", e.target.value)}
                  rows={3}
                  placeholder="What went well this month…"
                  className="rounded-md border px-3 py-2 text-sm"
                  style={inputStyle}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm" style={{ color: "var(--ink-secondary)" }}>
                  Challenges
                </span>
                <textarea
                  value={data.highlights.challenges}
                  onChange={(e) => setHighlight("challenges", e.target.value)}
                  rows={3}
                  placeholder="What was difficult or blocked this month…"
                  className="rounded-md border px-3 py-2 text-sm"
                  style={inputStyle}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm" style={{ color: "var(--ink-secondary)" }}>
                  New Initiatives
                </span>
                <textarea
                  value={data.highlights.newInitiatives}
                  onChange={(e) => setHighlight("newInitiatives", e.target.value)}
                  rows={3}
                  placeholder="What's starting up or planned…"
                  className="rounded-md border px-3 py-2 text-sm"
                  style={inputStyle}
                />
              </label>
            </div>
          </section>

          <div className="flex flex-wrap gap-1 border-b" style={{ borderColor: "var(--border)" }}>
            {TEAMS.map((team) => {
              const accent = ACCENT_HEX[team.accent];
              const active = team.key === activeTeam;
              return (
                <button
                  key={team.key}
                  onClick={() => setActiveTeam(team.key)}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium"
                  style={{
                    color: active ? "var(--ink-primary)" : "var(--ink-secondary)",
                    borderBottom: active ? `2px solid ${accent}` : "2px solid transparent",
                    marginBottom: "-1px",
                  }}
                >
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: accent }} />
                  {team.name}
                </button>
              );
            })}
          </div>

          {TEAMS.filter((team) => team.key === activeTeam).map((team) => {
            const teamData = data.teams[team.key] ?? {};
            const accent = ACCENT_HEX[team.accent];
            return (
              <section
                key={team.key}
                className="rounded-lg border p-5"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <div className="mb-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: accent }} />
                    <h2 className="text-base font-semibold" style={{ color: "var(--ink-primary)" }}>
                      {team.name}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAiModalTeam(team.key)}
                    className="rounded-md border px-3 py-1.5 text-sm font-medium"
                    style={{ borderColor: "var(--border)", color: "var(--ink-secondary)" }}
                  >
                    ✨ AI Fill
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {team.fields.map((field) => (
                    <label key={field.key} className="flex flex-col gap-1">
                      <span className="text-sm" style={{ color: "var(--ink-secondary)" }}>
                        {field.label}
                        {field.unit && ` (${field.unit})`}
                      </span>
                      <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={teamData[field.key] ?? ""}
                        onChange={(e) => setField(team.key, field.key, e.target.value)}
                        className="rounded-md border px-3 py-2 text-sm"
                        style={inputStyle}
                      />
                    </label>
                  ))}
                </div>

                {(team.sourceBreakdowns ?? []).map((sb) => {
                  const entries = data.sourceBreakdowns[team.key]?.[sb.key] ?? [];
                  return (
                    <div key={sb.key} className="mt-4">
                      <span className="text-sm" style={{ color: "var(--ink-secondary)" }}>
                        {sb.label} (by source{sb.unit ? `, ${sb.unit}` : ""})
                      </span>
                      <div className="mt-1 flex flex-col gap-2">
                        {entries.map((entry) => (
                          <div key={entry.id} className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Source, e.g. Atheer"
                              value={entry.source}
                              onChange={(e) =>
                                setSourceEntries(
                                  team.key,
                                  sb.key,
                                  entries.map((x) => (x.id === entry.id ? { ...x, source: e.target.value } : x))
                                )
                              }
                              className="flex-1 rounded-md border px-3 py-2 text-sm"
                              style={inputStyle}
                            />
                            <input
                              type="number"
                              min={0}
                              value={entry.count}
                              onChange={(e) =>
                                setSourceEntries(
                                  team.key,
                                  sb.key,
                                  entries.map((x) => (x.id === entry.id ? { ...x, count: Number(e.target.value) || 0 } : x))
                                )
                              }
                              className="w-24 rounded-md border px-3 py-2 text-sm"
                              style={inputStyle}
                            />
                            <button
                              type="button"
                              onClick={() => setSourceEntries(team.key, sb.key, entries.filter((x) => x.id !== entry.id))}
                              aria-label="Remove source"
                              className="px-2 text-sm"
                              style={{ color: "#d03b3b" }}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            setSourceEntries(team.key, sb.key, [...entries, { id: newId("src"), source: "", count: 0 }])
                          }
                          className="self-start rounded-md border px-3 py-1.5 text-sm font-medium"
                          style={{ borderColor: "var(--border)", color: "var(--ink-secondary)" }}
                        >
                          + Add source
                        </button>
                      </div>
                    </div>
                  );
                })}

                <label className="mt-4 flex flex-col gap-1">
                  <span className="text-sm" style={{ color: "var(--ink-secondary)" }}>
                    Notes
                  </span>
                  <textarea
                    value={data.notes?.[team.key] ?? ""}
                    onChange={(e) => setNote(team.key, e.target.value)}
                    rows={2}
                    placeholder="Anything worth calling out for this team this month…"
                    className="rounded-md border px-3 py-2 text-sm"
                    style={inputStyle}
                  />
                </label>

                {aiModalTeam === team.key && (
                  <Modal title={`AI Fill — ${team.name}`} onClose={() => setAiModalTeam(null)}>
                    <label className="flex flex-col gap-1">
                      <span className="text-sm" style={{ color: "var(--ink-secondary)" }}>
                        Describe this month in plain English, and AI will fill in the numbers below.
                      </span>
                      <textarea
                        value={aiText[team.key] ?? ""}
                        onChange={(e) => setAiText((s) => ({ ...s, [team.key]: e.target.value }))}
                        rows={4}
                        placeholder="e.g. We uploaded 62 assets to Frame.io, had 15 catch-up originals, and archived projects for Atheer (42TB) and Doha Debates (18TB)…"
                        className="rounded-md border px-3 py-2 text-sm"
                        style={inputStyle}
                      />
                    </label>
                    <div className="mt-3 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => onAiFill(team.key)}
                        disabled={aiLoading[team.key] || !(aiText[team.key] ?? "").trim()}
                        className="rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                        style={{ background: accent }}
                      >
                        {aiLoading[team.key] ? "Filling…" : "Fill with AI"}
                      </button>
                      {aiError[team.key] && (
                        <span className="text-sm" style={{ color: "#d03b3b" }}>
                          {aiError[team.key]}
                        </span>
                      )}
                    </div>
                    {aiSummary[team.key] && (
                      <>
                        <p className="mt-3 text-sm italic" style={{ color: "var(--ink-secondary)" }}>
                          AI understood: {aiSummary[team.key]}
                        </p>
                        <p className="mt-2 text-sm" style={{ color: "var(--ink-muted)" }}>
                          Fields below have been updated — close this, review, then hit Save.
                        </p>
                      </>
                    )}
                  </Modal>
                )}
              </section>
            );
          })}

          {highlightsModalOpen && (
            <Modal title="Draft Highlights with AI" onClose={() => setHighlightsModalOpen(false)}>
              <p className="mb-3 text-sm" style={{ color: "var(--ink-secondary)" }}>
                Uses this month&apos;s saved numbers and notes across all teams to draft Main Achievements,
                Challenges, and New Initiatives.
              </p>
              {highlightsError && (
                <p className="mb-3 text-sm" style={{ color: "#d03b3b" }}>
                  {highlightsError}
                </p>
              )}
              <button
                type="button"
                onClick={onAiDraftHighlights}
                disabled={highlightsLoading}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                style={{ background: "#2a78d6" }}
              >
                {highlightsLoading ? "Drafting…" : "Generate draft"}
              </button>
              <p className="mt-3 text-sm" style={{ color: "var(--ink-muted)" }}>
                The draft will fill the three fields above — close this, then review and edit them there before
                saving.
              </p>
            </Modal>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={onSave}
              disabled={saving}
              className="rounded-md px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "#2a78d6" }}
            >
              {saving ? "Saving…" : `Save ${monthLabel(month)}`}
            </button>
            {saveMsg && (
              <span className="text-sm" style={{ color: "var(--ink-secondary)" }}>
                {saveMsg}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
