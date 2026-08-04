// Data model for the monthly Digital Archiving report — mirrors the structure
// of the reference report (numbered sections with tables, plus a sidebar of
// storage-capacity breakdowns), not a fixed set of numeric fields per team.

export type ArchivingProgressRow = {
  id: string;
  programShow: string;
  readyToArchiveTb: number | null;
  inProgressTb: number | null;
  archivedTb: number | null;
  episodesProjects: string;
  status: string;
};

export type ServerStorageRow = {
  id: string;
  server: string;
  fullCapacityTb: number | null;
  spaceReleasedTb: number | null;
  totalFreeNowTb: number | null;
  notes: string;
};

export type Priority = "Low" | "Medium" | "High";

export type IssueRow = {
  id: string;
  issue: string;
  priority: Priority;
  actionOwner: string;
  etaStatus: string;
};

export type StorageCapacity = {
  id: string;
  name: string;
  subtitle: string;
  totalCapacityTb: number | null;
  currentlyFreeTb: number | null;
  stillInUseTb: number | null;
  freedByArchivingTb: number | null;
};

export type Milestones = {
  currentArchiveCapacity: string;
  newCapacityExpected: string;
  nextMigrationPhase: string;
};

export type MonthlyReport = {
  archivingProgress: ArchivingProgressRow[];
  serverStorage: ServerStorageRow[];
  milestones: Milestones;
  issues: IssueRow[];
  storageCapacities: StorageCapacity[];
};

export function emptyReport(): MonthlyReport {
  return {
    archivingProgress: [],
    serverStorage: [],
    milestones: { currentArchiveCapacity: "", newCapacityExpected: "", nextMigrationPhase: "" },
    issues: [],
    storageCapacities: [],
  };
}

/** Coerce arbitrary JSON into a well-formed MonthlyReport, dropping anything malformed. */
export function normalizeReport(raw: unknown): MonthlyReport {
  const r = (raw ?? {}) as Partial<MonthlyReport>;
  const num = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const str = (v: unknown): string => (typeof v === "string" ? v : "");

  return {
    archivingProgress: Array.isArray(r.archivingProgress)
      ? r.archivingProgress.map((row, i) => ({
          id: str(row?.id) || `ap-${i}`,
          programShow: str(row?.programShow),
          readyToArchiveTb: num(row?.readyToArchiveTb),
          inProgressTb: num(row?.inProgressTb),
          archivedTb: num(row?.archivedTb),
          episodesProjects: str(row?.episodesProjects),
          status: str(row?.status),
        }))
      : [],
    serverStorage: Array.isArray(r.serverStorage)
      ? r.serverStorage.map((row, i) => ({
          id: str(row?.id) || `ss-${i}`,
          server: str(row?.server),
          fullCapacityTb: num(row?.fullCapacityTb),
          spaceReleasedTb: num(row?.spaceReleasedTb),
          totalFreeNowTb: num(row?.totalFreeNowTb),
          notes: str(row?.notes),
        }))
      : [],
    milestones: {
      currentArchiveCapacity: str(r.milestones?.currentArchiveCapacity),
      newCapacityExpected: str(r.milestones?.newCapacityExpected),
      nextMigrationPhase: str(r.milestones?.nextMigrationPhase),
    },
    issues: Array.isArray(r.issues)
      ? r.issues.map((row, i) => ({
          id: str(row?.id) || `is-${i}`,
          issue: str(row?.issue),
          priority: (["Low", "Medium", "High"] as const).includes(row?.priority as Priority)
            ? (row!.priority as Priority)
            : "Medium",
          actionOwner: str(row?.actionOwner),
          etaStatus: str(row?.etaStatus),
        }))
      : [],
    storageCapacities: Array.isArray(r.storageCapacities)
      ? r.storageCapacities.map((row, i) => ({
          id: str(row?.id) || `sc-${i}`,
          name: str(row?.name),
          subtitle: str(row?.subtitle),
          totalCapacityTb: num(row?.totalCapacityTb),
          currentlyFreeTb: num(row?.currentlyFreeTb),
          stillInUseTb: num(row?.stillInUseTb),
          freedByArchivingTb: num(row?.freedByArchivingTb),
        }))
      : [],
  };
}
