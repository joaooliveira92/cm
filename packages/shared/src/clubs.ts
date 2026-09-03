import { canonicalCompetitionId, type CanonicalId } from "./contentPack.js";

export const STATURE_TIERS = ["big", "mid", "small"] as const;

export type StatureTier = (typeof STATURE_TIERS)[number];

/**
 * The Competition generation actually materializes today — one league, the catalogue's English
 * first division. It names the world that exists on disk, never the scope a
 * `LeagueSelectionSnapshot` recorded as intent.
 *
 * It is an id, not a name: what the player reads is the content pack's name for it, resolved on
 * the way out of the main process like every other display name.
 */
export const LEAGUE_COMPETITION_ID: CanonicalId = canonicalCompetitionId("ENG", "1");

/**
 * The generated League's twenty club slots and each slot's permanent Stature Tier
 * (4 big / 8 mid / 8 small).
 *
 * An ordinal-to-stature list, and deliberately nothing more: a club's canonical id is minted from
 * its ordinal and its name comes from the content pack, so this file carries the one thing that is
 * neither an identity nor a label — how strong the slot is meant to be.
 */
export const LEAGUE_CLUBS: readonly StatureTier[] = [
  "big",
  "big",
  "big",
  "big",
  "mid",
  "mid",
  "mid",
  "mid",
  "mid",
  "mid",
  "mid",
  "mid",
  "small",
  "small",
  "small",
  "small",
  "small",
  "small",
  "small",
  "small",
];
