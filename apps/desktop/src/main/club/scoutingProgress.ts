/**
 * How far one club's scouts have got on its targets — the one read every Player figure outside the
 * manager's own squad is gated on (Agent Note 2026-09-19, ticket 09).
 *
 * The table is sparse: a player nobody has ever looked at has no row, and absence means progress 0,
 * the widest Range the reader may publish. Progress is never widened, narrowed or defaulted here;
 * `progressForReading` (in `@cm-clone/shared`) owns the one rule about *which* progress a read
 * takes, and these loaders only fetch what the ledger holds.
 *
 * Every read that gates a published figure on it resolves through this module, so two surfaces
 * cannot disagree about what the club knows about one player:
 *
 * | Read | Where |
 * |------|-------|
 * | Transfer Market | `transfers/commands.ts` |
 * | Player Profile | `career/player.ts` |
 * | Contract Offer | `transfers/contractOffer.ts` |
 * | Player Search (119) | `transfers/playerSearch.ts` |
 * | Transfer Target Comparison (129) | `transfers/playerComparison.ts` |
 * | any Club's Squad | `club/clubSquad.ts` |
 * | Team Scout Report | `club/teamScoutReport.ts` |
 *
 * The two readers *inside* `club/scouting.ts` deliberately do not come here, because they are not
 * asking this question: the Scouting Board reports how far one scout's current assignment has got,
 * and the Scouting Knowledge list publishes the progress rows themselves as the screen's content
 * ("what have we scouted?"). Neither gates a figure on a player's worth, so neither would want this
 * module's shape.
 *
 * All three loaders assume a `SqlClient` for the save's SQLite file in context. They live in
 * `club/` because scouting is a club's own knowledge: `career/` and `transfers/` both read through
 * here rather than each keeping its own copy of the query, which is the drift the Agent Note names.
 */
import type { ClubId, PlayerId } from "@cm-clone/contracts";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";

/**
 * The whole club's progress, as a Map for O(1) lookups over every player one screen publishes.
 *
 * A Map rather than a dictionary: a screen reads a bounded set of players (the market, one offer),
 * so a `players`-sized record adds nothing over the row set, and the absent-key default *is* the
 * progress-0 rule.
 */
export const loadClubScoutingProgress = (clubId: ClubId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{ playerId: PlayerId; progress: number }>`
      SELECT player_id as "playerId", progress FROM scouting_progress WHERE club_id = ${clubId}`;
    return new Map(rows.map((row) => [row.playerId, row.progress]));
  });

/** The progress of one club on one player — 0 when the pair has never been scouted. */
export const loadProgressOnPlayer = (playerId: PlayerId, readerClubId: ClubId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{ progress: number }>`
      SELECT progress FROM scouting_progress
      WHERE club_id = ${readerClubId} AND player_id = ${playerId}`;
    return rows[0]?.progress ?? 0;
  });

/**
 * The reading club's progress on the players currently at one target Club, as a Map keyed the same
 * way `loadClubScoutingProgress` keys its own.
 *
 * Scoped on purpose: a Club's squad read and a Team Scout Report both name one target Club, and the
 * target's players are the only ones whose progress they can publish. Loading the reader's whole
 * ledger instead would fetch thousands of rows to answer a question about forty.
 */
export const loadProgressOnClubPlayers = (readerClubId: ClubId, targetClubId: ClubId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{ playerId: PlayerId; progress: number }>`
      SELECT sp.player_id as "playerId", sp.progress
      FROM scouting_progress sp
      JOIN players p ON p.id = sp.player_id
      WHERE sp.club_id = ${readerClubId} AND p.club_id = ${targetClubId}`;
    return new Map(rows.map((row) => [row.playerId, row.progress]));
  });
