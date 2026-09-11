import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import type { AdapterRead, BadgeAdapter, SourceRow } from "./adapter.js";
import { FOOTBALL_LOGOS_OVERRIDES } from "./football-logos-overrides.js";

/**
 * The adapter for the `football-logos` dump: 139x181 PNGs for 25 European top flights.
 *
 * Layout: `logos/<Country> - <League>/<Club Name>.png` holds the current season, and
 * `history/<yyyy-yy>/<Country> - <League>/<Club Name>.png` holds older ones. Sponsors rename league
 * folders between seasons (`LaLiga`, `La Liga Santander`), so only the country prefix before ` - `
 * means anything. It walks the current season first, then older seasons newest first, which is the
 * order the import needs to keep the newest file per club.
 */

const CURRENT_SEASON = "logos";
const HISTORY = "history";
const SEASON = /^\d{4}-\d{2}$/;

/**
 * League-folder country prefix -> nation code: ISO 3166-1 alpha-3, lowercased, as canonical ids use
 * it. England and Scotland have no ISO country of their own, so they take their football
 * association codes, as `eng` already does in canonical ids. Hungary appears only in 2024-25.
 */
export const FOOTBALL_LOGOS_NATIONS: Readonly<Record<string, string>> = {
  Austria: "aut",
  Belgium: "bel",
  Bulgaria: "bgr",
  Croatia: "hrv",
  "Czech Republic": "cze",
  Denmark: "dnk",
  England: "eng",
  France: "fra",
  Germany: "deu",
  Greece: "grc",
  Hungary: "hun",
  Israel: "isr",
  Italy: "ita",
  Netherlands: "nld",
  Norway: "nor",
  Poland: "pol",
  Portugal: "prt",
  Romania: "rou",
  Russia: "rus",
  Scotland: "sco",
  Serbia: "srb",
  Spain: "esp",
  Sweden: "swe",
  Switzerland: "che",
  Türkiye: "tur",
  Ukraine: "ukr",
};

const isDirectory = (dir: string): boolean => existsSync(dir) && statSync(dir).isDirectory();

/** Directory entries a dump actually means: no dotfiles, in a stable order. */
const visibleEntries = (dir: string) =>
  readdirSync(dir, { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith("."))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

const mismatch = (detail: string): AdapterRead => ({
  _tag: "Failed",
  failure: { _tag: "SourceLayoutMismatch", adapter: "football-logos", detail },
});

const readFootballLogos = (sourceDir: string): AdapterRead => {
  if (!isDirectory(path.join(sourceDir, CURRENT_SEASON))) {
    return mismatch(`expected a "${CURRENT_SEASON}/" folder holding the current season in ${sourceDir}`);
  }

  const historyDir = path.join(sourceDir, HISTORY);
  const olderSeasons = isDirectory(historyDir) ? visibleEntries(historyDir).map((entry) => entry.name) : [];
  const unexpected = olderSeasons.find((season) => !SEASON.test(season));
  if (unexpected !== undefined) return mismatch(`"${HISTORY}/${unexpected}" is not a yyyy-yy season folder`);

  const seasons = [CURRENT_SEASON, ...[...olderSeasons].sort().reverse().map((season) => `${HISTORY}/${season}`)];
  const rows: Array<SourceRow> = [];

  for (const season of seasons) {
    for (const league of visibleEntries(path.join(sourceDir, season))) {
      const folder = league.name.normalize("NFC");
      if (!league.isDirectory()) return mismatch(`"${season}/${folder}" is not a league folder`);

      const prefix = folder.split(" - ")[0] ?? folder;
      const nation = Object.hasOwn(FOOTBALL_LOGOS_NATIONS, prefix) ? FOOTBALL_LOGOS_NATIONS[prefix] : undefined;
      if (nation === undefined) {
        return { _tag: "Failed", failure: { _tag: "UnknownLeaguePrefix", folder, source: `${season}/${folder}` } };
      }

      for (const file of visibleEntries(path.join(sourceDir, season, league.name))) {
        const name = file.name.normalize("NFC");
        if (!file.isFile() || path.extname(name).toLowerCase() !== ".png") {
          return mismatch(`"${season}/${folder}/${name}" is not a PNG`);
        }
        rows.push({
          nation,
          clubName: name.slice(0, -".png".length).trim(),
          source: `${season}/${folder}/${name}`,
          absolutePath: path.join(sourceDir, season, league.name, file.name),
        });
      }
    }
  }

  return { _tag: "Rows", rows };
};

export const footballLogosAdapter = (
  options: { readonly overrides?: Readonly<Record<string, string>> } = {},
): BadgeAdapter => ({
  name: "football-logos",
  overrides: options.overrides ?? FOOTBALL_LOGOS_OVERRIDES,
  read: readFootballLogos,
});
