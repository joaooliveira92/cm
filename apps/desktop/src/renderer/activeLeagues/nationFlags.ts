import type { NationCode } from "@cm-clone/shared";

import br from "../../assets/flags/br.svg";
import de from "../../assets/flags/de.svg";
import es from "../../assets/flags/es.svg";
import fr from "../../assets/flags/fr.svg";
import gbEng from "../../assets/flags/gb-eng.svg";
import it from "../../assets/flags/it.svg";
import pt from "../../assets/flags/pt.svg";

/**
 * Nation code → flag asset URL, for the Active Leagues emblem.
 *
 * The catalogue identifies a Nation by ISO 3166-1 alpha-3 (`nations.ts`); the shipped flag files
 * are named on the flag-icons convention, which is alpha-2 plus a subdivision code for the Home
 * Nations (`gb-eng`). The two vocabularies do not line up character-for-character, so the join is
 * written out here rather than derived by slicing a code.
 *
 * The imports are static on purpose. A `new URL()` built from a runtime value gives Vite nothing
 * to resolve at build time, so the emblem would render in dev and 404 in the packaged app;
 * importing each file makes every flag a real build input.
 *
 * The map is deliberately partial. Andorra ships no flag file, and a confederation-owned
 * competition has no nation code at all — both fall through to `undefined` so the caller can show
 * the code badge rather than invent a mark.
 */
const FLAG_URL_BY_NATION_CODE: Partial<Readonly<Record<NationCode, string>>> = {
  ENG: gbEng,
  ESP: es,
  PRT: pt,
  FRA: fr,
  DEU: de,
  BRA: br,
  ITA: it,
};

/**
 * The flag URL for a nation code, or `undefined` when nothing is shipped for it.
 *
 * Takes a plain `string` because the row projection widens the code to one (a confederation-owned
 * competition carries `""`), and a lookup that threw on an unmapped code would take the whole grid
 * down over a missing image.
 */
export const nationFlagUrl = (code: string): string | undefined =>
  FLAG_URL_BY_NATION_CODE[code as NationCode];
