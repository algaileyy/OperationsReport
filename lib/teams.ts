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
 * may be a superset of sumKeys when a total should expand to show a field
 * that isn't part of the sum itself.
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
 * A metric tracked per-source instead of as one flat number (e.g. Archived:
 * Atheer 7TB, Doha Debates 3TB). Sources are entered freely on /input, not
 * a fixed list, so a team can add or remove clients/channels as its roster
 * changes. Rendered as a collapsible total row (same as FieldGroup); folded
 * into the pie as one more slice when unitless, or shown as a callout
 * alongside the other unit-bearing fields when it has a unit.
 */
export type SourceBreakdownConfig = {
  key: string;
  label: string;
  /** e.g. "TB" — when set, the total and its entries are formatted with this unit. */
  unit?: string;
  /** Groups consecutive breakdowns under a shared heading on /input — several segments
   * reuse labels like "Passed QC" or "Received", so this makes clear which segment a
   * given source belongs to before its numbers are entered. Mirrors the grouping already
   * shown on /report (see ReportView's archivingSupport tree). */
  segment?: string;
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
    key: "mediaIngest",
    name: "Media Ingest",
    accent: "violet",
    fields: [{ key: "qualityControlCompleted", label: "Quality Control Completed in Hours" }],
    sourceBreakdowns: [
      { key: "catchUpContentReceived", label: "Catch-up Content Received", segment: "Catch-up Content" },
      { key: "catchUpContentFailed", label: "Catch-up Content Failed", segment: "Catch-up Content" },
      { key: "catchUpContentPassed", label: "Catch-up Content Passed", segment: "Catch-up Content" },
      { key: "ingestedCatchUpContent", label: "Catch-up Content Ingested", segment: "Catch-up Content" },
      { key: "catchUpContentSize", label: "Catch-up Content Size", unit: "TB", segment: "Catch-up Content" },
      { key: "archiveContentReceived", label: "Archive Content Received", segment: "Archive Content" },
      { key: "archiveContentFailed", label: "Archive Content Failed", segment: "Archive Content" },
      { key: "archiveContentPassed", label: "Archive Content Passed", segment: "Archive Content" },
      { key: "ingestedArchiveContent", label: "Archive Content Ingested", segment: "Archive Content" },
      { key: "archiveContentSize", label: "Archive Content Size", unit: "TB", segment: "Archive Content" },
      { key: "artworkAndBadgesIngested", label: "Artwork and Badges Ingested", segment: "Artwork & Thumbnails" },
      { key: "episodicThumbnails", label: "Episodic Thumbnails", segment: "Artwork & Thumbnails" },
    ],
  },
  {
    key: "mediaManagement",
    name: "Media Desk",
    accent: "orange",
    fields: [
      { key: "originalAssetsUploadedFrameIo", label: "Original Assets uploaded to Frame.io" },
      { key: "catchUpOriginalsReceived", label: "Catch-up Originals received" },
      { key: "projectsArchived", label: "Projects Archived" },
      { key: "rushesProjectFilesReceived", label: "Rushes & Project Files received" },
      { key: "masterExports", label: "Master Exports" },
    ],
    groups: [
      {
        key: "totalMediaDeskActivity",
        label: "Total Media Desk Activity",
        sumKeys: [
          "originalAssetsUploadedFrameIo",
          "catchUpOriginalsReceived",
          "projectsArchived",
          "rushesProjectFilesReceived",
          "masterExports",
        ],
        detailFieldKeys: [
          "originalAssetsUploadedFrameIo",
          "catchUpOriginalsReceived",
          "projectsArchived",
          "rushesProjectFilesReceived",
          "masterExports",
        ],
      },
    ],
  },
  {
    key: "archivingSupport",
    name: "Digital Archive & Production Support",
    accent: "aqua",
    fields: [],
    sourceBreakdowns: [
      { key: "textlessCleansCompletedBySource", label: "Completed", segment: "Textless/Cleans QC" },
      { key: "textlessCleansPassedQC", label: "Passed QC", segment: "Textless/Cleans QC" },
      { key: "textlessCleansFailedQC", label: "Failed QC", segment: "Textless/Cleans QC" },
      { key: "rushesReceived", label: "Received", segment: "Rushes" },
      { key: "rushesPassedQC", label: "Passed QC", segment: "Rushes" },
      { key: "rushesFailedQC", label: "Failed QC", segment: "Rushes" },
      { key: "projectFilesPassed", label: "Passed", segment: "Project Files" },
      { key: "projectFilesReceived", label: "Received", segment: "Project Files" },
      { key: "revisioningBySource", label: "Re-versioning", segment: "Production Support Activities" },
      { key: "editingBySource", label: "Editing", segment: "Production Support Activities" },
      { key: "upscalingBySource", label: "Upscaling", segment: "Production Support Activities" },
      { key: "archived", label: "Archived", unit: "TB", segment: "Archive & Storage" },
      { key: "archiveInProgress", label: "Archive In Progress", unit: "TB", segment: "Archive & Storage" },
      { key: "storageFreed", label: "Storage Freed", unit: "TB", segment: "Archive & Storage" },
    ],
  },
];

export function getTeam(key: string): TeamConfig | undefined {
  return TEAMS.find((t) => t.key === key);
}

export type TeamData = Record<string, number>;
