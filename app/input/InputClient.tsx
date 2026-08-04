"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TEAMS, publishingTotal, type TeamData } from "@/lib/teams";
import { monthLabel } from "@/lib/months";

const ACCENT_HEX: Record<string, string> = {
  blue: "#2a78d6",
  orange: "#eb6834",
  aqua: "#1baf7a",
  violet: "#4a3aa7",
};

type Props = {
  publishedMonth: string | null;
  monthOptions: string[];
  defaultMonth: string;
  defaultTeamKey: string;
  initialData: TeamData;
};

export default function InputClient({
  publishedMonth,
  monthOptions,
  defaultMonth,
  defaultTeamKey,
  initialData,
}: Props) {
  const router = useRouter();
  const [month, setMonth] = useState(defaultMonth);
  const [teamKey, setTeamKey] = useState(defaultTeamKey);
  const [data, setData] = useState<TeamData>(initialData);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const [live, setLive] = useState(publishedMonth);
  const [publishMonth, setPublishMonth] = useState(publishedMonth ?? defaultMonth);
  const [publishing, setPublishing] = useState(false);

  const team = TEAMS.find((t) => t.key === teamKey)!;
  const accent = ACCENT_HEX[team.accent];

  const loadData = useCallback(async (tKey: string, m: string) => {
    setLoading(true);
    setSaveMsg(null);
    const res = await fetch(`/api/report-data?teamKey=${tKey}&month=${m}`);
    const body = await res.json();
    setData(body.data ?? {});
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData(teamKey, month);
  }, [teamKey, month, loadData]);

  async function onSave() {
    setSaving(true);
    setSaveMsg(null);
    const res = await fetch("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamKey, month, data }),
    });
    setSaving(false);
    setSaveMsg(res.ok ? "Saved." : "Failed to save.");
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
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--ink-primary)" }}>
            Operations Report — Data Entry
          </h1>
          <p className="text-sm" style={{ color: "var(--ink-secondary)" }}>
            Enter each team&apos;s numbers, then control which month is live on the public report.
          </p>
        </div>
        <button
          onClick={onSignOut}
          className="text-sm underline"
          style={{ color: "var(--ink-muted)" }}
        >
          Sign out
        </button>
      </div>

      <section
        className="mb-8 rounded-lg border p-4"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <h2 className="mb-2 text-sm font-semibold" style={{ color: "var(--ink-primary)" }}>
          Live report month
        </h2>
        <p className="mb-3 text-sm" style={{ color: "var(--ink-secondary)" }}>
          Currently showing on the public report:{" "}
          <strong>{live ? monthLabel(live) : "nothing published yet"}</strong>
        </p>
        <div className="flex items-center gap-2">
          <select
            value={publishMonth}
            onChange={(e) => setPublishMonth(e.target.value)}
            className="rounded-md border px-3 py-1.5 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--ink-primary)" }}
          >
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
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

      <div className="mb-4 flex flex-wrap gap-2">
        {TEAMS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTeamKey(t.key)}
            className="rounded-full border px-3 py-1.5 text-sm font-medium"
            style={{
              borderColor: t.key === teamKey ? ACCENT_HEX[t.accent] : "var(--border)",
              background: t.key === teamKey ? ACCENT_HEX[t.accent] : "transparent",
              color: t.key === teamKey ? "#ffffff" : "var(--ink-secondary)",
            }}
          >
            {t.name}
          </button>
        ))}
      </div>

      <div className="mb-6 flex items-center gap-2">
        <label className="text-sm" style={{ color: "var(--ink-secondary)" }}>
          Month
        </label>
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-md border px-3 py-1.5 text-sm"
          style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--ink-primary)" }}
        >
          {monthOptions.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </select>
      </div>

      <section
        className="rounded-lg border p-5"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="mb-4 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: accent }} />
          <h2 className="text-base font-semibold" style={{ color: "var(--ink-primary)" }}>
            {team.name}
          </h2>
          {team.heading && (
            <span className="text-sm" style={{ color: "var(--ink-muted)" }}>
              · {team.heading}
            </span>
          )}
        </div>

        {loading ? (
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Loading…
          </p>
        ) : (
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
                  value={data[field.key] ?? ""}
                  onChange={(e) =>
                    setData((d) => ({ ...d, [field.key]: e.target.value === "" ? 0 : Number(e.target.value) }))
                  }
                  className="rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--ink-primary)" }}
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
                  {publishingTotal(data).toLocaleString("en-US")}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={onSave}
            disabled={saving || loading}
            className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ background: accent }}
          >
            {saving ? "Saving…" : `Save ${team.name}`}
          </button>
          {saveMsg && (
            <span className="text-sm" style={{ color: "var(--ink-secondary)" }}>
              {saveMsg}
            </span>
          )}
        </div>
      </section>
    </main>
  );
}
