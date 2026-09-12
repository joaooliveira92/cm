/**
 * Resolving the Calendar up to a date, and concluding the Season when that date was its last.
 *
 * One home for it because two callers need exactly this step and must not drift apart. The advance
 * runs it for a Matchday the human is not playing in; committing the human's Matchday runs it for
 * the Matchday they are — and a Season that concluded differently depending on which of those
 * finished it would be the same bug the pre-match boundary exists to prevent.
 *
 * Every function here assumes a `SqlClient` in context and expects to be inside the caller's
 * transaction. None of them opens one.
 */
import { type ManagerOutcome, type Verdict } from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { developPlayersForSeason } from "../club/development.js";
import { expireContractsForSeason } from "../transfers/index.js";
import { judgeSeasonEnd } from "./boardVerdict.js";
import { cupRoundsOutstanding } from "./cups.js";
import { rolloverToNextSeason } from "./rollover.js";
import { freezeFinalStandings } from "./standings.js";
import { startNextSeason } from "./start.js";
import { type SeasonPhase } from "./currentSeason.js";

/** What concluding a Season decided, or the neutral answer when it did not conclude. */
export interface ConclusionOutcome {
  readonly seasonConcluded: boolean;
  readonly boardObjectiveVerdict: Verdict | null;
  readonly managerOutcome: ManagerOutcome;
}

const NOT_CONCLUDED: ConclusionOutcome = {
  seasonConcluded: false,
  boardObjectiveVerdict: null,
  managerOutcome: "none",
};

/** The manifest fields the conclusion needs, named so callers can pass what they already read. */
export interface SeasonManifest {
  readonly worldSeed: number;
  readonly referenceYear: number;
}

/**
 * Moves the Calendar to `date`, and — when no unplayed fixture remains anywhere — concludes the
 * Season and rolls the world into the next one.
 *
 * The Season is over when the world holds no unplayed fixture, cup final included, never at a tidy
 * invented end date: competitions genuinely end on different days, and the league table is already
 * final by the time a cup final plays.
 */
export const stepCalendarTo = (
  date: string,
  seasonNumber: number,
  manifest: SeasonManifest,
  phaseAt: (date: string) => SeasonPhase,
  streamEvents: Array<{ readonly tag: string; readonly payload: unknown }>,
) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;

    const remaining = yield* sql<{ count: number }>`
      SELECT COUNT(*) as "count" FROM fixtures WHERE played = 0`;
    const concluded = (remaining[0]?.count ?? 0) === 0 && !(yield* cupRoundsOutstanding(seasonNumber));
    const phase = concluded ? "season_complete" : phaseAt(date);
    yield* sql`UPDATE season SET game_date = ${date}, phase = ${phase} WHERE season_number = ${seasonNumber}`;

    if (!concluded) return NOT_CONCLUDED;

    // Freeze before anything reads a final position: the board's verdict below judges the frozen
    // row rather than recomputing the table it is judging.
    yield* freezeFinalStandings(seasonNumber);
    streamEvents.push({ tag: "SeasonConcluded", payload: { seasonNumber } });
    // Contract expiry -> Free Agent (ticket 16 / ADR-0005) is specified as happening "at Season
    // start." There is no next season's pre-season to hook into yet, so `SeasonConcluded` stays the
    // one-per-season boundary it attaches to.
    yield* expireContractsForSeason;
    // Player Development (spec: `.scratch/training/spec.md`): every player on every club develops
    // toward their age-appropriate ceiling once per `SeasonConcluded`, appending one
    // `PlayerDeveloped` event per club to its own Club stream — same in-process synchronous reactor
    // pattern as the reactions above (ADR-0007).
    yield* developPlayersForSeason(seasonNumber);

    const judged = yield* judgeSeasonEnd(seasonNumber, streamEvents);

    // The world moves on one year, in this same transaction. A save that stopped here would hold a
    // concluded season with no next one — a state every reader would have to handle.
    if (judged.managerOutcome !== "sacked") {
      yield* rolloverToNextSeason(seasonNumber, manifest.referenceYear, manifest.worldSeed);
      yield* startNextSeason(seasonNumber + 1, manifest);
    }

    return {
      seasonConcluded: true,
      boardObjectiveVerdict: judged.verdict,
      managerOutcome: judged.managerOutcome,
    };
  });
