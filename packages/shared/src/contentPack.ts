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

/**
 * The pack a freshly generated save is generated against, and the one `generation_manifest`
 * records (id + version) so a later reader can say which pack produced the ids in that file.
 *
 * The manifest carries the pack's identity as provenance only — nothing downstream keys behaviour
 * off it, and the same world can be reopened under a different pack. Every club and competition
 * name the player sees comes from here: the catalogue and the club roster carry ids and structure,
 * and a name they do not carry cannot be baked into a save row.
 *
 * The names below are entirely fictional, so the default build carries no licensing question.
 * Competition names read as structural descriptions ("English First Division") rather than real
 * brands; that is a property of *this* pack, not of the layer — a licensed pack replaces them
 * without touching a line of simulation code.
 */
export const BASE_CONTENT_PACK: ContentPack = {
  id: "fictional-names",
  displayName: "Fictional identities",
  version: "2.0.0",
  contentSource: "FICTIONAL",
  displayNames: {
    // Competitions — every id `LEAGUE_SETUP_INDEX` carries. The catalogue holds the structure
    // (tier, club count, dependency edges); the names live here.
    comp_eng_1: { "*": "English First Division" },
    comp_eng_2: { "*": "English Second Division" },
    comp_eng_3: { "*": "English Third Division" },
    comp_eng_4: { "*": "English Fourth Division" },
    comp_eng_cup: { "*": "English National Cup" },
    comp_eng_reserve: { "*": "English Reserve League" },
    comp_esp_1: { "*": "Spanish First Division" },
    comp_esp_2n: { "*": "Spanish Second Division – Northern Group" },
    comp_esp_2s: { "*": "Spanish Second Division – Southern Group" },
    comp_esp_cup: { "*": "Spanish National Cup" },
    comp_deu_1: { "*": "German First Division" },
    comp_deu_2: { "*": "German Second Division" },
    comp_deu_3: { "*": "German Third Division" },
    comp_deu_cup: { "*": "German National Cup" },
    comp_fra_1: { "*": "French First Division" },
    comp_fra_2: { "*": "French Second Division" },
    comp_fra_cup: { "*": "French National Cup" },
    comp_prt_1: { "*": "Portuguese First Division" },
    comp_prt_2: { "*": "Portuguese Second Division" },
    comp_bra_1: { "*": "Brazilian First Division" },
    comp_bra_2: { "*": "Brazilian Second Division" },
    comp_bra_state_se: { "*": "Brazilian State Championship – South East" },
    comp_bra_state_ne: { "*": "Brazilian State Championship – North East" },
    comp_bra_cup: { "*": "Brazilian National Cup" },
    comp_and_1: { "*": "Andorran First Division" },
    comp_uefa_champions: { "*": "European Champions Tournament" },
    comp_conmebol_champions: { "*": "South American Champions Tournament" },

    // Clubs — the twenty the generator materializes today, in `comp_eng_1`. The rest of the
    // catalogue's club ids are unnamed until generation mints them (see `packCoverageGaps`).
    club_eng_01: { "*": "Castlemere United" },
    club_eng_02: { "*": "Northgate Athletic" },
    club_eng_03: { "*": "Vantage Rovers" },
    club_eng_04: { "*": "Ashford Wanderers" },
    club_eng_05: { "*": "Brackenfield Town" },
    club_eng_06: { "*": "Duncaster City" },
    club_eng_07: { "*": "Elmsworth FC" },
    club_eng_08: { "*": "Fenwick Albion" },
    club_eng_09: { "*": "Greymoor United" },
    club_eng_10: { "*": "Harrowgate Villa" },
    club_eng_11: { "*": "Ironbridge Rangers" },
    club_eng_12: { "*": "Kestrel Park" },
    club_eng_13: { "*": "Lowmoor Athletic" },
    club_eng_14: { "*": "Millbrook Town" },
    club_eng_15: { "*": "Norwood Forest" },
    club_eng_16: { "*": "Oakfield United" },
    club_eng_17: { "*": "Pinehaven Rovers" },
    club_eng_18: { "*": "Quayside FC" },
    club_eng_19: { "*": "Ridgeway Town" },
    club_eng_20: { "*": "Southmere Albion" },
  },
};

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

/**
 * The build's own pack, resolved for a canonical id.
 *
 * Setup-time reads — the catalogue browser, its search, the Active Leagues consequences — run
 * before any save exists, so there is no recorded pack to resolve against and exactly one pack in
 * play: this build's. Save-backed reads must not use this; they resolve through the pack the save
 * recorded, which is the main process's own seam.
 */
export const catalogueName = (id: CanonicalId, locale: LocaleTag = "*"): string =>
  displayName(BASE_CONTENT_PACK, id, locale);

/** Every canonical id a pack names, for the validation pass that reports missing localization. */
export const packCoverage = (pack: ContentPack): ReadonlySet<CanonicalId> =>
  new Set(Object.keys(pack.displayNames));

/**
 * The ids a pack fails to name, in the order they were asked for.
 *
 * Resolution never fails — an unnamed id renders as itself — so this is the only thing that turns
 * a missing name into something a test or a startup check can act on, rather than a raw
 * `club_eng_07` reaching a screen unnoticed.
 */
export const packCoverageGaps = (
  pack: ContentPack,
  ids: Iterable<CanonicalId>,
): readonly CanonicalId[] => {
  const covered = packCoverage(pack);
  return [...ids].filter((id) => !covered.has(id));
};

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
