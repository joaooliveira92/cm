import {
  CareerSetupCompetitionBand,
  CareerSetupSummaryView,
} from "@cm-clone/contracts";
import { SIMULATION_DEPTHS, seasonLabel, seasonStartDate, type SimulationDepth } from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";

/** A provisional world is always standing in its first season; nothing has been played. */
const FIRST_SEASON = 1;

/**
 * §22's Career Setup Summary, counted off the provisional world on disk.
 *
 * The Review step already knows the configuration the player typed. What it cannot know is what
 * that configuration turned into, and the League step's `CareerScopeEstimateView` is not an answer
 * to that question — it is a projection made before generation ran, and confirming a career on it
 * would mean confirming figures no world has to honour. So every number here comes out of a
 * `COUNT` against the generated save.
 *
 * The season is derived rather than read from the `season` table, which has no row yet: `season`
 * is written by `startSeason` at `commitCareer`, and this read happens before the commit. The
 * manifest's `reference_year` is the durable fact — it is pinned at generation and is exactly what
 * `startSeason` will itself use — so deriving from it describes the same season the career will
 * open in, not a guess at one.
 *
 * A pure read: no writes, no season state, nothing the Review step could fail *into*. The caller
 * treats a failure as "unavailable" rather than as a blocked commit.
 */
export const getCareerSetupSummary = Effect.gen(function* () {
  const sql = yield* SqlClient;

  const manifestRows = yield* sql<{ referenceYear: number }>`
    SELECT reference_year as "referenceYear" FROM generation_manifest WHERE id = 1`;
  const manifest = manifestRows[0];

  // No manifest means this is not a generated world — a file that exists but holds nothing to
  // summarize. Dying rather than reporting zeroes keeps the caller's "unavailable" branch fed by a
  // genuine failure instead of by a summary that quietly describes an empty world.
  if (manifest === undefined) {
    return yield* Effect.die(new Error("save has no generation_manifest row"));
  }

  // One statement per figure, all against the same connection and all trivially indexed or full
  // table counts on a small file. Sequential deliberately: SQLite gives one connection no
  // parallelism to win here, so concurrency would buy scheduling overhead and nothing else.
  const bandRows = yield* sql<{
    depth: SimulationDepth;
    competitionCount: number;
    clubCount: number;
  }>`SELECT c.depth as "depth",
            COUNT(DISTINCT c.id) as "competitionCount",
            COUNT(DISTINCT p.club_id) as "clubCount"
     FROM competitions c
     LEFT JOIN competition_participants p
       ON p.competition_id = c.id AND p.season_number = ${FIRST_SEASON}
     GROUP BY c.depth`;

  // Nations with a Competition in them, not the `nations` table: generation copies every nation of
  // the ruleset into every save so a player can be born anywhere, so counting that table would
  // report the catalogue rather than the selected scope.
  const nationRows = yield* sql<{ nationCount: number }>`
    SELECT COUNT(DISTINCT nation_id) as "nationCount" FROM competitions WHERE nation_id IS NOT NULL`;

  const clubRows = yield* sql<{ clubCount: number }>`SELECT COUNT(*) as "clubCount" FROM clubs`;
  const playerRows = yield* sql<{ playerCount: number }>`SELECT COUNT(*) as "playerCount" FROM players`;
  const staffRows = yield* sql<{ staffCount: number }>`SELECT COUNT(*) as "staffCount" FROM staff`;

  const byDepth = new Map(bandRows.map((row) => [row.depth, row]));

  return new CareerSetupSummaryView({
    seasonNumber: FIRST_SEASON,
    seasonLabel: seasonLabel(manifest.referenceYear, FIRST_SEASON),
    seasonStartDate: seasonStartDate(manifest.referenceYear, FIRST_SEASON),
    nationCount: nationRows[0]?.nationCount ?? 0,
    // Deepest first, and only the bands this world actually has — `SIMULATION_DEPTHS` supplies the
    // order so the panel never has to sort, and an absent band is absent rather than a zero row
    // claiming the scope reaches a depth it does not.
    competitions: SIMULATION_DEPTHS.flatMap((depth) => {
      const row = byDepth.get(depth);
      return row === undefined
        ? []
        : [
          new CareerSetupCompetitionBand({
            depth,
            competitionCount: row.competitionCount,
            clubCount: row.clubCount,
          }),
        ];
    }),
    clubCount: clubRows[0]?.clubCount ?? 0,
    playerCount: playerRows[0]?.playerCount ?? 0,
    staffCount: staffRows[0]?.staffCount ?? 0,
  });
});
