import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, rmdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { AdapterFailure, BadgeAdapter, SourceRow } from "./adapter.js";
import {
  MANIFEST_FILE,
  compareKeys,
  isBadgeKey,
  readManifest,
  serializeManifest,
  sha256Of,
  type ManifestEntry,
} from "./manifest.js";
import { badgeSlug } from "./slug.js";

/**
 * The shared half of the badge import: everything after an adapter has read its dump.
 *
 * The import fails loudly rather than guessing. Every check runs before the first write, so a
 * stopped import leaves the library exactly as it was. It stops when two differently spelled clubs
 * in one country land on one key, when a key already belongs to another adapter, and when it would
 * remove a key a content pack maps a club to. A second run on the same dump writes nothing.
 */

export interface ImportReport {
  readonly added: ReadonlyArray<string>;
  /** Keys whose file hash changed. */
  readonly replaced: ReadonlyArray<string>;
  readonly removed: ReadonlyArray<string>;
}

export interface KeyCollision {
  readonly key: string;
  readonly names: ReadonlyArray<string>;
}

export type ImportFailure =
  | AdapterFailure
  | { readonly _tag: "InvalidKey"; readonly key: string; readonly clubName: string; readonly source: string }
  | { readonly _tag: "KeyCollision"; readonly collisions: ReadonlyArray<KeyCollision> }
  | { readonly _tag: "KeyOwnedByAnotherAdapter"; readonly key: string; readonly owner: string }
  | { readonly _tag: "RemovesReferencedKeys"; readonly keys: ReadonlyArray<string> };

export type ImportOutcome =
  | { readonly _tag: "Imported"; readonly report: ImportReport }
  | { readonly _tag: "Failed"; readonly failure: ImportFailure };

export interface ImportOptions {
  readonly sourceDir: string;
  readonly libraryDir: string;
  readonly adapter: BadgeAdapter;
  /** Every key any content pack maps a club to. The import never removes one. */
  readonly referencedKeys: ReadonlySet<string>;
}

interface ImportPlan {
  readonly report: ImportReport;
  readonly copies: ReadonlyArray<{ readonly from: string; readonly file: string }>;
  readonly deletions: ReadonlyArray<string>;
  readonly manifest: ReadonlyArray<ManifestEntry>;
}

type Planned = { readonly _tag: "Planned"; readonly plan: ImportPlan } | Extract<ImportOutcome, { _tag: "Failed" }>;

const failed = (failure: ImportFailure): Extract<ImportOutcome, { _tag: "Failed" }> => ({ _tag: "Failed", failure });

/** The first row per key in the adapter's newest-first order, or the failure that stops the import. */
const newestRowPerKey = (
  adapter: BadgeAdapter,
  rows: ReadonlyArray<SourceRow>,
): { readonly _tag: "Winners"; readonly winners: ReadonlyMap<string, SourceRow> } | Extract<ImportOutcome, { _tag: "Failed" }> => {
  const winners = new Map<string, SourceRow>();
  // Names that reached a key by the slug rule alone. Two of them on one key is two spellings the
  // rule cannot tell apart: different clubs, or one club renamed. Only the override table may say which.
  const derivedNames = new Map<string, Set<string>>();

  for (const row of rows) {
    const overrideKey = `${row.nation}/${row.clubName}`;
    const override = Object.hasOwn(adapter.overrides, overrideKey) ? adapter.overrides[overrideKey] : undefined;
    const key = `${row.nation}/${override ?? badgeSlug(row.clubName)}`;
    if (!isBadgeKey(key)) {
      return failed({ _tag: "InvalidKey", key, clubName: row.clubName, source: row.source });
    }
    if (override === undefined) {
      const names = derivedNames.get(key) ?? new Set<string>();
      names.add(row.clubName);
      derivedNames.set(key, names);
    }
    if (!winners.has(key)) winners.set(key, row);
  }

  const collisions = [...derivedNames]
    .filter(([, names]) => names.size > 1)
    .map(([key, names]) => ({ key, names: [...names].sort(compareKeys) }))
    .sort((a, b) => compareKeys(a.key, b.key));
  return collisions.length > 0 ? failed({ _tag: "KeyCollision", collisions }) : { _tag: "Winners", winners };
};

const planImport = ({ sourceDir, libraryDir, adapter, referencedKeys }: ImportOptions): Planned => {
  const read = adapter.read(sourceDir);
  if (read._tag === "Failed") return read;

  const resolved = newestRowPerKey(adapter, read.rows);
  if (resolved._tag === "Failed") return resolved;

  const existing = readManifest(libraryDir);
  const previousByKey = new Map(existing.map((entry) => [entry.key, entry]));
  const added: Array<string> = [];
  const replaced: Array<string> = [];
  const copies: Array<{ readonly from: string; readonly file: string }> = [];
  const imported: Array<ManifestEntry> = [];

  for (const [key, row] of [...resolved.winners].sort(([a], [b]) => compareKeys(a, b))) {
    const previous = previousByKey.get(key);
    if (previous !== undefined && previous.adapter !== adapter.name) {
      return failed({ _tag: "KeyOwnedByAnotherAdapter", key, owner: previous.adapter });
    }
    const file = `${key}.png`;
    const sha256 = sha256Of(readFileSync(row.absolutePath));
    if (previous === undefined) added.push(key);
    else if (previous.sha256 !== sha256) replaced.push(key);

    const target = path.join(libraryDir, file);
    if (!existsSync(target) || sha256Of(readFileSync(target)) !== sha256) copies.push({ from: row.absolutePath, file });
    imported.push({ key, file, sha256, source: row.source, adapter: adapter.name });
  }

  const dropped = existing.filter((entry) => entry.adapter === adapter.name && !resolved.winners.has(entry.key));
  const referenced = dropped.map((entry) => entry.key).filter((key) => referencedKeys.has(key));
  if (referenced.length > 0) return failed({ _tag: "RemovesReferencedKeys", keys: referenced });

  return {
    _tag: "Planned",
    plan: {
      report: { added, replaced, removed: dropped.map((entry) => entry.key) },
      copies,
      deletions: dropped.map((entry) => entry.file),
      manifest: [...existing.filter((entry) => entry.adapter !== adapter.name), ...imported],
    },
  };
};

const applyPlan = (libraryDir: string, plan: ImportPlan): void => {
  for (const { from, file } of plan.copies) {
    const target = path.join(libraryDir, file);
    mkdirSync(path.dirname(target), { recursive: true });
    copyFileSync(from, target);
  }
  for (const file of plan.deletions) {
    const target = path.join(libraryDir, file);
    rmSync(target, { force: true });
    const nationDir = path.dirname(target);
    if (existsSync(nationDir) && readdirSync(nationDir).length === 0) rmdirSync(nationDir);
  }
  const manifestPath = path.join(libraryDir, MANIFEST_FILE);
  const manifest = serializeManifest(plan.manifest);
  if (!existsSync(manifestPath) || readFileSync(manifestPath, "utf8") !== manifest) {
    mkdirSync(libraryDir, { recursive: true });
    writeFileSync(manifestPath, manifest);
  }
};

export const importClubBadges = (options: ImportOptions): ImportOutcome => {
  const planned = planImport(options);
  if (planned._tag === "Failed") return planned;
  applyPlan(options.libraryDir, planned.plan);
  return { _tag: "Imported", report: planned.plan.report };
};

export const describeFailure = (failure: ImportFailure): string => {
  switch (failure._tag) {
    case "SourceLayoutMismatch":
      return `the source is not in the ${failure.adapter} layout: ${failure.detail}`;
    case "UnknownLeaguePrefix":
      return `no nation for league folder "${failure.folder}" (${failure.source}). Add its country prefix to the adapter's nation table.`;
    case "InvalidKey":
      return `"${failure.clubName}" (${failure.source}) resolves to "${failure.key}", which is not a <nation>/<club-slug> key. Fix its override.`;
    case "KeyCollision":
      return [
        "differently spelled clubs share a key. Give each club its own slug, or map every spelling of one club to the same slug, in the adapter's override table:",
        ...failure.collisions.map(({ key, names }) => `  ${key} <- ${names.map((name) => `"${name}"`).join(", ")}`),
      ].join("\n");
    case "KeyOwnedByAnotherAdapter":
      return `${failure.key} belongs to the "${failure.owner}" adapter. Give this club a different slug in the override table, or remove the key through its own adapter first.`;
    case "RemovesReferencedKeys":
      return `the import would remove keys a content pack maps a club to: ${failure.keys.join(", ")}. Re-map those clubs first, or import a dump that still has them.`;
  }
};
