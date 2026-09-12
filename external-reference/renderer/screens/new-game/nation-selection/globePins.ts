import { PLAYABLE_SLOT_COUNTRY_IDS } from "@/content/nationAssetManifest.js";
import {
  getNationPresentation,
  NATION_MARKER_COLOURS,
} from "@/content/nationPresentationCatalog.js";
import type { GlobePoint } from "./globeTypes.js";

/** Compatibility export; marker colours are authored by the nation presentation catalog. */
export const DOMINANT_FLAG_COLORS: Readonly<Record<string, string>> = NATION_MARKER_COLOURS;

/** Globe markers derived from complete nation presentation records. */
export const POINTS_DATA: GlobePoint[] = PLAYABLE_SLOT_COUNTRY_IDS.map((countryId) => {
  const nation = getNationPresentation(countryId);
  return {
    countryId,
    lat: nation.coordinates.lat,
    lng: nation.coordinates.lng,
    label: nation.name,
    flagColor: nation.markerColour,
  };
});
