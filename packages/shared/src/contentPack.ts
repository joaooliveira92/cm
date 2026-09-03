import type { ClubColours } from "./clubColours.js";
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

    // Clubs — the twenty of `comp_eng_1`. The rest of the key space the catalogue's `clubCount`
    // values imply is unnamed, and shows as raw ids until it is authored (see `packCoverageGaps`
    // and `catalogueClubIds`).
    club_eng_1_01: { "*": "Castlemere United" },
    club_eng_1_02: { "*": "Northgate Athletic" },
    club_eng_1_03: { "*": "Vantage Rovers" },
    club_eng_1_04: { "*": "Ashford Wanderers" },
    club_eng_1_05: { "*": "Brackenfield Town" },
    club_eng_1_06: { "*": "Duncaster City" },
    club_eng_1_07: { "*": "Elmsworth FC" },
    club_eng_1_08: { "*": "Fenwick Albion" },
    club_eng_1_09: { "*": "Greymoor United" },
    club_eng_1_10: { "*": "Harrowgate Villa" },
    club_eng_1_11: { "*": "Ironbridge Rangers" },
    club_eng_1_12: { "*": "Kestrel Park" },
    club_eng_1_13: { "*": "Lowmoor Athletic" },
    club_eng_1_14: { "*": "Millbrook Town" },
    club_eng_1_15: { "*": "Norwood Forest" },
    club_eng_1_16: { "*": "Oakfield United" },
    club_eng_1_17: { "*": "Pinehaven Rovers" },
    club_eng_1_18: { "*": "Quayside FC" },
    club_eng_1_19: { "*": "Ridgeway Town" },
    club_eng_1_20: { "*": "Southmere Albion" },
  },
  clubColours: {
    // The same twenty clubs the names above cover. A club this map omits still has colours —
    // resolution falls back to an id-derived scheme (see `clubColours.ts`) — so a pack author can
    // author the ones that matter and leave the rest of the key space alone, exactly as with names.
    club_eng_1_01: {
      primary: { foreground: "#ffffff", background: "#111111" },
      secondary: { foreground: "#111111", background: "#ffffff" },
      tertiary: null,
      quaternary: null,
    },
    club_eng_1_02: {
      primary: { foreground: "#ffffff", background: "#a01722" },
      secondary: { foreground: "#a01722", background: "#ffffff" },
      tertiary: null,
      quaternary: null,
    },
    club_eng_1_03: {
      primary: { foreground: "#ffffff", background: "#14346b" },
      secondary: { foreground: "#14346b", background: "#ffffff" },
      tertiary: null,
      quaternary: null,
    },
    club_eng_1_04: {
      primary: { foreground: "#14346b", background: "#f2e34c" },
      secondary: { foreground: "#f2e34c", background: "#14346b" },
      tertiary: null,
      quaternary: null,
    },
    club_eng_1_05: {
      primary: { foreground: "#ffffff", background: "#0d5c2f" },
      secondary: { foreground: "#0d5c2f", background: "#ffffff" },
      tertiary: null,
      quaternary: null,
    },
    club_eng_1_06: {
      primary: { foreground: "#f2e34c", background: "#5c1030" },
      secondary: { foreground: "#5c1030", background: "#f2e34c" },
      tertiary: null,
      quaternary: null,
    },
    club_eng_1_07: {
      primary: { foreground: "#111111", background: "#8fbfe0" },
      secondary: { foreground: "#8fbfe0", background: "#111111" },
      tertiary: null,
      quaternary: null,
    },
    club_eng_1_08: {
      primary: { foreground: "#ffffff", background: "#7a2f12" },
      secondary: { foreground: "#7a2f12", background: "#e6d5b8" },
      tertiary: null,
      quaternary: null,
    },
    club_eng_1_09: {
      primary: { foreground: "#111111", background: "#c9d1d9" },
      secondary: { foreground: "#c9d1d9", background: "#111111" },
      tertiary: null,
      quaternary: null,
    },
    club_eng_1_10: {
      primary: { foreground: "#ffffff", background: "#6a1b7a" },
      secondary: { foreground: "#6a1b7a", background: "#ffffff" },
      tertiary: null,
      quaternary: null,
    },
    club_eng_1_11: {
      primary: { foreground: "#111111", background: "#e88b1a" },
      secondary: { foreground: "#e88b1a", background: "#111111" },
      tertiary: null,
      quaternary: null,
    },
    club_eng_1_12: {
      primary: { foreground: "#ffffff", background: "#1f6f8b" },
      secondary: { foreground: "#1f6f8b", background: "#ffffff" },
      tertiary: null,
      quaternary: null,
    },
    club_eng_1_13: {
      primary: { foreground: "#14346b", background: "#ffffff" },
      secondary: { foreground: "#ffffff", background: "#14346b" },
      tertiary: null,
      quaternary: null,
    },
    club_eng_1_14: {
      primary: { foreground: "#ffffff", background: "#2f4f2f" },
      secondary: { foreground: "#2f4f2f", background: "#ffffff" },
      tertiary: null,
      quaternary: null,
    },
    club_eng_1_15: {
      primary: { foreground: "#ffffff", background: "#8a1538" },
      secondary: { foreground: "#8a1538", background: "#d8c8a8" },
      tertiary: null,
      quaternary: null,
    },
    club_eng_1_16: {
      primary: { foreground: "#111111", background: "#d9c25a" },
      secondary: { foreground: "#d9c25a", background: "#111111" },
      tertiary: null,
      quaternary: null,
    },
    club_eng_1_17: {
      primary: { foreground: "#ffffff", background: "#1b5e4a" },
      secondary: { foreground: "#1b5e4a", background: "#ffffff" },
      tertiary: null,
      quaternary: null,
    },
    club_eng_1_18: {
      primary: { foreground: "#ffffff", background: "#26476e" },
      secondary: { foreground: "#26476e", background: "#a8c4dd" },
      tertiary: null,
      quaternary: null,
    },
    club_eng_1_19: {
      primary: { foreground: "#ffffff", background: "#b23a1f" },
      secondary: { foreground: "#b23a1f", background: "#ffffff" },
      tertiary: null,
      quaternary: null,
    },
    club_eng_1_20: {
      primary: { foreground: "#111111", background: "#e4e4e4" },
      secondary: { foreground: "#e4e4e4", background: "#111111" },
      tertiary: null,
      quaternary: null,
    },
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
  /**
   * Canonical club id -> the club's colours. Not keyed by locale: a club's colours are the same
   * identity in every language, where its name is not.
   *
   * Partial by design, and partial in a different sense from `displayNames`. An unnamed id shows
   * as itself; an uncoloured one falls back to a scheme derived from the id, because a header has
   * to paint something. See `clubColours.ts`.
   */
  readonly clubColours: Readonly<Record<CanonicalId, ClubColours>>;
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
 * Canonical club ids, minted from the club's competition and its ordinal within it: the seventh
 * club of `comp_eng_1` is `club_eng_1_07`.
 *
 * The number is an address, not a ranking: `club_eng_1_07` is not "the seventh best club in the
 * English first division". Sorting or seeding off the ordinal would make the id meaningful, which
 * is exactly what a canonical id must not be.
 *
 * Nothing new enters the catalogue to support this — a competition's `clubCount` already fixes the
 * ordinal range — so a content-pack author can enumerate the whole key space mechanically rather
 * than hand-maintaining a second copy of it.
 *
 * Promotion moves a club out of the competition its id names, so `club_eng_2_03` can end up in the
 * first division. That is correct: an id is an identity, not a description, and rewriting it on
 * promotion would break every foreign key, transfer record, and scouting row pointing at it.
 */
export const canonicalClubId = (competitionId: CanonicalId, ordinal: number): CanonicalId =>
  `club_${competitionId.replace(/^comp_/, "")}_${String(ordinal).padStart(2, "0")}`;

export const canonicalCompetitionId = (nation: NationCode, slug: string): CanonicalId =>
  `comp_${nation.toLowerCase()}_${slug}`;
