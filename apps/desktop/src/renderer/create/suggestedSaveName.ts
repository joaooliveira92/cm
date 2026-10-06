/** What the generated save name is built from. The manager's names and favorite club come from the
 *  personal-details panel, the chosen club from the club step, and the timestamp from the moment of
 *  the commit — the chosen club is not known until then, so that is when the name is composed. */
export interface SaveNameParts {
  readonly firstName: string;
  readonly lastName: string;
  /** `null` when the manager supports no club; the segment is then left out. */
  readonly favoriteClub: string | null;
  readonly teamChosen: string;
  readonly timestamp: Date;
}

const pad = (value: number): string => String(value).padStart(2, "0");

/** Local time as `YYYYMMDD-HHmm`: sortable, and free of the `_` that separates segments. */
const formatTimestamp = (date: Date): string =>
  `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;

/** One segment: surrounding space dropped, inner runs of space and `_` turned into `-` so a
 *  two-word club cannot read as two segments, and characters no file system accepts removed. */
const segment = (value: string): string =>
  value
    .trim()
    .replaceAll(/[<>:"/\\|?*]/g, "")
    .replaceAll(/[\s_]+/g, "-");

/**
 * The save name the player never types: `First_Last_FavoriteClub_ChosenClub_YYYYMMDD-HHmm`. It is
 * never shown during creation; the Save dialog pre-fills it, and the player may replace it there.
 */
export const suggestedSaveName = (parts: SaveNameParts): string =>
  [
    parts.firstName,
    parts.lastName,
    parts.favoriteClub ?? "",
    parts.teamChosen,
  ]
    .map(segment)
    .filter((part) => part.length > 0)
    .concat(formatTimestamp(parts.timestamp))
    .join("_");
