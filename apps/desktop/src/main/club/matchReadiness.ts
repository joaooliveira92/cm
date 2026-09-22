/**
 * The facts behind `assessMatchReadiness`, read from the save.
 *
 * The rules themselves are pure and live in `@cm-clone/shared`, so the same classification runs in
 * the renderer from atoms it already holds and here, authoritatively, when Play or Quick result is
 * requested. This module is only the reading half — it decides nothing.
 */
import { ReadinessBlockerView, ReadinessIssueView, type ClubId } from "@cm-clone/contracts";
import { assessMatchReadiness, type MatchReadinessFacts, type ReadinessItem } from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";

/**
 * Whether the club has a Tactic, how many of its slots name someone who has since left, and how
 * many of its bench slots name someone still here.
 *
 * The second count is a left join rather than a squad fetch: the question is only whether each
 * named player is still on this club's books, and loading eleven squads to answer it would be a
 * read built for a check that a single query already answers.
 *
 * Assumes a `SqlClient` in context.
 */
export const loadMatchReadinessFacts = (clubId: ClubId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const tacticRows = yield* sql<{ count: number }>`
      SELECT COUNT(*) as "count" FROM tactics WHERE club_id = ${clubId}`;
    const hasTactic = (tacticRows[0]?.count ?? 0) > 0;

    const orphanRows = yield* sql<{ count: number }>`
      SELECT COUNT(*) as "count" FROM tactic_slots ts
      LEFT JOIN players p ON p.id = ts.player_id AND p.club_id = ${clubId}
      WHERE ts.club_id = ${clubId} AND p.id IS NULL`;

    // Joined to the squad for the same reason as the slot check: a bench entry naming a player who
    // has left cannot come on, so it is no substitute.
    const benchRows = yield* sql<{ count: number }>`
      SELECT COUNT(*) as "count" FROM tactic_bench_slots tb
      JOIN players p ON p.id = tb.player_id AND p.club_id = ${clubId}
      WHERE tb.club_id = ${clubId}`;

    return {
      hasTactic,
      missingSlotPlayers: hasTactic ? (orphanRows[0]?.count ?? 0) : 0,
      namedSubstitutes: benchRows[0]?.count ?? 0,
    } satisfies MatchReadinessFacts;
  });

const toBlockerView = (blocker: ReadinessItem) =>
  new ReadinessBlockerView({
    id: blocker.id,
    title: blocker.title,
    detail: blocker.detail,
    destination: blocker.destination,
  });

/** The blockers as the contracts layer carries them. Assumes a `SqlClient` in context. */
export const loadMatchBlockers = (clubId: ClubId) =>
  Effect.gen(function* () {
    const facts = yield* loadMatchReadinessFacts(clubId);
    return assessMatchReadiness(facts).blockers.map(toBlockerView);
  });

/** Blockers and advisories together, for the pre-match boundary's read. One facts read feeds both,
 *  so the two lists always describe the same moment. Assumes a `SqlClient` in context. */
export const loadMatchReadiness = (clubId: ClubId) =>
  Effect.gen(function* () {
    const facts = yield* loadMatchReadinessFacts(clubId);
    const readiness = assessMatchReadiness(facts);
    return {
      blockers: readiness.blockers.map(toBlockerView),
      advisories: readiness.advisories.map(
        (advisory) =>
          new ReadinessIssueView({
            id: advisory.id,
            severity: advisory.severity,
            title: advisory.title,
            detail: advisory.detail,
            destination: advisory.destination,
          }),
      ),
    };
  });
