// Single source of truth for team sections and their metric fields.
// Both the input form and the public report render from this list, so
// the two can never drift out of sync with each other.

export type FieldConfig = {
  key: string;
  label: string;
};

export type TeamConfig = {
  key: string;
  name: string;
  /** Sub-heading shown above the fields on the input form. */
  heading?: string;
  /** Accent color slot from the dataviz palette (Tailwind class suffix). */
  accent: "blue" | "orange" | "aqua" | "violet";
  fields: FieldConfig[];
};

export const TEAMS: TeamConfig[] = [
  {
    key: "publishing",
    name: "Publishing Team",
    heading: "Assets in Platform",
    accent: "blue",
    fields: [
      { key: "showsInCms", label: "Shows in CMS" },
      { key: "episodesInCms", label: "Episodes in CMS" },
      { key: "moviesInCms", label: "Movies in CMS" },
      // "Total Assets in CMS" is derived (episodes + movies), not entered.
    ],
  },
  {
    key: "mediaManagement",
    name: "Media Management",
    heading: "Assets Processing and in GCP",
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
  },
];

// Order the public report renders sections in (per the final spec: Media
// Management, Archiving & Production Support, Media Ingest, Publishing).
export const REPORT_ORDER = [
  "mediaManagement",
  "archivingSupport",
  "mediaIngest",
  "publishing",
] as const;

export function getTeam(key: string): TeamConfig | undefined {
  return TEAMS.find((t) => t.key === key);
}

export type TeamData = Record<string, number>;

/** Publishing's CMS total is always derived, never typed in. */
export function publishingTotal(data: TeamData): number {
  return (data.episodesInCms ?? 0) + (data.moviesInCms ?? 0);
}
