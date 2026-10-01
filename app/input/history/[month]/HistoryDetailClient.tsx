"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Entry = { id: number; savedBy: string; savedAt: string };

export default function HistoryDetailClient({ month, entries }: { month: string; entries: Entry[] }) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedData, setExpandedData] = useState<unknown>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onView(id: number) {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedData(null);
      return;
    }
    setLoadingId(id);
    const res = await fetch(`/api/report-history?id=${id}`);
    const body = await res.json();
    setLoadingId(null);
    if (res.ok) {
      setExpandedId(id);
      setExpandedData(body.data);
    }
  }

  async function onRestore(id: number) {
    setRestoringId(id);
    setMessage(null);
    try {
      const fetchRes = await fetch(`/api/report-history?id=${id}`);
      const fetchBody = await fetchRes.json();
      if (!fetchRes.ok) throw new Error(fetchBody.error || "Could not load that version.");

      const saveRes = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, data: fetchBody.data }),
      });
      if (!saveRes.ok) {
        const saveBody = await saveRes.json().catch(() => ({}));
        throw new Error(saveBody.error || "Restore failed.");
      }
      setMessage("Restored — this version is now the current state for this month.");
      setConfirmingId(null);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setRestoringId(null);
    }
  }

  if (entries.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
        No saves recorded for this month yet — history only started being kept from the point this
        feature was added, so earlier saves to this month (if any) won&apos;t show up here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {message && (
        <p className="mb-2 text-sm" style={{ color: "var(--ink-secondary)" }}>
          {message}
        </p>
      )}
      {entries.map((entry, i) => {
        const date = new Date(entry.savedAt);
        return (
          <div key={entry.id} className="rounded-lg border p-3" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm">
                <span style={{ color: "var(--ink-primary)" }}>
                  {date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-semibold"
                  style={{
                    background: entry.savedBy === "admin" ? "rgba(42,120,214,0.12)" : "rgba(0,0,0,0.06)",
                    color: entry.savedBy === "admin" ? "#2a78d6" : "var(--ink-secondary)",
                  }}
                >
                  {entry.savedBy}
                </span>
                {i === 0 && (
                  <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
                    (current)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onView(entry.id)}
                  disabled={loadingId === entry.id}
                  className="text-sm underline disabled:opacity-50"
                  style={{ color: "#2a78d6" }}
                >
                  {loadingId === entry.id ? "Loading…" : expandedId === entry.id ? "Hide" : "View"}
                </button>
                {i !== 0 &&
                  (confirmingId === entry.id ? (
                    <>
                      <span className="text-sm" style={{ color: "var(--ink-secondary)" }}>
                        Restore this version?
                      </span>
                      <button
                        type="button"
                        onClick={() => onRestore(entry.id)}
                        disabled={restoringId === entry.id}
                        className="rounded-md px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
                        style={{ background: "#0ca30c" }}
                      >
                        {restoringId === entry.id ? "Restoring…" : "Yes, restore"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingId(null)}
                        className="text-xs underline"
                        style={{ color: "var(--ink-muted)" }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingId(entry.id)}
                      className="text-sm underline"
                      style={{ color: "#d03b3b" }}
                    >
                      Restore
                    </button>
                  ))}
              </div>
            </div>
            {expandedId === entry.id && (
              <pre
                className="mt-3 max-h-96 overflow-auto rounded-md border p-3 text-xs"
                style={{ borderColor: "var(--border)", background: "var(--surface-page)", color: "var(--ink-secondary)" }}
              >
                {JSON.stringify(expandedData, null, 2)}
              </pre>
            )}
          </div>
        );
      })}
    </div>
  );
}
