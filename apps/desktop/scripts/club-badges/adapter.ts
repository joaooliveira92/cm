/**
 * The seam between a logo dump's layout and everything the import does after reading it.
 *
 * Each source layout gets one adapter, and an adapter's only job is to reduce its dump to rows of
 * `(nation, club name, file)` in precedence order, newest first. Slugging, collision checks, hashing,
 * the manifest and the pack guard are shared, so a new dump (the Brazilian logos) is a new adapter
 * and nothing else.
 */
export interface SourceRow {
  /** Lowercase three-letter nation code, the first half of the badge key. */
  readonly nation: string;
  /** The club's display name as the source spells it. The adapter's override table is keyed by it. */
  readonly clubName: string;
  /** POSIX path relative to the dump root, recorded in the manifest. */
  readonly source: string;
  /** Where to read the bytes from. */
  readonly absolutePath: string;
}

export type AdapterFailure =
  | { readonly _tag: "SourceLayoutMismatch"; readonly adapter: string; readonly detail: string }
  | { readonly _tag: "UnknownLeaguePrefix"; readonly folder: string; readonly source: string };

export type AdapterRead =
  | { readonly _tag: "Rows"; readonly rows: ReadonlyArray<SourceRow> }
  | { readonly _tag: "Failed"; readonly failure: AdapterFailure };

export interface BadgeAdapter {
  readonly name: string;
  /**
   * `<nation>/<Club Name as the source spells it>` -> slug. It records every decision the slug rule
   * can't make: two clubs that slug the same get separate slugs, and two spellings of one club get
   * the same slug.
   */
  readonly overrides: Readonly<Record<string, string>>;
  /** Rows newest first. The import keeps the first row per key. */
  readonly read: (sourceDir: string) => AdapterRead;
}
