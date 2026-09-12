/**
 * The identifier vocabulary the content pack and everything keyed by it share.
 *
 * It lives in its own module rather than beside the pack it names: `clubColours.ts` is keyed by
 * canonical id and `contentPack.ts` holds the colour table, so a shared home for the type is what
 * keeps those two from importing each other.
 */

/** A stable, licence-free identifier. Every entity the player can see has one. */
export type CanonicalId = string;
