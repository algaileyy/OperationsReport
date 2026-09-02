// Team + field config — the single source of truth for what each team
// reports. Both the input form and the report render from this list.

export type FieldConfig = {
  key: string;
  label: string;
  /** e.g. "TB" — appended to the formatted value (e.g. "105TB"). Fields with
   * a unit are shown as standalone callouts rather than pie-chart slices,
   * since a unit means they aren't a comparable count with the rest. */
  unit?: string;
  /** For fields that don't apply every month (e.g. Re-versioning): drop the
   * row from the report entirely when its value is 0, instead of showing a
   * zero. Always still editable on /input, so entering a value for a month
   * it does apply brings it right back. */
  hideWhenZero?: boolean;
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
      { key: "catchUpContentReceived", label: "Catch-up Content Received" },
      { key: "archiveContentReceived", label: "Archive Content Received" },
      { key: "catchUpContentFailed", label: "Catch-up Content Failed" },
      { key: "archiveContentFailed", label: "Archive Content Failed" },
      { key: "catchUpContentPassed", label: "Catch-up Content Passed" },
      { key: "archiveContentPassed", label: "Archive Content Passed" },
      { key: "ingestedCatchUpContent", label: "Catch-up Content Ingested" },
      { key: "ingestedArchiveContent", label: "Archive Content Ingested" },
      { key: "catchUpContentSize", label: "Catch-up Content Size", unit: "TB" },
      { key: "archiveContentSize", label: "Archive Content Size", unit: "TB" },
      { key: "artworkIngested", label: "Artwork Ingested" },
      { key: "badgesIngested", label: "Badges Ingested" },
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
    fields: [
      { key: "projectFilesChecked", label: "Project files checked" },
      { key: "textlessCleansCompleted", label: "Textless/cleans completed" },
      { key: "revisioning", label: "Re-versioning", hideWhenZero: true },
    ],
    groups: [
      {
        key: "totalQcCompleted",
        label: "Quality Control Completed",
        sumKeys: ["projectFilesChecked", "textlessCleansCompleted"],
        detailFieldKeys: ["projectFilesChecked", "textlessCleansCompleted"],
      },
    ],
    sourceBreakdowns: [
      { key: "archived", label: "Archived", unit: "TB" },
      { key: "storageFreed", label: "Storage Freed", unit: "TB" },
    ],
  },
];

export function getTeam(key: string): TeamConfig | undefined {
  return TEAMS.find((t) => t.key === key);
}

export type TeamData = Record<string, number>;
