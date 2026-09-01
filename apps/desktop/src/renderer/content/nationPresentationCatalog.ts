import type { MediaAsset } from "./mediaAsset.js";
import { PLAYABLE_SLOT_COUNTRY_IDS, type PlayableSlotCountryId } from "./nationAssetManifest.js";
import { NATION_COORDINATES, type NationCoordinates } from "./nationCoordinates.js";
import { NATION_FLAVOR_TEXT, type NationFlavorText } from "./nationFlavorText.js";
import {
  type NationAssetManifest,
  type NationAssetRequest,
  type ResolvedNationAsset,
  resolveNationAsset,
} from "./resolveNationAsset.js";

/** Presentation-only marker colours used by the globe and nation-selection views. */
export const NATION_MARKER_COLOURS: Readonly<Record<PlayableSlotCountryId, string>> = Object.freeze(
  {
    gb: "#c8102e",
    fr: "#00209f",
    ru: "#0039a6",
    de: "#111111",
    it: "#008c45",
    us: "#b22234",
    ah: "#c8102e",
    jp: "#bc002d",
    es: "#f1bf00",
    qing: "#ffde00",
  },
);

export type NationColours =
  | {
      status: "resolved";
      asset: MediaAsset;
      kind: "nation_flag" | "nation_ensign";
    }
  | { status: "unavailable"; countryId: string };

export type NationPresentation = Readonly<{
  countryId: PlayableSlotCountryId;
  name: string;
  code: string;
  coordinates: NationCoordinates;
  flavor: NationFlavorText;
  nationalColours: NationColours;
  shipArtwork: ResolvedNationAsset;
  markerColour: string;
}>;

export type NationPresentationResult =
  | { status: "resolved"; nation: NationPresentation }
  | { status: "unavailable"; countryId: string };

/**
 * Resolves one complete nation presentation record. Identity-layer overrides
 * currently apply to Media Assets; authored coordinates, flavor, and marker
 * colour remain country-identity presentation content.
 */
export function resolveNationPresentation(
  request: NationAssetRequest,
  manifest?: NationAssetManifest,
): NationPresentationResult {
  if (!isPlayableSlotCountryId(request.countryId)) {
    return { status: "unavailable", countryId: request.countryId };
  }

  const countryId = request.countryId;
  const flag = resolveNationAsset(request, "nation_flag", manifest);
  const ensign = resolveNationAsset(request, "nation_ensign", manifest);
  const nationalColours: NationColours =
    flag.status === "resolved"
      ? { status: "resolved", asset: flag.asset, kind: "nation_flag" }
      : ensign.status === "resolved"
        ? { status: "resolved", asset: ensign.asset, kind: "nation_ensign" }
        : { status: "unavailable", countryId };

  return {
    status: "resolved",
    nation: Object.freeze({
      countryId,
      name: NATION_FLAVOR_TEXT[countryId].name,
      code: countryCode(countryId),
      coordinates: NATION_COORDINATES[countryId],
      flavor: NATION_FLAVOR_TEXT[countryId],
      nationalColours,
      shipArtwork: resolveNationAsset(request, "ship_silhouette", manifest),
      markerColour: NATION_MARKER_COLOURS[countryId],
    }),
  };
}

export function getNationPresentation(countryId: PlayableSlotCountryId): NationPresentation {
  const result = resolveNationPresentation({ countryId });
  if (result.status === "unavailable") {
    throw new Error(`Missing presentation content for playable nation: ${countryId}`);
  }
  return result.nation;
}

/** Complete canonical catalog, compiled once from the authored presentation modules. */
export const NATION_PRESENTATION_CATALOG: Readonly<
  Record<PlayableSlotCountryId, NationPresentation>
> = Object.freeze(
  Object.fromEntries(
    PLAYABLE_SLOT_COUNTRY_IDS.map((countryId) => [countryId, getNationPresentation(countryId)]),
  ) as Record<PlayableSlotCountryId, NationPresentation>,
);

export function isPlayableSlotCountryId(value: string): value is PlayableSlotCountryId {
  return (PLAYABLE_SLOT_COUNTRY_IDS as readonly string[]).includes(value);
}

function countryCode(countryId: PlayableSlotCountryId): string {
  return countryId.slice(0, 3).toUpperCase();
}
