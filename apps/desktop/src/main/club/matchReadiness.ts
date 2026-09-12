/**
 * The facts behind `assessMatchReadiness`, read from the save.
 *
 * The rules themselves are pure and live in `@cm-clone/shared`, so the same classification runs in
 * the renderer from atoms it already holds and here, authoritatively, when Play or Quick result is
 * requested. This module is only the reading half — it decides nothing.
 */
import { ReadinessBlockerView, type ClubId } from "@cm-clone/contracts";
import { assessMatchReadiness, type MatchReadinessFacts } from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";

/**
 * Whether the club has a Tactic, and how many of its slots name someone who has since left.
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

    return {
      hasTactic,
      missingSlotPlayers: hasTactic ? (orphanRows[0]?.count ?? 0) : 0,
    } satisfies MatchReadinessFacts;
  });

/** The blockers as the contracts layer carries them. Assumes a `SqlClient` in context. */
export const loadMatchBlockers = (clubId: ClubId) =>
  Effect.gen(function* () {
    const facts = yield* loadMatchReadinessFacts(clubId);
    return assessMatchReadiness(facts).blockers.map(
      (blocker) =>
        new ReadinessBlockerView({
          id: blocker.id,
          title: blocker.title,
          detail: blocker.detail,
          destination: blocker.destination,
        }),
    );
  });
