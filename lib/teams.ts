// Team + field config — the single source of truth for what each team
// reports. Both the input form and the report render from this list.

export type FieldConfig = {
  key: string;
  label: string;
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
};

export type TeamConfig = {
  key: string;
  name: string;
  accent: "blue" | "orange" | "aqua" | "violet";
  fields: FieldConfig[];
  groups?: FieldGroup[];
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
      { key: "revisioning", label: "Revisioning" },
      { key: "textlessCleanQcCompleted", label: "Textless/Clean QC Completed" },
      { key: "archived", label: "Archived" },
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
