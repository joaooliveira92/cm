import type { PlayableSlotCountryId } from "./nationAssetManifest.js";

export type NationCoordinates = {
  lat: number;
  lng: number;
  label: string;
};

/**
 * Approximate capital/centroid coordinates for each playable 1880 nation.
 * Used by the globe to know where to spin when a nation is selected.
 */
export const NATION_COORDINATES: Record<PlayableSlotCountryId, NationCoordinates> = {
  gb: { lat: 51.5, lng: -0.1, label: "London" },
  de: { lat: 52.5, lng: 13.4, label: "Berlin" },
  us: { lat: 38.9, lng: -77.0, label: "Washington" },
  jp: { lat: 35.7, lng: 139.7, label: "Tokyo" },
  fr: { lat: 48.9, lng: 2.3, label: "Paris" },
  it: { lat: 41.9, lng: 12.5, label: "Rome" },
  ru: { lat: 55.8, lng: 37.6, label: "Moscow" },
  ah: { lat: 48.2, lng: 16.4, label: "Vienna" },
  es: { lat: 40.4, lng: -3.7, label: "Madrid" },
  qing: { lat: 39.9, lng: 116.4, label: "Beijing" },
};
