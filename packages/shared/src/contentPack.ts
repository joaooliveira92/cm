import type { NationCode } from "./nations.js";

/**
 * The boundary between what the simulation *is* and what it is *called*.
 *
 * Geography is real (see `nations.ts`). Club and competition identities are not: club names,
 * competition names, badges, kits, and stadium names are commonly licensed commercial assets, and
 * a simulation that hard-codes them cannot ship without that licence. So the simulation core never
 * names a club — it refers to `club_eng_01`, and a **content pack** decides whether that reads as a
 * fictional name, a licensed real name, a localized name, or a test fixture.
 *
 * The rule that makes this work: **a canonical id is never a display name.** `"Real Madrid"` as a
 * domain identifier couples the engine to one licensing arrangement forever; `club_esp_01` does
 * not. Nothing downstream of generation may key behaviour off a display name.
 *
 * The base pack shipped here is entirely fictional, so the default build carries no licensing
 * question at all.
 */

/** A stable, licence-free identifier. Every entity the player can see has one. */
export type CanonicalId = string;

/** BCP 47 language tag, or `"*"` for the fallback every pack must provide. */
export type LocaleTag = string;

export interface ContentPack {
  readonly id: string;
  readonly displayName: string;
  readonly version: string;
  /**
   * Whether this pack's names are fictional or licensed real-world identities. Carried so a build
   * can refuse to load licensed content it has no rights to, and so provenance is visible in a
   * generated world's report rather than inferred from the names.
   */
  readonly contentSource: "FICTIONAL" | "LICENSED";
  /** Canonical id -> locale -> display name. `"*"` is the fallback. */
  readonly displayNames: Readonly<Record<CanonicalId, Readonly<Record<LocaleTag, string>>>>;
}

/**
 * Resolves a canonical id to a display name, falling back locale -> `"*"` -> the id itself.
 *
 * Returning the canonical id when nothing matches is deliberate: a missing name should surface as
 * a visible `club_eng_01` in the UI, which is obvious in a screenshot and caught by the validation
 * pass, rather than as an empty string that reads as a rendering bug.
 */
export const displayName = (
  pack: ContentPack,
  id: CanonicalId,
  locale: LocaleTag = "*",
): string => {
  const entry = pack.displayNames[id];
  if (!entry) return id;
  return entry[locale] ?? entry["*"] ?? id;
};

/** Every canonical id a pack names, for the validation pass that reports missing localization. */
export const packCoverage = (pack: ContentPack): ReadonlySet<CanonicalId> =>
  new Set(Object.keys(pack.displayNames));

/**
 * Canonical club ids, one per Nation that ships club content, numbered within the Nation.
 *
 * The number is an address, not a ranking: `club_eng_01` is not "England's best club". Sorting or
 * seeding off the ordinal would make the id meaningful, which is exactly what a canonical id must
 * not be.
 */
export const canonicalClubId = (nation: NationCode, ordinal: number): CanonicalId =>
  `club_${nation.toLowerCase()}_${String(ordinal).padStart(2, "0")}`;

export const canonicalCompetitionId = (nation: NationCode, slug: string): CanonicalId =>
  `comp_${nation.toLowerCase()}_${slug}`;
