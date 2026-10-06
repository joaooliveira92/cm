import { readdirSync } from "node:fs";
import path from "node:path";
import type { AdapterRead, BadgeAdapter, SourceRow } from "./adapter.js";

/**
 * The adapter for the Brazilian dump: one flat folder of PNGs named after the club, all Brazilian,
 * with no league or season folders (`Flamengo.png`, `São Paulo.png`).
 *
 * The nation is fixed, so a row needs only the file's name. A flat dump has one file per club, which
 * leaves no "newest wins" order to honour. Files are read in code-point order so a run is repeatable.
 */

const NATION = "bra";

/**
 * Where the dump's file name is not the club's name. `Mirassol-SP` carries a state suffix, and the
 * download names Athletico Paranaense `atletico-pr` (the club's own spelling is with the `h`). Both
 * are recorded here rather than renamed in the dump so the source stays as downloaded.
 */
export const BRAZIL_LOGOS_OVERRIDES: Readonly<Record<string, string>> = {
  "bra/Mirassol-SP": "mirassol",
  "bra/atletico-pr": "athletico-paranaense",
};

const readBrazilLogos = (sourceDir: string): AdapterRead => {
  const entries = readdirSync(sourceDir, { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith("."))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  const rows: Array<SourceRow> = [];
  for (const entry of entries) {
    const name = entry.name.normalize("NFC");
    if (!entry.isFile() || path.extname(name).toLowerCase() !== ".png") {
      return {
        _tag: "Failed",
        failure: {
          _tag: "SourceLayoutMismatch",
          adapter: "brazil-logos",
          detail: `"${name}" is not a PNG; expected a flat folder of <Club Name>.png files in ${sourceDir}`,
        },
      };
    }
    rows.push({
      nation: NATION,
      clubName: name.slice(0, -".png".length).trim(),
      source: name,
      absolutePath: path.join(sourceDir, entry.name),
    });
  }
  return { _tag: "Rows", rows };
};

export const brazilLogosAdapter = (
  options: { readonly overrides?: Readonly<Record<string, string>> } = {},
): BadgeAdapter => ({
  name: "brazil-logos",
  overrides: options.overrides ?? BRAZIL_LOGOS_OVERRIDES,
  read: readBrazilLogos,
});
