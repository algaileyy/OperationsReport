// Team + field config — the single source of truth for what each team
// reports. Both the input form and the report render from this list.

export type FieldConfig = {
  key: string;
  label: string;
  /** e.g. "TB" — appended to the formatted value (e.g. "105TB"). Fields with
   * a unit are shown as standalone callouts rather than pie-chart slices,
   * since a unit means they aren't a comparable count with the rest. */
  unit?: string;
};

/**
 * A collapsible report row: a highlighted total (sum of sumKeys) that
 * expands to show the individual fields in detailFieldKeys. detailFieldKeys
 * may be a superset of sumKeys (e.g. Publishing shows Shows in CMS in the
 * breakdown even though it isn't part of the Total Assets in CMS sum).
 */
export type FieldGroup = {
  key: string;
  label: string;
  sumKeys: string[];
  detailFieldKeys: string[];
  /** e.g. "TB" — when set, the total and its detail rows are formatted with this unit. */
  unit?: string;
};

/**
 * A metric tracked per-source instead of as one flat number (e.g. Archived
 * Projects: Atheer 7, AJ360 25). Sources are entered freely on /input, not
 * a fixed list, so a team can track whichever projects are active that
 * month. Rendered as a collapsible total row (same as FieldGroup) and as
 * one more pie slice.
 */
export type SourceBreakdownConfig = {
  key: string;
  label: string;
};

export type TeamConfig = {
  key: string;
  name: string;
  accent: "blue" | "orange" | "aqua" | "violet";
  fields: FieldConfig[];
  groups?: FieldGroup[];
  sourceBreakdowns?: SourceBreakdownConfig[];
};

export const TEAMS: TeamConfig[] = [
  {
    key: "publishing",
    name: "Publishing Team",
    accent: "blue",
    fields: [
      { key: "showsInCms", label: "Shows in CMS" },
      { key: "episodesInCms", label: "Episodes in CMS" },
      { key: "moviesInCms", label: "Movies in CMS" },
      // "Total Assets in CMS" is derived (episodes + movies), not entered.
    ],
    groups: [
      {
        key: "totalAssetsInCms",
        label: "Total Assets in CMS (movies and episodes)",
        sumKeys: ["episodesInCms", "moviesInCms"],
        detailFieldKeys: ["episodesInCms", "moviesInCms", "showsInCms"],
      },
    ],
  },
  {
    key: "mediaManagement",
    name: "Media Management",
    accent: "orange",
    fields: [
      { key: "assetsReceived", label: "Assets Received" },
      { key: "projectReceived", label: "Project Received" },
      { key: "movedToArchive", label: "Moved to Archive" },
      { key: "assetsRequestedCirculation", label: "Assets Requested (Circulation)" },
      { key: "archiveMediaDeskDeliveries", label: "Archive Media Desk Deliveries" },
      { key: "totalArchiveAssetsCleanUp", label: "Total Archive Assets in Clean-Up" },
      { key: "totalArchiveAssetsTechnicalReview", label: "Total Archive Assets in Technical Review" },
    ],
    groups: [
      {
        key: "totalReceivedAssetsProjects",
        label: "Total Received Assets and Projects",
        sumKeys: ["assetsReceived", "projectReceived"],
        detailFieldKeys: ["assetsReceived", "projectReceived"],
      },
    ],
  },
  {
    key: "archivingSupport",
    name: "Archiving & Production Support Team",
    accent: "aqua",
    fields: [
      { key: "projectFilesChecked", label: "Project files checked" },
      { key: "textlessCleansCompleted", label: "Textless/cleans completed" },
      { key: "archivedAtheer", label: "Atheer", unit: "TB" },
      { key: "archivedDohaDebates", label: "Doha Debates", unit: "TB" },
      { key: "archivedSadeem", label: "Sadeem", unit: "TB" },
      { key: "revisioning", label: "Re-versioning" },
    ],
    groups: [
      {
        key: "totalQcCompleted",
        label: "Total Quality Control Completed",
        sumKeys: ["projectFilesChecked", "textlessCleansCompleted"],
        detailFieldKeys: ["projectFilesChecked", "textlessCleansCompleted"],
      },
      {
        key: "archived",
        label: "Archived",
        sumKeys: ["archivedAtheer", "archivedDohaDebates", "archivedSadeem"],
        detailFieldKeys: ["archivedAtheer", "archivedDohaDebates", "archivedSadeem"],
        unit: "TB",
      },
    ],
  },
  {
    key: "mediaIngest",
    name: "Media Ingest Team",
    accent: "violet",
    fields: [
      { key: "archivedMovies", label: "Archived Movies" },
      { key: "archivedEpisodes", label: "Archived Episodes" },
      { key: "catchUpMovies", label: "Catch up Movies" },
      { key: "catchUpEpisodes", label: "Catch up Episodes" },
      { key: "qualityControlCompleted", label: "Quality Control Completed" },
      { key: "totalAssetsCurrentlyProcessing", label: "Total Assets Currently Processing" },
      { key: "totalAssetsProcessed", label: "Total Assets Processed (In GCP)" },
    ],
    groups: [
      {
        key: "totalMoviesEpisodesArchived",
        label: "Total Movies and Episodes Archived",
        sumKeys: ["archivedMovies", "archivedEpisodes"],
        detailFieldKeys: ["archivedMovies", "archivedEpisodes"],
      },
      {
        key: "totalCatchUpMoviesEpisodes",
        label: "Total Catch up Movies and Episodes",
        sumKeys: ["catchUpMovies", "catchUpEpisodes"],
        detailFieldKeys: ["catchUpMovies", "catchUpEpisodes"],
      },
    ],
  },
];

export function getTeam(key: string): TeamConfig | undefined {
  return TEAMS.find((t) => t.key === key);
}

export type TeamData = Record<string, number>;

/** Publishing's CMS total is always derived, never typed in. */
export function publishingTotal(data: TeamData): number {
  return (data.episodesInCms ?? 0) + (data.moviesInCms ?? 0);
}
