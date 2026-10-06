/** League, competition and fixture atoms. */
import type { CompetitionId, SaveId } from "@cm-clone/contracts";
import { Atom } from "effect/unstable/reactivity";
import { call } from "./call.js";
import { saveKey } from "./keys.js";
import { managementReadPolicy } from "./policy.js";

/** getLeagueTable — `["save", saveId]`. */
export const leagueTableAtom = Atom.family((saveId: SaveId) =>
  managementReadPolicy(
    Atom.make(call("getLeagueTable", { saveId })).pipe(Atom.withReactivity([saveKey(saveId)])),
  ),
);

/**
 * getCompetitionTable — `["save", saveId]`.
 *
 * Competition Table for any competition by id. Nested families (same pattern as the scout report and
 * club staff) because `Atom.family` memoises through `MutableHashMap`, which compares plain objects
 * by reference — a `{ saveId, competitionId }` key would miss on every render.
 */
const competitionTableForSave = Atom.family((saveId: SaveId) =>
  Atom.family((competitionId: CompetitionId) =>
    managementReadPolicy(
      Atom.make(call("getCompetitionTable", { saveId, competitionId })).pipe(
        Atom.withReactivity([saveKey(saveId)]),
      ),
    ),
  ),
);

export const competitionTableAtom = (saveId: SaveId, competitionId: CompetitionId) =>
  competitionTableForSave(saveId)(competitionId);

/**
 * getCompetitionFixtures — `["save", saveId]`.
 *
 * Any Competition's Fixture list by id. Nested families for the same reason as
 * `competitionTableAtom`: `Atom.family` memoises through `MutableHashMap`, which compares plain
 * objects by reference, so a `{ saveId, competitionId }` object key would miss on every render.
 */
const competitionFixturesForSave = Atom.family((saveId: SaveId) =>
  Atom.family((competitionId: CompetitionId) =>
    managementReadPolicy(
      Atom.make(call("getCompetitionFixtures", { saveId, competitionId })).pipe(
        Atom.withReactivity([saveKey(saveId)]),
      ),
    ),
  ),
);

export const competitionFixturesAtom = (saveId: SaveId, competitionId: CompetitionId) =>
  competitionFixturesForSave(saveId)(competitionId);

/** getFixtures — `["save", saveId]`. */
export const fixturesAtom = Atom.family((saveId: SaveId) =>
  managementReadPolicy(
    Atom.make(call("getFixtures", { saveId })).pipe(Atom.withReactivity([saveKey(saveId)])),
  ),
);

/** getSeasonSummary — `["save", saveId]`. */
export const seasonSummaryAtom = Atom.family((saveId: SaveId) =>
  managementReadPolicy(
    Atom.make(call("getSeasonSummary", { saveId })).pipe(Atom.withReactivity([saveKey(saveId)])),
  ),
);

/**
 * getCompetitionOverview — `["save", saveId]`.
 *
 * Competition Overview (Screen 161): a Competition's identity, season and card counts. Reactive on
 * the save key alone, matching `competitionFixturesAtom` — the counts move when football is played,
 * and the save-wide invalidation after Continue is what both reads rely on to see it.
 */
const competitionOverviewForSave = Atom.family((saveId: SaveId) =>
  Atom.family((competitionId: CompetitionId) =>
    managementReadPolicy(
      Atom.make(call("getCompetitionOverview", { saveId, competitionId })).pipe(
        Atom.withReactivity([saveKey(saveId)]),
      ),
    ),
  ),
);

export const competitionOverviewAtom = (saveId: SaveId, competitionId: CompetitionId) =>
  competitionOverviewForSave(saveId)(competitionId);

/**
 * getCompetitions — `["save", saveId]`.
 *
 * The World section's browse list. Every field is fixed at world generation, so the save key alone
 * is enough — nothing a command does changes which competitions exist.
 */
export const competitionsAtom = Atom.family((saveId: SaveId) =>
  managementReadPolicy(
    Atom.make(call("getCompetitions", { saveId })).pipe(Atom.withReactivity([saveKey(saveId)])),
  ),
);