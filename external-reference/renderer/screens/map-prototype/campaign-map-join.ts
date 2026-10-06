/**
 * JOIN — the authored bridge between the live campaign world and the map's
 * fixture geometry.
 *
 * The F1 map renders on top of `screens/map-prototype/prototype-world.ts`'s
 * hand-authored 36-area geometry (the only polygons/coastlines/labels that
 * exist in the repo). The real `CampaignSnapshot` (`world.areas`, `world.ports`,
 * per-nation `fleets`) carries NO geographic coordinates — only ids and names.
 * So the campaign can't place itself; something has to say "campaign area
 * `sea_north_sea` sits on fixture area `area_north_sea`". That something is
 * this file, and it is intentionally a hand-authored table, not a heuristic:
 * heuristic matching of the ~80 production-area ids onto the 36 prototype
 * polygons is exactly the kind of silent, version-dependent guesswork the
 * repo's determinism rules forbid.
 *
 * Each table is a plain `Record` keyed by the campaign (content-pack) id.
 * - `CAMPAIGN_AREA_TO_FIXTURE`: campaign area id -> fixture area id, for
 *   ownership placement. Many campaign areas (one per coastal pocket) collapse
 *   onto one fixture polygon (a whole sea region), which is fine — the map
 *   draws at fixture granularity.
 * - `NATION_HUE`: campaign nation id -> OKLCH hue, so every nation in the
 *   production pack (including ones the fixture never modelled) has a stable
 *   fill/stroke colour.
 * - `NATION_LABEL`: campaign nation id -> display name.
 *
 * Unmapped campaign areas/fleets are dropped from the live layer (they have no
 * geometry to hang on); the campaign-derived overlay is then merged over the
 * fixture's own static data so the map still renders everywhere the fixture
 * had data even before a campaign references it.
 */

import type { WorldMapView } from "@bluewave/campaign-engine";
import { AREAS_BY_ID, type AreaId, type NationId } from "./prototype-world.js";

/** Fixture nation ids the prototype's `NATIONS_BY_ID` already carries hues for. */
const FIXTURE_HUES: Readonly<Record<string, number>> = {
  britain: 15,
  france: 255,
  germany: 60,
  russia: 145,
  italy: 155,
  united_states: 285,
  japan: 25,
  netherlands: 75,
};

/** Production-pack nation ids -> hue (extends the fixture set; stable). */
export const NATION_HUE: Readonly<Record<string, number>> = {
  ...FIXTURE_HUES,
  uk: 15,
  austria_hungary: 205,
  ottoman_empire: 35,
  spain: 325,
  portugal: 300,
  qing: 45,
  brazil: 95,
  usa: 285,
};

export const NATION_LABEL: Readonly<Record<string, string>> = {
  uk: "Britain",
  france: "France",
  germany: "Germany",
  russia: "Russia",
  austria_hungary: "Austria-Hungary",
  italy: "Italy",
  usa: "United States",
  japan: "Japan",
  ottoman_empire: "Ottoman Empire",
  spain: "Spain",
  netherlands: "Netherlands",
  portugal: "Portugal",
  qing: "Qing",
  brazil: "Brazil",
};

/**
 * Campaign (production-pack) area id -> fixture area id. Covers every area in
 * `content/production/1880/areas.yaml` (audited 2026-08). Kept as a lookup so
 * an unknown future id degrades gracefully (dropped) rather than guessing.
 */
export const CAMPAIGN_AREA_TO_FIXTURE: Readonly<Record<string, AreaId>> = {
  // Home coasts -> their sea region.
  eng_home_coast: "area_north_sea",
  fra_chan_coast: "area_western_approaches",
  fra_med_coast: "area_mediterranean",
  ger_baltic_coast: "area_baltic",
  ger_ndgermany_coast: "area_north_sea",
  rus_baltic_coast: "area_baltic",
  rus_blacksea_coast: "area_black_sea",
  rus_pacific_coast: "area_sea_of_japan",
  auh_adriatic_coast: "area_adriatic",
  auh_dalmatia: "area_adriatic",
  ita_tyrrhenian_coast: "area_mediterranean",
  ita_adriatic_coast: "area_adriatic",
  usa_atlantic_coast: "area_western_atlantic",
  usa_pacific_coast: "area_northeast_pacific",
  usa_gulf_coast: "area_caribbean",
  jpn_home_coast: "area_philippine_sea",
  jpn_inland_sea: "area_east_china_sea",
  jpn_kyushu_coast: "area_east_china_sea",
  ott_marmara_coast: "area_aegean",
  ott_aegean_coast: "area_aegean",
  ott_blacksea_coast: "area_black_sea",
  ott_eg_coast: "area_mediterranean",
  spa_med_coast: "area_mediterranean",
  spa_atlantic_coast: "area_western_approaches",
  ned_home_coast: "area_north_sea",
  por_home_coast: "area_western_approaches",
  bra_rio_coast: "area_south_atlantic",
  bra_ne_coast: "area_south_atlantic",
  // Med / colonial coastal pockets.
  med_gibraltar: "area_mediterranean",
  med_malta: "area_mediterranean",
  med_cyprus: "area_mediterranean",
  india_west_coast: "area_arabian_sea",
  india_east_coast: "area_bay_of_bengal",
  indian_ceylon: "area_bay_of_bengal",
  sea_singapore: "area_malacca",
  sea_hong_kong: "area_south_china_sea",
  africa_cape: "area_cape_waters",
  atlantic_bermuda: "area_western_atlantic",
  americas_halifax: "area_north_atlantic",
  pacific_australia: "area_tasman_sea",
  indian_adden: "area_red_sea",
  sea_mauritius: "area_southern_indian",
  africa_algeria: "area_mediterranean",
  africa_senegal: "area_central_atlantic",
  indochina_cochinchina: "area_south_china_sea",
  pacific_newcaledonia: "area_coral_sea",
  pacific_tahiti: "area_south_pacific",
  americas_martinique: "area_caribbean",
  indian_reunion: "area_western_indian",
  americas_cuba: "area_caribbean",
  americas_puertorico: "area_caribbean",
  philippines_luzon: "area_philippine_sea",
  dei_java: "area_java_sea",
  americas_suriname: "area_caribbean",
  africa_angola: "area_south_atlantic",
  africa_mozambique: "area_western_indian",
  asia_macau: "area_south_china_sea",
  asia_goa: "area_arabian_sea",
  chi_north_coast: "area_yellow_sea",
  chi_weihaiwei: "area_yellow_sea",
  chi_south_coast: "area_south_china_sea",
  chi_yangtze: "area_east_china_sea",
  // Open-ocean sea areas.
  sea_english_channel: "area_western_approaches",
  sea_north_sea: "area_north_sea",
  sea_baltic: "area_baltic",
  sea_mediterranean_w: "area_mediterranean",
  sea_mediterranean_c: "area_mediterranean",
  sea_mediterranean_e: "area_mediterranean",
  sea_black_sea: "area_black_sea",
  sea_red_sea: "area_red_sea",
  sea_arabian_sea: "area_arabian_sea",
  sea_bayofbengal: "area_bay_of_bengal",
  sea_south_china: "area_south_china_sea",
  sea_java_sea: "area_java_sea",
  sea_pacific_n: "area_north_pacific",
  sea_pacific_s: "area_south_pacific",
  sea_atlantic_n: "area_north_atlantic",
  sea_atlantic_s: "area_south_atlantic",
  sea_indian_ocean: "area_southern_indian",
  sea_caribbean: "area_caribbean",
};

/** Resolve a campaign nation id to a fixture colour hue, else a neutral grey. */
export function campaignNationHue(nationId: string): number {
  return NATION_HUE[nationId] ?? 0;
}

/** Resolve a campaign nation id to a display label, else the raw id. */
export function campaignNationLabel(nationId: string): string {
  return NATION_LABEL[nationId] ?? nationId;
}

/** The live, campaign-derived overlay the map draws when a campaign is active. */
export interface LiveWorldMapOverlay {
  /** fixture area id -> owning nation (nullable unclaimed). */
  readonly ownership: ReadonlyMap<AreaId, NationId | null>;
  /** campaign ports placed on their mapped fixture area's label anchor. */
  readonly ports: readonly {
    readonly id: string;
    readonly name: string;
    readonly area: AreaId;
    readonly nation: NationId;
    readonly level: number;
  }[];
  /** campaign fleets placed on their mapped fixture area's label anchor. */
  readonly fleets: readonly {
    readonly id: string;
    readonly name: string;
    readonly area: AreaId;
    readonly nation: NationId;
    readonly ships: number;
  }[];
  readonly source: "campaign" | "none";
}

/**
 * Builds the live overlay from a real `WorldMapView`. Areas/fleets whose
 * campaign id has no fixture mapping are dropped; areas the campaign doesn't
 * reference at all are left out of `ownership` so the caller can fall back to
 * the fixture's static data for them.
 */
export function joinWorldMap(world: WorldMapView): LiveWorldMapOverlay {
  const ownership = new Map<AreaId, NationId | null>();
  for (const area of world.areas) {
    const fixture = CAMPAIGN_AREA_TO_FIXTURE[area.id];
    if (fixture === undefined) continue;
    ownership.set(fixture, area.controller ?? null);
  }

  const ports = world.ports
    .map((port) => {
      const fixture = CAMPAIGN_AREA_TO_FIXTURE[port.areaId];
      if (fixture === undefined) return null;
      return {
        id: port.id,
        name: port.name,
        area: fixture,
        nation: port.nationId,
        level: port.level,
      };
    })
    .filter((port): port is NonNullable<typeof port> => port !== null);

  const fleets = world.fleets
    .map((fleet) => {
      const fixture = CAMPAIGN_AREA_TO_FIXTURE[fleet.areaId];
      if (fixture === undefined) return null;
      return {
        id: fleet.id,
        name: fleet.name,
        area: fixture,
        nation: fleet.nationId,
        ships: fleet.shipCount,
      };
    })
    .filter((fleet): fleet is NonNullable<typeof fleet> => fleet !== null);

  return { ownership, ports, fleets, source: "campaign" };
}

export const EMPTY_LIVE_OVERLAY: LiveWorldMapOverlay = {
  ownership: new Map(),
  ports: [],
  fleets: [],
  source: "none",
};

/** Lon/lat anchor for a fixture area (its hand-placed label), for placement. */
export function fixtureAnchor(area: AreaId): readonly [number, number] | null {
  return AREAS_BY_ID.get(area)?.label ?? null;
}
