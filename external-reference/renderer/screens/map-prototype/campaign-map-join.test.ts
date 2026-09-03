import { describe, expect, it } from "vite-plus/test";
import type { WorldMapView } from "@bluewave/campaign-engine";
import { CAMPAIGN_AREA_TO_FIXTURE, joinWorldMap } from "./campaign-map-join.js";

/**
 * Authored-join tests: the campaign world (ids from the production pack) must
 * land on the fixture's 36-area geometry deterministically. Every production
 * area referenced here must already be in `CAMPAIGN_AREA_TO_FIXTURE` (the
 * table is audited against `content/production/1880/areas.yaml`).
 */

const WORLD: WorldMapView = {
  nations: [{ id: "uk", name: "Britain", tag: "GBR" }],
  areas: [
    { id: "sea_north_sea", name: "North Sea", type: "sea", controller: "uk" },
    { id: "eng_home_coast", name: "English Home Waters", type: "coastal", controller: "uk" },
    { id: "sea_english_channel", name: "English Channel", type: "sea", controller: null },
  ],
  ports: [
    {
      id: "gbr_portsmouth",
      name: "Portsmouth",
      areaId: "eng_home_coast",
      nationId: "uk",
      level: 10,
    },
  ],
  fleets: [
    {
      id: "fleet_gbr_home",
      nationId: "uk",
      name: "Home Fleet",
      areaId: "eng_home_coast",
      shipCount: 3,
    },
  ],
};

describe("joinWorldMap", () => {
  it("maps campaign areas onto fixture geometry and records their controller", () => {
    const overlay = joinWorldMap(WORLD);
    expect(overlay.ownership.get("area_north_sea")).toBe("uk");
    expect(overlay.ownership.get("area_western_approaches")).toBe(null);
    expect(overlay.ownership.get("area_mediterranean")).toBeUndefined();
  });

  it("places campaign ports and fleets on their mapped fixture area", () => {
    const overlay = joinWorldMap(WORLD);
    expect(overlay.ports).toEqual([
      {
        id: "gbr_portsmouth",
        name: "Portsmouth",
        area: "area_north_sea",
        nation: "uk",
        level: 10,
      },
    ]);
    expect(overlay.fleets).toEqual([
      {
        id: "fleet_gbr_home",
        name: "Home Fleet",
        area: "area_north_sea",
        nation: "uk",
        ships: 3,
      },
    ]);
  });

  it("drops campaign data with no fixture mapping instead of guessing", () => {
    const unknown = joinWorldMap({
      ...WORLD,
      fleets: [
        {
          id: "fleet_nowhere",
          nationId: "uk",
          name: "Phantom Fleet",
          areaId: "not_a_real_area",
          shipCount: 1,
        },
      ],
    });
    expect(unknown.fleets).toEqual([]);
  });

  it("flags the source as campaign so the chart stops using the fixture", () => {
    expect(joinWorldMap(WORLD).source).toBe("campaign");
  });
});

describe("CAMPAIGN_AREA_TO_FIXTURE", () => {
  it("maps every production sea area to a fixture area", () => {
    const seaAreas = [
      "sea_english_channel",
      "sea_north_sea",
      "sea_baltic",
      "sea_mediterranean_w",
      "sea_mediterranean_c",
      "sea_mediterranean_e",
      "sea_black_sea",
      "sea_red_sea",
      "sea_arabian_sea",
      "sea_bayofbengal",
      "sea_south_china",
      "sea_java_sea",
      "sea_pacific_n",
      "sea_pacific_s",
      "sea_atlantic_n",
      "sea_atlantic_s",
      "sea_indian_ocean",
      "sea_caribbean",
    ];
    for (const id of seaAreas) {
      expect(CAMPAIGN_AREA_TO_FIXTURE[id], id).toBeDefined();
    }
  });

  it("maps every production coastal area to a fixture area", () => {
    const coastal = [
      "eng_home_coast",
      "fra_chan_coast",
      "fra_med_coast",
      "ger_baltic_coast",
      "ger_ndgermany_coast",
      "rus_baltic_coast",
      "rus_blacksea_coast",
      "rus_pacific_coast",
      "auh_adriatic_coast",
      "auh_dalmatia",
      "ita_tyrrhenian_coast",
      "ita_adriatic_coast",
      "usa_atlantic_coast",
      "usa_pacific_coast",
      "usa_gulf_coast",
      "jpn_home_coast",
      "jpn_inland_sea",
      "jpn_kyushu_coast",
      "ott_marmara_coast",
      "ott_aegean_coast",
      "ott_blacksea_coast",
      "ott_eg_coast",
      "spa_med_coast",
      "spa_atlantic_coast",
      "ned_home_coast",
      "por_home_coast",
      "bra_rio_coast",
      "bra_ne_coast",
      "med_gibraltar",
      "med_malta",
      "med_cyprus",
      "india_west_coast",
      "india_east_coast",
      "indian_ceylon",
      "sea_singapore",
      "sea_hong_kong",
      "africa_cape",
      "atlantic_bermuda",
      "americas_halifax",
      "pacific_australia",
      "indian_adden",
      "sea_mauritius",
      "africa_algeria",
      "africa_senegal",
      "indochina_cochinchina",
      "pacific_newcaledonia",
      "pacific_tahiti",
      "americas_martinique",
      "indian_reunion",
      "americas_cuba",
      "americas_puertorico",
      "philippines_luzon",
      "dei_java",
      "americas_suriname",
      "africa_angola",
      "africa_mozambique",
      "asia_macau",
      "asia_goa",
      "chi_north_coast",
      "chi_weihaiwei",
      "chi_south_coast",
      "chi_yangtze",
    ];
    for (const id of coastal) {
      expect(CAMPAIGN_AREA_TO_FIXTURE[id], id).toBeDefined();
    }
  });
});
