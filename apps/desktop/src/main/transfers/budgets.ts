import { type ClubId, type PlayerId } from "@cm-clone/contracts";
import {
  createSeededRng,
  TRANSFER_BUDGET_BY_TIER,
  WAGE_BUDGET_BY_TIER,
  weeklyWage,
  type StatureTier,
} from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { loadAllPlayersEcon } from "./economics.js";

// ---------------------------------------------------------------------------
// Budgets (ticket 16 / ADR-0005)
// ---------------------------------------------------------------------------

interface ClubBudgetRow {
  readonly transferBudgetRemaining: number;
  readonly wageBudget: number;
}

/** Exported for `aiClubs.ts` (ticket 17): AI-club buying re-reads a fresh budget row before every
 * bid in a window, since an earlier bid in the same run may already have spent it down. */
export const loadClubBudgetRow = (clubId: ClubId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<ClubBudgetRow>`SELECT transfer_budget_remaining as "transferBudgetRemaining",
      wage_budget as "wageBudget" FROM club_budgets WHERE club_id = ${clubId}`;
    return rows[0]!;
  });

/** Exported for `aiClubs.ts` (ticket 17), same reasoning as `loadClubBudgetRow`. */
export const loadWageBudgetUsed = (clubId: ClubId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{
      used: number;
    }>`SELECT COALESCE(SUM(c.wage), 0) as used FROM contracts c JOIN players p ON p.id = c.player_id WHERE p.club_id = ${clubId}`;
    return rows[0]?.used ?? 0;
  });

/**
 * Derives Transfer Budget (spend-down, per Season) and Wage Budget (running cap) from each club's
 * fixed Stature Tier and seeds one active Contract per generated player (ticket 16 / ADR-0005).
 * Called once from `startSeason` (ticket 15) for the save's first Season — assumes a `SqlClient`
 * for the save's SQLite file in context, in the same transaction as world/season generation.
 */
export const initializeSeasonEconomy = (seasonNumber: number, seed: number) =>
  Effect.gen(function* () {
    // Derived from the world seed, not drawn: contract lengths are part of the generated world and
    // must come back identically when the same seed is regenerated.
    const random = createSeededRng(seed);
    const sql = yield* SqlClient;
    const clubRows = yield* sql<{
      id: ClubId;
      statureTier: StatureTier;
    }>`SELECT id, stature_tier as "statureTier" FROM clubs`;
    for (const club of clubRows) {
      yield* sql`INSERT INTO club_budgets (club_id, season_number, transfer_budget_remaining, wage_budget)
        VALUES (${club.id}, ${seasonNumber}, ${TRANSFER_BUDGET_BY_TIER[club.statureTier]}, ${WAGE_BUDGET_BY_TIER[club.statureTier]})`;
    }

    const players = yield* loadAllPlayersEcon;
    for (const player of players) {
      if (!player.clubId) continue; // no Free Agents at world-generation time
      const wage = weeklyWage(player.overallRating, player.age, player.potentialAbility);
      // Spread initial squads across 1-3 remaining years so contract expiry doesn't hit everyone
      // simultaneously later.
      const years = 1 + Math.floor(random.next() * 3);
      yield* sql`INSERT INTO contracts (player_id, wage, years_remaining, signed_season)
        VALUES (${player.id}, ${wage}, ${years}, ${seasonNumber})`;
    }
  });

/**
 * Contract expiry -> Free Agent (ticket 16 / ADR-0005): decrements every active Contract's
 * `years_remaining` by one Season and frees any player who hits zero (contract row removed,
 * `players.club_id` set NULL, signable for Credits 0 via the normal Sign flow).
 *
 * Limitation: this repo has no multi-season rollover yet (ticket 15 only builds Season 1's
 * calendar) — there's no "next Season's pre-season" seam to hook this into. It's wired into
 * `advanceCalendar`'s `SeasonConcluded` transition instead, the closest analogous one-per-Season
 * boundary that currently exists.
 */
export const expireContractsForSeason = Effect.gen(function* () {
  const sql = yield* SqlClient;
  yield* sql`UPDATE contracts SET years_remaining = years_remaining - 1`;
  const expiredRows = yield* sql<{ playerId: PlayerId }>`SELECT player_id as "playerId" FROM contracts WHERE years_remaining <= 0`;
  for (const row of expiredRows) {
    yield* sql`UPDATE players SET club_id = NULL WHERE id = ${row.playerId}`;
  }
  yield* sql`DELETE FROM contracts WHERE years_remaining <= 0`;
});
