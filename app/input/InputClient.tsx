"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MonthPicker from "./MonthPicker";
import { monthLabel } from "@/lib/months";
import { TEAMS, publishingTotal } from "@/lib/teams";
import type { MonthlyReport } from "@/lib/report";

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

type Props = {
  publishedMonth: string | null;
  monthsWithData: string[];
  defaultMonth: string;
  initialData: MonthlyReport;
};

export default function InputClient({ publishedMonth, monthsWithData, defaultMonth, initialData }: Props) {
  const router = useRouter();
  const [month, setMonth] = useState(defaultMonth);
  const [data, setData] = useState<MonthlyReport>(initialData);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const [live, setLive] = useState(publishedMonth);
  const [publishMonth, setPublishMonth] = useState(publishedMonth ?? defaultMonth);
  const [publishing, setPublishing] = useState(false);

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

  function setNote(teamKey: string, value: string) {
    setData((d) => ({
      ...d,
      notes: { ...d.notes, [teamKey]: value },
    }));
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
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--ink-primary)" }}>
            Operations Report — Data Entry
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
          {TEAMS.map((team) => {
            const teamData = data.teams[team.key] ?? {};
            const accent = ACCENT_HEX[team.accent];
            return (
              <section
                key={team.key}
                className="rounded-lg border p-5"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <div className="mb-4 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: accent }} />
                  <h2 className="text-base font-semibold" style={{ color: "var(--ink-primary)" }}>
                    {team.name}
                  </h2>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {team.fields.map((field) => (
                    <label key={field.key} className="flex flex-col gap-1">
                      <span className="text-sm" style={{ color: "var(--ink-secondary)" }}>
                        {field.label}
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
                  {team.key === "publishing" && (
                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <span className="text-sm" style={{ color: "var(--ink-secondary)" }}>
                        Total Assets in CMS (auto-calculated: episodes + movies)
                      </span>
                      <div
                        className="rounded-md border px-3 py-2 text-sm font-semibold"
                        style={{ borderColor: "var(--border)", background: "var(--surface-page)", color: "var(--ink-primary)" }}
                      >
                        {publishingTotal(teamData).toLocaleString("en-US")}
                      </div>
                    </div>
                  )}
                </div>
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
              </section>
            );
          })}

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
    </main>
  );
}
