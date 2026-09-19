/**
 * The Board's verdict on a concluded Season, and what it does to the manager's standing.
 *
 * Lifted out of the advance because two things now conclude a Season — an advance that resolves its
 * last Matchday, and the commit of a human Matchday that happens to be the last. Both must judge
 * identically, so the judgment has one home rather than a copy on each path.
 */
import { type ClubId } from "@cm-clone/contracts";
import { judgeBoardObjective, nextManagerOutcome, type ManagerOutcome, type Verdict } from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { loadManagerStatus, releaseClubStaff } from "../career/managerStatus.js";

/**
 * Board Objective judgment + Consecutive-Miss Counter (ticket 18 / ADR-0006): runs as an
 * in-process synchronous reactor to `SeasonConcluded`, in the same request/transaction — no
 * outbox, per ADR-0007. Only the player's club is judged; AI clubs have no Board Objective row.
 * Appends `BoardObjectiveJudged` and, if the counter crosses a threshold, `ManagerWarned`/
 * `ManagerSacked` onto `streamEvents` (caller appends them alongside `SeasonConcluded` in one
 * batch) and persists the updated `board_objective`/`manager_status` rows.
 */
export const judgeSeasonEnd = (
  seasonNumber: number,
  streamEvents: Array<{ readonly tag: string; readonly payload: unknown }>,
) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const objectiveRows = yield* sql<{
      clubId: ClubId;
      competitionId: string | null;
      minPosition: number;
      maxPosition: number;
    }>`SELECT club_id as "clubId", competition_id as "competitionId",
              min_position as "minPosition", max_position as "maxPosition"
       FROM board_objective WHERE season_number = ${seasonNumber}`;
    const objective = objectiveRows[0]!;

    // The frozen row, not a fresh tally. The rollover freezes before it judges, so this reads
    // authoritative state — and a verdict that recomputed its own evidence could disagree with the
    // table the player is looking at.
    const frozen = yield* sql<{ finalPosition: number }>`
      SELECT final_position as "finalPosition" FROM competition_participants
      WHERE competition_id = ${objective.competitionId} AND season_number = ${seasonNumber}
        AND club_id = ${objective.clubId}`;
    const finalPosition = frozen[0]?.finalPosition ?? 0;
    const band = { minPosition: objective.minPosition, maxPosition: objective.maxPosition };
    const verdict: Verdict = judgeBoardObjective(finalPosition, band);

    yield* sql`UPDATE board_objective SET final_position = ${finalPosition}, verdict = ${verdict} WHERE season_number = ${seasonNumber}`;
    streamEvents.push({
      tag: "BoardObjectiveJudged",
      payload: {
        seasonNumber,
        clubId: objective.clubId,
        competitionId: objective.competitionId,
        finalPosition,
        band,
        verdict,
      },
    });

    const managerStatus = yield* loadManagerStatus;
    const { consecutiveMisses, outcome } = nextManagerOutcome(verdict, managerStatus.consecutiveMisses);

    if (outcome === "warned") {
      streamEvents.push({ tag: "ManagerWarned", payload: { seasonNumber, consecutiveMisses } });
    } else if (outcome === "sacked") {
      streamEvents.push({ tag: "ManagerSacked", payload: { seasonNumber, consecutiveMisses } });
    }

    // A `sacked` outcome archives the save; any other outcome leaves `archived_cause` untouched
    // rather than clearing it, because an already-archived save never reaches this line (the guard
    // in `advanceCalendar` rejects first) and un-archiving is not a transition the domain has.
    if (outcome === "sacked") {
      yield* sql`UPDATE manager_status SET consecutive_misses = ${consecutiveMisses}, archived_cause = 'sacked', last_outcome = ${outcome} WHERE id = 1`;
      yield* releaseClubStaff(objective.clubId);
    } else {
      yield* sql`UPDATE manager_status SET consecutive_misses = ${consecutiveMisses}, last_outcome = ${outcome} WHERE id = 1`;
    }

    return { verdict, managerOutcome: outcome as ManagerOutcome };
  });

