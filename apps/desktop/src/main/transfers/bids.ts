import {
  BidView,
  InsufficientTransferBudgetError,
  PlayerNotFoundError,
  WageBudgetExceededError,
  type BidId,
  type ClubId,
  type PlayerId,
} from "@cm-clone/contracts";
import { DEFAULT_CONTRACT_YEARS, weeklyWage } from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { displayNames } from "../displayNames.js";
import { appendStreamEvents, nextStreamSeq } from "../decider.js";
import { loadCurrentSeasonRow } from "../season/currentSeason.js";
import { loadClubBudgetRow, loadWageBudgetUsed } from "./budgets.js";
import { loadPlayerEcon } from "./economics.js";

export type BidStatus = "pending" | "countered" | "accepted" | "rejected" | "withdrawn" | "expired";

// ---------------------------------------------------------------------------
// Bids (ticket 16 / ADR-0005)
// ---------------------------------------------------------------------------

interface BidRow {
  readonly id: BidId;
  readonly playerId: PlayerId;
  readonly sellingClubId: ClubId;
  readonly biddingClubId: ClubId;
  readonly amount: number;
  readonly counterAmount: number | null;
  readonly status: BidStatus;
  readonly seasonNumber: number;
}

export const loadBidRow = (bidId: BidId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<BidRow>`SELECT id, player_id as "playerId", selling_club_id as "sellingClubId",
      bidding_club_id as "biddingClubId", amount, counter_amount as "counterAmount", status,
      season_number as "seasonNumber" FROM bids WHERE id = ${bidId}`;
    return rows[0] ?? null;
  });

export const loadBidsForClub = (clubId: ClubId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const nameOf = yield* displayNames;
    const rows = yield* sql<{
      id: BidId;
      playerId: PlayerId;
      playerFirstName: string;
      playerLastName: string;
      sellingClubId: ClubId;
      biddingClubId: ClubId;
      amount: number;
      counterAmount: number | null;
      status: BidStatus;
    }>`SELECT b.id, b.player_id as "playerId", p.first_name as "playerFirstName", p.last_name as "playerLastName",
              b.selling_club_id as "sellingClubId",
              b.bidding_club_id as "biddingClubId",
              b.amount, b.counter_amount as "counterAmount", b.status
       FROM bids b
       JOIN players p ON p.id = b.player_id
       WHERE b.selling_club_id = ${clubId} OR b.bidding_club_id = ${clubId}
       ORDER BY b.created_at DESC`;

    const views = rows.map(
      (row) =>
        new BidView({
          id: row.id,
          playerId: row.playerId,
          playerName: `${row.playerFirstName} ${row.playerLastName}`,
          sellingClubId: row.sellingClubId,
          sellingClubName: nameOf(row.sellingClubId),
          biddingClubId: row.biddingClubId,
          biddingClubName: nameOf(row.biddingClubId),
          amount: row.amount,
          counterAmount: row.counterAmount,
          status: row.status,
        }),
    );
    return {
      incoming: views.filter((bid) => bid.sellingClubId === clubId),
      outgoing: views.filter((bid) => bid.biddingClubId === clubId),
    };
  });

/**
 * `CompleteTransfer` (ticket 05/07/16): moves the player to the buying club, replaces their
 * Contract at a formula-derived wage and the default 1-5 year length, and settles both clubs'
 * Transfer Budgets — all in the caller's `Effect.gen`, i.e. the same SQLite connection/transaction
 * (ADR-0007: safe under single-file SQLite). Emits `PlayerTransferredOut`/`PlayerTransferredIn` to
 * the seller's and buyer's own `"club"` streams respectively, atomically alongside the read-model
 * writes.
 *
 * Budget design choice: the buyer's Transfer Budget spends down by `amount` (ADR-0005's spend-down
 * pool); the seller's Transfer Budget *grows* by `amount` — the sale proceeds are usable Transfer
 * Budget for the seller's own business, same Season. ADR-0005 only specifies the buyer-side
 * spend-down/no-replenishment rule; crediting the seller is this ticket's reasonable extension,
 * not dictated by the design ticket.
 */


/**
 * Appends to a club's stream, but only for the club the human manages.
 *
 * A club stream exists to give the manager a record of their own club's story — it feeds the news
 * inbox. For every other club in the world the same events would be a restatement of
 * `player_transfers` and `contracts`, which are authoritative, and there would be one stream per
 * club in a sixteen-thousand-club world.
 *
 * Stated once here rather than at each of the six append sites, because a rule spelled out six times
 * is one that gets forgotten at the seventh.
 */
export const appendHumanClubEvents = (
  clubId: ClubId,
  events: ReadonlyArray<{ readonly tag: string; readonly payload: unknown }>,
) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{ isUserClub: number }>`
      SELECT is_user_club as "isUserClub" FROM clubs WHERE id = ${clubId}`;
    if (rows[0]?.isUserClub !== 1) return;

    const seq = yield* nextStreamSeq("club", clubId);
    yield* appendStreamEvents("club", clubId, seq, events);
  });

/**
 * Records a completed transfer, world-wide and permanently.
 *
 * The one authoritative record of who moved where and when. A player's career history is a query
 * over these rows rather than a fold over the log, which is why transfers between two clubs the
 * human never sees are written too: a player they sign in five seasons' time has a history, and it
 * has to have been recorded while nobody was watching.
 *
 * `fromClubId` is NULL for a free-agent signing — there was no club to leave.
 */
export const recordTransfer = (params: {
  readonly playerId: PlayerId;
  readonly fromClubId: ClubId | null;
  readonly toClubId: ClubId;
  readonly fee: number;
}) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const on = (yield* loadCurrentSeasonRow)?.currentDate;
    if (on === undefined) return;
    yield* sql`INSERT INTO player_transfers (player_id, from_club_id, to_club_id, transferred_on, fee)
      VALUES (${params.playerId}, ${params.fromClubId}, ${params.toClubId}, ${on}, ${params.fee})`;
  });

export const completeTransfer = (params: {
  readonly playerId: PlayerId;
  readonly sellingClubId: ClubId;
  readonly biddingClubId: ClubId;
  readonly amount: number;
  readonly seasonNumber: number;
}) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    // `sql.withTransaction` (BEGIN/COMMIT/ROLLBACK) is what actually makes this atomic — without
    // it, a failure partway through (e.g. the Wage Budget check failing after the player's club_id
    // had already been reassigned) would leave the two clubs' streams/read-model out of sync.
    return yield* sql.withTransaction(
      Effect.gen(function* () {
        const player = yield* loadPlayerEcon(params.playerId);
        if (!player) {
          return yield* new PlayerNotFoundError({ playerId: params.playerId });
        }

        const buyerBudget = yield* loadClubBudgetRow(params.biddingClubId);
        if (params.amount > buyerBudget.transferBudgetRemaining) {
          return yield* new InsufficientTransferBudgetError({
            clubId: params.biddingClubId,
            amount: params.amount,
            remaining: buyerBudget.transferBudgetRemaining,
          });
        }

        const wage = weeklyWage(player.overallRating, player.age, player.potentialAbility);
        const wageUsed = yield* loadWageBudgetUsed(params.biddingClubId);
        if (wageUsed + wage > buyerBudget.wageBudget) {
          return yield* new WageBudgetExceededError({
            clubId: params.biddingClubId,
            wage,
            wageBudgetUsed: wageUsed,
            wageBudget: buyerBudget.wageBudget,
          });
        }

        yield* sql`UPDATE players SET club_id = ${params.biddingClubId} WHERE id = ${params.playerId}`;
        yield* recordTransfer({
          playerId: params.playerId,
          fromClubId: params.sellingClubId,
          toClubId: params.biddingClubId,
          fee: params.amount,
        });
        yield* sql`DELETE FROM contracts WHERE player_id = ${params.playerId}`;
        yield* sql`INSERT INTO contracts (player_id, wage, years_remaining, signed_season)
          VALUES (${params.playerId}, ${wage}, ${DEFAULT_CONTRACT_YEARS}, ${params.seasonNumber})`;

        yield* sql`UPDATE club_budgets SET transfer_budget_remaining = transfer_budget_remaining - ${params.amount} WHERE club_id = ${params.biddingClubId}`;
        yield* sql`UPDATE club_budgets SET transfer_budget_remaining = transfer_budget_remaining + ${params.amount} WHERE club_id = ${params.sellingClubId}`;

        yield* appendHumanClubEvents(params.sellingClubId, [
          {
            tag: "PlayerTransferredOut",
            payload: { playerId: params.playerId, toClubId: params.biddingClubId, amount: params.amount },
          },
        ]);
        yield* appendHumanClubEvents(params.biddingClubId, [
          {
            tag: "PlayerTransferredIn",
            payload: {
              playerId: params.playerId,
              fromClubId: params.sellingClubId,
              amount: params.amount,
              wage,
              contractYears: DEFAULT_CONTRACT_YEARS,
            },
          },
        ]);
      }),
    );
  });
