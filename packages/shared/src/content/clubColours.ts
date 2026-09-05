import type { CanonicalId } from "./canonicalId.js";

/**
 * A club's colours: the identity the chrome paints itself in.
 *
 * These sit on the same side of the line as club *names* (see `contentPack.ts`): a real club's
 * colours are part of the commercial identity a licence covers, so the simulation core never
 * asserts that `club_eng_1_01` plays in red. The pack decides, exactly as it decides the name, and
 * a licensed pack replaces both without touching simulation code.
 *
 * Where colours differ from names is **totality**. An id the pack cannot name renders as the raw
 * `club_eng_2_11`, which is deliberately visible in a screenshot. There is no equivalent for a
 * colour: a header cannot paint "missing", and an unpainted one is not a visible gap but an
 * invisible one — it just looks like the default chrome. So resolution falls back to a palette
 * derived from the canonical id rather than to nothing, and every club necessarily has a primary
 * and a secondary pair.
 */

/**
 * A foreground/background pair, held together because neither is meaningful alone.
 *
 * Contrast is a property of the *pair*, and the whole point of a club scheme is that text painted
 * in the foreground stays legible on the background. Two independent `primaryForeground` and
 * `primaryBackground` fields would let a pack author supply one and not the other, and let a
 * consumer read a foreground while painting some other background — which is the bug this shape
 * makes unrepresentable.
 */
export interface ColourPair {
  /** CSS colour for text and icons painted on `background`. */
  readonly foreground: string;
  /** CSS colour for the surface itself. */
  readonly background: string;
}

/**
 * The four ranks of a club's scheme, of which the first two are mandatory.
 *
 * `tertiary` and `quaternary` are `null` rather than absent so the wire shape is fixed and a
 * consumer reads the same four keys for every club. A club with a two-colour identity is the
 * common case, not a degraded one.
 *
 * Only `primary` currently has a consumer (the career header). The rest are modelled now because
 * the ranks are a property of the club's identity, not of what this build happens to paint: a pack
 * author supplies a club's full scheme once, and a later surface claims a rank without a migration.
 */
export interface ClubColours {
  /** The club's headline scheme. The career header paints itself in this. */
  readonly primary: ColourPair;
  /** The supporting scheme — the change kit, in kit terms. */
  readonly secondary: ColourPair;
  readonly tertiary: ColourPair | null;
  readonly quaternary: ColourPair | null;
}

/**
 * The fallback palette, drawn from the traditional kit families rather than from a spread of the
 * colour wheel: football clubs are red, blue, white, green, black-and-white, claret, and so on, and
 * a hue-rotated set would produce lilac and teal clubs that read as a rendering bug.
 *
 * Every pair is authored as a pair, with the foreground chosen against its own background rather
 * than derived. Deriving "black or white, whichever contrasts more" is what produces the washed
 * grey-on-yellow that no kit designer would ship.
 */
const FALLBACK_SCHEMES: readonly ClubColours[] = [
  {
    primary: { foreground: "#ffffff", background: "#a01722" },
    secondary: { foreground: "#a01722", background: "#ffffff" },
    tertiary: null,
    quaternary: null,
  },
  {
    primary: { foreground: "#ffffff", background: "#14346b" },
    secondary: { foreground: "#14346b", background: "#f2e34c" },
    tertiary: null,
    quaternary: null,
  },
  {
    primary: { foreground: "#14346b", background: "#ffffff" },
    secondary: { foreground: "#ffffff", background: "#14346b" },
    tertiary: null,
    quaternary: null,
  },
  {
    primary: { foreground: "#ffffff", background: "#0d5c2f" },
    secondary: { foreground: "#0d5c2f", background: "#ffffff" },
    tertiary: null,
    quaternary: null,
  },
  {
    primary: { foreground: "#ffffff", background: "#111111" },
    secondary: { foreground: "#111111", background: "#ffffff" },
    tertiary: null,
    quaternary: null,
  },
  {
    primary: { foreground: "#f2e34c", background: "#5c1030" },
    secondary: { foreground: "#5c1030", background: "#f2e34c" },
    tertiary: null,
    quaternary: null,
  },
  {
    primary: { foreground: "#111111", background: "#e88b1a" },
    secondary: { foreground: "#e88b1a", background: "#111111" },
    tertiary: null,
    quaternary: null,
  },
  {
    primary: { foreground: "#ffffff", background: "#1f6f8b" },
    secondary: { foreground: "#1f6f8b", background: "#ffffff" },
    tertiary: null,
    quaternary: null,
  },
  {
    primary: { foreground: "#ffffff", background: "#6a1b7a" },
    secondary: { foreground: "#6a1b7a", background: "#ffffff" },
    tertiary: null,
    quaternary: null,
  },
  {
    primary: { foreground: "#111111", background: "#8fbfe0" },
    secondary: { foreground: "#8fbfe0", background: "#111111" },
    tertiary: null,
    quaternary: null,
  },
  {
    primary: { foreground: "#ffffff", background: "#7a2f12" },
    secondary: { foreground: "#7a2f12", background: "#e6d5b8" },
    tertiary: null,
    quaternary: null,
  },
  {
    primary: { foreground: "#111111", background: "#c9d1d9" },
    secondary: { foreground: "#c9d1d9", background: "#111111" },
    tertiary: null,
    quaternary: null,
  },
];

/**
 * FNV-1a over the canonical id.
 *
 * The requirement is only that the same id always picks the same scheme, in this build and the
 * next, without a table to persist — so a save generated today and reopened after a palette
 * *addition* keeps its colours as long as the list is appended to rather than reordered. A seeded
 * `RandomSource` would be the wrong tool: this is not world generation, it draws no entropy from
 * the world seed, and two saves of the same club should agree.
 */
const hashCanonicalId = (id: CanonicalId): number => {
  let hash = 0x81_1c_9d_c5;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 0x01_00_01_93) >>> 0;
  }
  return hash;
};

/** The scheme a club falls back to when its pack authors none. Total by construction. */
export const fallbackClubColours = (id: CanonicalId): ClubColours =>
  FALLBACK_SCHEMES[hashCanonicalId(id) % FALLBACK_SCHEMES.length] as ClubColours;

/**
 * The colours a pack asserts for a club, or the id-derived fallback.
 *
 * Mirrors `displayName`'s signature and its "resolution never fails" contract, for the same reason:
 * a read path that has to handle a missing colour is a read path that will handle it inconsistently
 * in six places.
 */
export const clubColours = (
  colours: Readonly<Record<CanonicalId, ClubColours>>,
  id: CanonicalId,
): ClubColours => colours[id] ?? fallbackClubColours(id);
