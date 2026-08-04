"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MonthPicker from "./MonthPicker";
import { monthLabel } from "@/lib/months";
import type { MonthlyReport, Priority } from "@/lib/report";

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function updateById<T extends { id: string }>(list: T[], id: string, patch: Partial<T>): T[] {
  return list.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

function removeById<T extends { id: string }>(list: T[], id: string): T[] {
  return list.filter((item) => item.id !== id);
}

const inputStyle = {
  borderColor: "var(--border)",
  background: "var(--surface)",
  color: "var(--ink-primary)",
} as const;

function Cell({
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  value: string | number | null;
  onChange: (v: string) => void;
  type?: "text" | "number";
  placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded border px-2 py-1.5 text-sm"
      style={inputStyle}
    />
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <h2 className="mb-4 text-base font-semibold" style={{ color: "var(--ink-primary)" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 rounded-md border px-3 py-1.5 text-sm font-medium"
      style={{ borderColor: "var(--border)", color: "var(--ink-secondary)" }}
    >
      + {label}
    </button>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Remove row"
      className="rounded px-2 text-sm"
      style={{ color: "#d03b3b" }}
    >
      ×
    </button>
  );
}

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

  async function onSave() {
    setSaving(true);
    setSaveMsg(null);
    const res = await fetch("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, data }),
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
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--ink-primary)" }}>
            Digital Archiving Report — Data Entry
          </h1>
          <p className="text-sm" style={{ color: "var(--ink-secondary)" }}>
            Edit this month&apos;s report, then control which month is live on the public report.
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

      <div className="mb-6">
        <MonthPicker value={month} onChange={loadMonth} markedMonths={monthsWithData} label="Editing month" />
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
          Loading…
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {/* 1. Archiving Progress */}
          <SectionCard title="1. Archiving Progress">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr style={{ color: "var(--ink-muted)" }}>
                    <th className="p-1.5 text-left font-medium">Program/Show</th>
                    <th className="p-1.5 text-left font-medium">Ready to Archive (TB)</th>
                    <th className="p-1.5 text-left font-medium">In Progress (TB)</th>
                    <th className="p-1.5 text-left font-medium">Archived (TB)</th>
                    <th className="p-1.5 text-left font-medium">Episodes/Projects</th>
                    <th className="p-1.5 text-left font-medium">Status</th>
                    <th className="p-1.5" />
                  </tr>
                </thead>
                <tbody>
                  {data.archivingProgress.map((row) => (
                    <tr key={row.id}>
                      <td className="p-1.5">
                        <Cell value={row.programShow} onChange={(v) => setData((d) => ({ ...d, archivingProgress: updateById(d.archivingProgress, row.id, { programShow: v }) }))} />
                      </td>
                      <td className="p-1.5">
                        <Cell type="number" value={row.readyToArchiveTb} onChange={(v) => setData((d) => ({ ...d, archivingProgress: updateById(d.archivingProgress, row.id, { readyToArchiveTb: v === "" ? null : Number(v) }) }))} />
                      </td>
                      <td className="p-1.5">
                        <Cell type="number" value={row.inProgressTb} onChange={(v) => setData((d) => ({ ...d, archivingProgress: updateById(d.archivingProgress, row.id, { inProgressTb: v === "" ? null : Number(v) }) }))} />
                      </td>
                      <td className="p-1.5">
                        <Cell type="number" value={row.archivedTb} onChange={(v) => setData((d) => ({ ...d, archivingProgress: updateById(d.archivingProgress, row.id, { archivedTb: v === "" ? null : Number(v) }) }))} />
                      </td>
                      <td className="p-1.5">
                        <Cell value={row.episodesProjects} placeholder="e.g. 180 eps / 10 progs" onChange={(v) => setData((d) => ({ ...d, archivingProgress: updateById(d.archivingProgress, row.id, { episodesProjects: v }) }))} />
                      </td>
                      <td className="p-1.5">
                        <Cell value={row.status} placeholder="In Progress" onChange={(v) => setData((d) => ({ ...d, archivingProgress: updateById(d.archivingProgress, row.id, { status: v }) }))} />
                      </td>
                      <td className="p-1.5">
                        <RemoveButton onClick={() => setData((d) => ({ ...d, archivingProgress: removeById(d.archivingProgress, row.id) }))} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AddButton
              label="Add program/show"
              onClick={() =>
                setData((d) => ({
                  ...d,
                  archivingProgress: [
                    ...d.archivingProgress,
                    { id: newId("ap"), programShow: "", readyToArchiveTb: null, inProgressTb: null, archivedTb: null, episodesProjects: "", status: "" },
                  ],
                }))
              }
            />
          </SectionCard>

          {/* 2. Server Storage Overview */}
          <SectionCard title="2. Server Storage Overview">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr style={{ color: "var(--ink-muted)" }}>
                    <th className="p-1.5 text-left font-medium">Server</th>
                    <th className="p-1.5 text-left font-medium">Full Capacity (TB)</th>
                    <th className="p-1.5 text-left font-medium">Space Released (TB)</th>
                    <th className="p-1.5 text-left font-medium">Total Free Now (TB)</th>
                    <th className="p-1.5 text-left font-medium">Notes</th>
                    <th className="p-1.5" />
                  </tr>
                </thead>
                <tbody>
                  {data.serverStorage.map((row) => (
                    <tr key={row.id}>
                      <td className="p-1.5">
                        <Cell value={row.server} onChange={(v) => setData((d) => ({ ...d, serverStorage: updateById(d.serverStorage, row.id, { server: v }) }))} />
                      </td>
                      <td className="p-1.5">
                        <Cell type="number" value={row.fullCapacityTb} onChange={(v) => setData((d) => ({ ...d, serverStorage: updateById(d.serverStorage, row.id, { fullCapacityTb: v === "" ? null : Number(v) }) }))} />
                      </td>
                      <td className="p-1.5">
                        <Cell type="number" value={row.spaceReleasedTb} onChange={(v) => setData((d) => ({ ...d, serverStorage: updateById(d.serverStorage, row.id, { spaceReleasedTb: v === "" ? null : Number(v) }) }))} />
                      </td>
                      <td className="p-1.5">
                        <Cell type="number" value={row.totalFreeNowTb} onChange={(v) => setData((d) => ({ ...d, serverStorage: updateById(d.serverStorage, row.id, { totalFreeNowTb: v === "" ? null : Number(v) }) }))} />
                      </td>
                      <td className="p-1.5">
                        <Cell value={row.notes} onChange={(v) => setData((d) => ({ ...d, serverStorage: updateById(d.serverStorage, row.id, { notes: v }) }))} />
                      </td>
                      <td className="p-1.5">
                        <RemoveButton onClick={() => setData((d) => ({ ...d, serverStorage: removeById(d.serverStorage, row.id) }))} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AddButton
              label="Add server"
              onClick={() =>
                setData((d) => ({
                  ...d,
                  serverStorage: [...d.serverStorage, { id: newId("ss"), server: "", fullCapacityTb: null, spaceReleasedTb: null, totalFreeNowTb: null, notes: "" }],
                }))
              }
            />
          </SectionCard>

          {/* 3. Tapes, Capacity, and Upcoming Milestones */}
          <SectionCard title="3. Tapes, Capacity, and Upcoming Milestones">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label className="flex flex-col gap-1">
                <span className="text-sm" style={{ color: "var(--ink-secondary)" }}>Current Archive Capacity</span>
                <Cell value={data.milestones.currentArchiveCapacity} placeholder="e.g. 180 TB" onChange={(v) => setData((d) => ({ ...d, milestones: { ...d.milestones, currentArchiveCapacity: v } }))} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm" style={{ color: "var(--ink-secondary)" }}>New Capacity Expected</span>
                <Cell value={data.milestones.newCapacityExpected} placeholder="e.g. 1.8 PB — Mid-March 2026" onChange={(v) => setData((d) => ({ ...d, milestones: { ...d.milestones, newCapacityExpected: v } }))} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm" style={{ color: "var(--ink-secondary)" }}>Next Migration Phase</span>
                <Cell value={data.milestones.nextMigrationPhase} placeholder="e.g. Doha Debate" onChange={(v) => setData((d) => ({ ...d, milestones: { ...d.milestones, nextMigrationPhase: v } }))} />
              </label>
            </div>
          </SectionCard>

          {/* 4. Active Issues & Actions */}
          <SectionCard title="4. Active Issues & Actions">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr style={{ color: "var(--ink-muted)" }}>
                    <th className="p-1.5 text-left font-medium">Issue</th>
                    <th className="p-1.5 text-left font-medium">Priority</th>
                    <th className="p-1.5 text-left font-medium">Action / Owner</th>
                    <th className="p-1.5 text-left font-medium">ETA / Status</th>
                    <th className="p-1.5" />
                  </tr>
                </thead>
                <tbody>
                  {data.issues.map((row) => (
                    <tr key={row.id}>
                      <td className="p-1.5">
                        <Cell value={row.issue} onChange={(v) => setData((d) => ({ ...d, issues: updateById(d.issues, row.id, { issue: v }) }))} />
                      </td>
                      <td className="p-1.5">
                        <select
                          value={row.priority}
                          onChange={(e) => setData((d) => ({ ...d, issues: updateById(d.issues, row.id, { priority: e.target.value as Priority }) }))}
                          className="w-full rounded border px-2 py-1.5 text-sm"
                          style={inputStyle}
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                        </select>
                      </td>
                      <td className="p-1.5">
                        <Cell value={row.actionOwner} onChange={(v) => setData((d) => ({ ...d, issues: updateById(d.issues, row.id, { actionOwner: v }) }))} />
                      </td>
                      <td className="p-1.5">
                        <Cell value={row.etaStatus} onChange={(v) => setData((d) => ({ ...d, issues: updateById(d.issues, row.id, { etaStatus: v }) }))} />
                      </td>
                      <td className="p-1.5">
                        <RemoveButton onClick={() => setData((d) => ({ ...d, issues: removeById(d.issues, row.id) }))} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <AddButton
              label="Add issue"
              onClick={() =>
                setData((d) => ({
                  ...d,
                  issues: [...d.issues, { id: newId("is"), issue: "", priority: "Medium", actionOwner: "", etaStatus: "" }],
                }))
              }
            />
          </SectionCard>

          {/* Storage capacity breakdown (sidebar pie charts on the public report) */}
          <SectionCard title="Storage Capacity Breakdown">
            <p className="mb-4 text-xs" style={{ color: "var(--ink-muted)" }}>
              Shown as pie charts in the sidebar of the public report. &quot;Currently Free&quot; and &quot;Still in Use&quot; should add up to the total capacity; &quot;Freed by Archiving&quot; is a subset of the free space, called out separately.
            </p>
            <div className="flex flex-col gap-4">
              {data.storageCapacities.map((sc) => (
                <div key={sc.id} className="rounded-md border p-3" style={{ borderColor: "var(--border)" }}>
                  <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Cell value={sc.name} placeholder="Name, e.g. Digital03" onChange={(v) => setData((d) => ({ ...d, storageCapacities: updateById(d.storageCapacities, sc.id, { name: v }) }))} />
                    <Cell value={sc.subtitle} placeholder="Subtitle, e.g. Archive / Primary Source Storage" onChange={(v) => setData((d) => ({ ...d, storageCapacities: updateById(d.storageCapacities, sc.id, { subtitle: v }) }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <label className="flex flex-col gap-1">
                      <span className="text-xs" style={{ color: "var(--ink-secondary)" }}>Total Capacity (TB)</span>
                      <Cell type="number" value={sc.totalCapacityTb} onChange={(v) => setData((d) => ({ ...d, storageCapacities: updateById(d.storageCapacities, sc.id, { totalCapacityTb: v === "" ? null : Number(v) }) }))} />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs" style={{ color: "var(--ink-secondary)" }}>Currently Free (TB)</span>
                      <Cell type="number" value={sc.currentlyFreeTb} onChange={(v) => setData((d) => ({ ...d, storageCapacities: updateById(d.storageCapacities, sc.id, { currentlyFreeTb: v === "" ? null : Number(v) }) }))} />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs" style={{ color: "var(--ink-secondary)" }}>Still in Use (TB)</span>
                      <Cell type="number" value={sc.stillInUseTb} onChange={(v) => setData((d) => ({ ...d, storageCapacities: updateById(d.storageCapacities, sc.id, { stillInUseTb: v === "" ? null : Number(v) }) }))} />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs" style={{ color: "var(--ink-secondary)" }}>Freed by Archiving (TB)</span>
                      <Cell type="number" value={sc.freedByArchivingTb} onChange={(v) => setData((d) => ({ ...d, storageCapacities: updateById(d.storageCapacities, sc.id, { freedByArchivingTb: v === "" ? null : Number(v) }) }))} />
                    </label>
                  </div>
                  <div className="mt-2 text-right">
                    <RemoveButton onClick={() => setData((d) => ({ ...d, storageCapacities: removeById(d.storageCapacities, sc.id) }))} />
                  </div>
                </div>
              ))}
            </div>
            <AddButton
              label="Add storage system"
              onClick={() =>
                setData((d) => ({
                  ...d,
                  storageCapacities: [
                    ...d.storageCapacities,
                    { id: newId("sc"), name: "", subtitle: "", totalCapacityTb: null, currentlyFreeTb: null, stillInUseTb: null, freedByArchivingTb: null },
                  ],
                }))
              }
            />
          </SectionCard>

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
