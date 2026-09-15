import type { PlayableSlotCountryId } from "@/content/nationAssetManifest.js";

/**
 * Bridges the game's nation-record ids (e.g. `uk`) to the presentation
 * catalog's country ids (e.g. `gb`). Nation identity is authoritative state;
 * the catalog keys presentation art/flavor/coordinates by stable country id
 * (ADR-0003). Keys mirror the compiled content pack's country ids
 * (content/production/1880/countries.yaml). Only nations that exist in the
 * campaign content are mapped.
 */
export const NATION_ID_TO_COUNTRY_ID: Readonly<Record<string, PlayableSlotCountryId>> = {
  uk: "gb",
  germany: "de",
  france: "fr",
  italy: "it",
  usa: "us",
  japan: "jp",
  russia: "ru",
  austria_hungary: "ah",
  spain: "es",
  qing: "qing",
};

export function nationIdToCountryId(nationId: string): PlayableSlotCountryId | null {
  return NATION_ID_TO_COUNTRY_ID[nationId] ?? null;
}

export function countryIdToNationId(countryId: PlayableSlotCountryId): string | null {
  const entry = Object.entries(NATION_ID_TO_COUNTRY_ID).find(([, cid]) => cid === countryId);
  return entry === undefined ? null : entry[0];
}
