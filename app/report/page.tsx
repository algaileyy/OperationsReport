import { getMonthlyReport, getPublishedMonth, getReportUpdatedAt } from "@/lib/db";
import { monthLabel } from "@/lib/months";
import { formatNumber } from "@/lib/format";
import type { StorageCapacity } from "@/lib/report";

export const dynamic = "force-dynamic";

const GRADIENT =
  "linear-gradient(135deg, #12283d 0%, #164a5c 30%, #1c7a86 65%, #2fc2c9 100%)";
const PANEL = "rgba(255,255,255,0.07)";
const PANEL_BORDER = "rgba(255,255,255,0.14)";
const HEADER_ROW = "rgba(6,32,40,0.55)";
const ROW_ALT = "rgba(255,255,255,0.04)";
const TEXT_BRIGHT = "#ffffff";
const TEXT_DIM = "#bfe4ea";
const ACCENT_CYAN = "#5fd4f4";

const FREED_COLOR = "#0d366b";
const FREE_REST_COLOR = "#2a78d6";
const STILL_IN_USE_COLOR = "#5fd4f4";

const PRIORITY_COLOR: Record<string, string> = {
  Low: "#0ca30c",
  Medium: "#fab219",
  High: "#d03b3b",
};

function SectionHeading({ n, title }: { n: number; title: string }) {
  return (
    <h2 className="mb-3 flex items-baseline gap-2 text-lg font-bold" style={{ color: TEXT_BRIGHT }}>
      <span style={{ color: ACCENT_CYAN }}>{n}.</span>
      {title}
    </h2>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: TEXT_BRIGHT }}>
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-3 py-2 text-sm" style={{ color: "#e7f6f8" }}>
      {children}
    </td>
  );
}

function CapacityPie({ sc }: { sc: StorageCapacity }) {
  const free = sc.currentlyFreeTb ?? 0;
  const freed = Math.min(sc.freedByArchivingTb ?? 0, free);
  const freeRest = free - freed;
  const stillInUse = sc.stillInUseTb ?? 0;
  const total = freed + freeRest + stillInUse || 1;

  const freedDeg = (freed / total) * 360;
  const freeRestDeg = (freeRest / total) * 360;

  return (
    <div className="mb-6 last:mb-0">
      <div className="mb-2 flex items-baseline justify-between">
        <div>
          <p className="text-sm font-bold" style={{ color: FREE_REST_COLOR }}>
            {sc.name || "Untitled storage"}
          </p>
          <p className="text-xs" style={{ color: "#5b6b76" }}>
            {sc.subtitle}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold" style={{ color: "#0b1d27" }}>
            {formatNumber(sc.totalCapacityTb ?? undefined)}
          </p>
          <p className="text-xs" style={{ color: "#5b6b76" }}>
            TB Total Capacity
          </p>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <div
          className="h-32 w-32 shrink-0 rounded-full"
          style={{
            background: `conic-gradient(${FREED_COLOR} 0deg ${freedDeg}deg, ${FREE_REST_COLOR} ${freedDeg}deg ${freedDeg + freeRestDeg}deg, ${STILL_IN_USE_COLOR} ${freedDeg + freeRestDeg}deg 360deg)`,
          }}
        />
        <div className="flex flex-col gap-2 text-xs" style={{ color: "#33454f" }}>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: FREE_REST_COLOR }} />
            Currently Free: <strong>{formatNumber(free)}TB</strong>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: STILL_IN_USE_COLOR }} />
            Still in use: <strong>{formatNumber(stillInUse)}TB</strong>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: FREED_COLOR }} />
            Freed by Archiving: <strong>{formatNumber(freed)}TB</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function ReportPage() {
  const publishedMonth = await getPublishedMonth();

  if (!publishedMonth) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center text-white" style={{ background: GRADIENT }}>
        <p>No report has been published yet. Check back soon.</p>
      </main>
    );
  }

  const [data, updatedAt] = await Promise.all([
    getMonthlyReport(publishedMonth),
    getReportUpdatedAt(publishedMonth),
  ]);

  const report =
    data ?? {
      archivingProgress: [],
      serverStorage: [],
      milestones: { currentArchiveCapacity: "", newCapacityExpected: "", nextMigrationPhase: "" },
      issues: [],
      storageCapacities: [],
    };

  return (
    <main className="min-h-screen" style={{ background: GRADIENT }}>
      <div className="px-6 pb-4 pt-10 sm:px-10">
        <h1 className="text-2xl font-extrabold sm:text-3xl" style={{ color: TEXT_BRIGHT }}>
          Al Jazeera Digital Archiving — Monthly Report
        </h1>
        <p className="mt-1 text-sm" style={{ color: TEXT_DIM }}>
          {monthLabel(publishedMonth)}
          {updatedAt &&
            ` · Last updated ${new Date(updatedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              timeZone: "UTC",
            })}`}
        </p>
      </div>

      <div className="flex flex-col gap-6 px-4 pb-12 sm:px-6 lg:flex-row lg:items-start lg:px-10">
        {/* Sidebar: storage capacity pie charts */}
        {report.storageCapacities.length > 0 && (
          <aside className="rounded-2xl bg-white p-6 shadow-xl lg:w-[340px] lg:shrink-0">
            {report.storageCapacities.map((sc) => (
              <CapacityPie key={sc.id} sc={sc} />
            ))}
          </aside>
        )}

        {/* Main content */}
        <div className="flex-1 flex-col gap-6 flex">
          {/* 1. Archiving Progress */}
          <section className="rounded-2xl p-5" style={{ background: PANEL, border: `1px solid ${PANEL_BORDER}` }}>
            <SectionHeading n={1} title="Archiving Progress" />
            {report.archivingProgress.length === 0 ? (
              <p className="text-sm" style={{ color: TEXT_DIM }}>No programs added yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg" style={{ border: `1px solid ${PANEL_BORDER}` }}>
                <table className="w-full min-w-[640px] border-collapse">
                  <thead>
                    <tr style={{ background: HEADER_ROW }}>
                      <Th>Program/Show</Th>
                      <Th>Ready to Archive (TB)</Th>
                      <Th>In Progress (TB)</Th>
                      <Th>Archived (TB)</Th>
                      <Th>Episodes/Projects</Th>
                      <Th>Status</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.archivingProgress.map((row, i) => (
                      <tr key={row.id} style={{ background: i % 2 ? ROW_ALT : "transparent" }}>
                        <Td>
                          <strong style={{ color: TEXT_BRIGHT }}>{row.programShow || "—"}</strong>
                        </Td>
                        <Td>{row.readyToArchiveTb != null ? formatNumber(row.readyToArchiveTb) : "—"}</Td>
                        <Td>{row.inProgressTb != null ? formatNumber(row.inProgressTb) : "—"}</Td>
                        <Td>{row.archivedTb != null ? formatNumber(row.archivedTb) : "—"}</Td>
                        <Td>{row.episodesProjects || "—"}</Td>
                        <Td>{row.status || "—"}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4 flex flex-col gap-1 text-sm" style={{ color: TEXT_DIM }}>
              <p>
                <strong style={{ color: TEXT_BRIGHT }}>Ready To Archive:</strong> Published and sent to the archiving team in the designated folder path.
              </p>
              <p>
                <strong style={{ color: TEXT_BRIGHT }}>In Progress:</strong> Archiving team progress from QC &amp; checking the packages till moving them to Tapes.
              </p>
              <p>
                <strong style={{ color: TEXT_BRIGHT }}>Archived:</strong> The archiving process is totally done and stored on DIVA tapes.
              </p>
            </div>
          </section>

          {/* 2. Server Storage Overview */}
          <section className="rounded-2xl p-5" style={{ background: PANEL, border: `1px solid ${PANEL_BORDER}` }}>
            <SectionHeading n={2} title="Server Storage Overview" />
            {report.serverStorage.length === 0 ? (
              <p className="text-sm" style={{ color: TEXT_DIM }}>No servers added yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg" style={{ border: `1px solid ${PANEL_BORDER}` }}>
                <table className="w-full min-w-[560px] border-collapse">
                  <thead>
                    <tr style={{ background: HEADER_ROW }}>
                      <Th>Server</Th>
                      <Th>Full Capacity (TB)</Th>
                      <Th>Space Released (TB)</Th>
                      <Th>Total Free Now (TB)</Th>
                      <Th>Notes</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.serverStorage.map((row, i) => (
                      <tr key={row.id} style={{ background: i % 2 ? ROW_ALT : "transparent" }}>
                        <Td>
                          <strong style={{ color: TEXT_BRIGHT }}>{row.server || "—"}</strong>
                        </Td>
                        <Td>{row.fullCapacityTb != null ? formatNumber(row.fullCapacityTb) : "—"}</Td>
                        <Td>{row.spaceReleasedTb != null ? formatNumber(row.spaceReleasedTb) : "—"}</Td>
                        <Td>{row.totalFreeNowTb != null ? formatNumber(row.totalFreeNowTb) : "—"}</Td>
                        <Td>{row.notes || "—"}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* 3. Tapes, Capacity, and Upcoming Milestones */}
          <section className="rounded-2xl p-5" style={{ background: PANEL, border: `1px solid ${PANEL_BORDER}` }}>
            <SectionHeading n={3} title="Tapes, Capacity, and Upcoming Milestones" />
            <div className="flex flex-col gap-2 text-sm" style={{ color: TEXT_DIM }}>
              <p>
                <strong style={{ color: TEXT_BRIGHT }}>Current Archive Capacity:</strong>{" "}
                {report.milestones.currentArchiveCapacity || "—"}
              </p>
              <p>
                <strong style={{ color: TEXT_BRIGHT }}>New Capacity Expected:</strong>{" "}
                {report.milestones.newCapacityExpected || "—"}
              </p>
              <p>
                <strong style={{ color: TEXT_BRIGHT }}>Next Migration Phase:</strong>{" "}
                {report.milestones.nextMigrationPhase || "—"}
              </p>
            </div>
          </section>

          {/* 4. Active Issues & Actions */}
          <section className="rounded-2xl p-5" style={{ background: PANEL, border: `1px solid ${PANEL_BORDER}` }}>
            <SectionHeading n={4} title="Active Issues & Actions" />
            {report.issues.length === 0 ? (
              <p className="text-sm" style={{ color: TEXT_DIM }}>No open issues.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg" style={{ border: `1px solid ${PANEL_BORDER}` }}>
                <table className="w-full min-w-[600px] border-collapse">
                  <thead>
                    <tr style={{ background: HEADER_ROW }}>
                      <Th>Issue</Th>
                      <Th>Priority</Th>
                      <Th>Action / Owner</Th>
                      <Th>ETA / Status</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.issues.map((row, i) => (
                      <tr key={row.id} style={{ background: i % 2 ? ROW_ALT : "transparent" }}>
                        <Td>
                          <strong style={{ color: TEXT_BRIGHT }}>{row.issue || "—"}</strong>
                        </Td>
                        <Td>
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold"
                            style={{ background: "rgba(255,255,255,0.1)", color: TEXT_BRIGHT }}
                          >
                            <span className="h-2 w-2 rounded-full" style={{ background: PRIORITY_COLOR[row.priority] }} />
                            {row.priority}
                          </span>
                        </Td>
                        <Td>{row.actionOwner || "—"}</Td>
                        <Td>{row.etaStatus || "—"}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
