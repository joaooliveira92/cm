import { randomUUID } from "node:crypto";
import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  BidNotFoundError,
  BidView,
  InsufficientTransferBudgetError,
  InvalidBidActionError,
  MarketPlayerView,
  PlayerNotFoundError,
  PlayerNotFreeAgentError,
  SeasonView,
  TransferWindowClosedError,
  TransfersScreenView,
  WageBudgetExceededError,
  BidId,
  type ClubId,
  type ClubSummary,
  type PlayerId,
  type SaveId,
} from "@cm-clone/contracts";
import {
  AI_ACCEPT_BID_MULTIPLIER,
  AI_ACCEPT_COUNTER_MULTIPLIER,
  AI_COUNTER_TARGET_MULTIPLIER,
  AI_REJECT_BID_MULTIPLIER,
  ALL_ATTRIBUTES,
  DEFAULT_CONTRACT_YEARS,
  MAX_CONTRACT_YEARS,
  MIN_CONTRACT_YEARS,
  type POSITIONS,
  TRANSFER_BUDGET_BY_TIER,
  WAGE_BUDGET_BY_TIER,
  overallRating,
  transferValue,
  weeklyWage,
  type PlayerAttributes,
  type PlayerPosition,
  type StatureTier,
} from "@cm-clone/shared";
import { createSeededRng } from "@cm-clone/game-engine";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { displayNames } from "./displayNames.js";
import { appendStreamEvents, nextStreamSeq, withExistingSave } from "./decider.js";
import { assertSaveNotArchived } from "./managerStatus.js";
import { loadUserClub } from "./squad.js";

type BidStatus = "pending" | "countered" | "accepted" | "rejected" | "withdrawn" | "expired";

interface SeasonRow {
  readonly seasonNumber: number;
  readonly currentDate: string;
  readonly phase: "pre_season" | "in_season" | "mid_window_open" | "season_complete";
}

const loadSeasonRow = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const rows = yield* sql<{
    seasonNumber: number;
    currentDate: string;
    phase: SeasonRow["phase"];
  }>`SELECT season_number as "seasonNumber", game_date as "currentDate", phase FROM season ORDER BY season_number DESC LIMIT 1`;
  return rows[0]!;
});

const toSeasonView = (row: SeasonRow) =>
  new SeasonView({ seasonNumber: row.seasonNumber, currentDate: row.currentDate, phase: row.phase });

/** Transfer commands are legal only inside an open Transfer Window: the pre-season one, open from
 * the season's start date until the first fixture, or the mid-season one, open across its date
 * range. Both are read here as `season.phase` and nothing in this module compares dates — the
 * calendar advance is the single writer of phase, which is what keeps one rule from becoming five
 * readers of two bounds. */
const isWindowOpen = (phase: SeasonRow["phase"]) => phase === "pre_season" || phase === "mid_window_open";

// ---------------------------------------------------------------------------
// Player economics: Overall Rating / age / Potential Ability -> Transfer Value / wage
// ---------------------------------------------------------------------------

const ageFromDateOfBirth = (dateOfBirth: string): number => {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const hasHadBirthdayThisYear =
    now.getMonth() > dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
};

const attributeSelectList = (prefix: string) =>
  ALL_ATTRIBUTES.map(
    (attribute) => `${prefix}${attribute.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)} as "${attribute}"`,
  ).join(", ");

interface PlayerEconRow {
  readonly id: PlayerId;
  readonly clubId: ClubId | null;
  readonly firstName: string;
  readonly lastName: string;
  readonly dateOfBirth: string;
  readonly potentialAbility: number;
  readonly [attribute: string]: unknown;
}

interface PlayerEcon {
  readonly id: PlayerId;
  readonly clubId: ClubId | null;
  readonly clubName: string | null;
  readonly firstName: string;
  readonly lastName: string;
  readonly age: number;
  readonly overallRating: number;
  readonly potentialAbility: number;
  readonly positions: ReadonlyArray<PlayerPosition>;
}

/** Every player in the save, ratings included, club-agnostic (Free Agents have `clubId: null`) —
 * assumes a `SqlClient` for the save's SQLite file in context. Backs both the market screen and
 * the wage/Transfer Value formulas used by Bid/Sign/Renew commands. Exported for `aiClubs.ts`
 * (ticket 17), which needs the same league-wide player pool to scout weak-slot targets. */
export const loadAllPlayersEcon = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const nameOf = yield* displayNames;
  const playerRows = yield* sql.unsafe<PlayerEconRow>(
    `SELECT p.id, p.club_id as "clubId", p.first_name as "firstName", p.last_name as "lastName",
            p.date_of_birth as "dateOfBirth", p.potential_ability as "potentialAbility", ${attributeSelectList("p.")}
     FROM players p`,
    [],
  );
  const positionRows = yield* sql<{
    playerId: PlayerId;
    position: (typeof POSITIONS)[number];
    familiarity: PlayerPosition["familiarity"];
  }>`SELECT player_id as "playerId", position, familiarity FROM player_positions`;

  return playerRows.map((row): PlayerEcon => {
    const positions: ReadonlyArray<PlayerPosition> = positionRows
      .filter((p) => p.playerId === row.id)
      .map((p) => ({ position: p.position, familiarity: p.familiarity }));
    const attributes = Object.fromEntries(
      ALL_ATTRIBUTES.map((attribute) => [attribute, row[attribute] ?? undefined]),
    ) as PlayerAttributes;
    return {
      id: row.id,
      clubId: row.clubId,
      // A Free Agent has no club and so no club name; every other name is the pack's.
      clubName: row.clubId === null ? null : nameOf(row.clubId),
      firstName: row.firstName,
      lastName: row.lastName,
      age: ageFromDateOfBirth(row.dateOfBirth),
      overallRating: overallRating(attributes, positions),
      potentialAbility: row.potentialAbility,
      positions,
    };
  });
});

const loadPlayerEcon = (playerId: PlayerId) =>
  Effect.gen(function* () {
    const players = yield* loadAllPlayersEcon;
    return players.find((player) => player.id === playerId) ?? null;
  });

const toMarketPlayerView = (player: PlayerEcon) =>
  new MarketPlayerView({
    id: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
    age: player.age,
    clubId: player.clubId,
    clubName: player.clubName,
    overallRating: player.overallRating,
    transferValue: transferValue(player.overallRating, player.age, player.potentialAbility),
    positions: player.positions.map((p) => ({ position: p.position, familiarity: p.familiarity })),
  });

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

const loadBidRow = (bidId: BidId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<BidRow>`SELECT id, player_id as "playerId", selling_club_id as "sellingClubId",
      bidding_club_id as "biddingClubId", amount, counter_amount as "counterAmount", status,
      season_number as "seasonNumber" FROM bids WHERE id = ${bidId}`;
    return rows[0] ?? null;
  });

const loadBidsForClub = (clubId: ClubId) =>
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
const appendHumanClubEvents = (
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
const recordTransfer = (params: {
  readonly playerId: PlayerId;
  readonly fromClubId: ClubId | null;
  readonly toClubId: ClubId;
  readonly fee: number;
}) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const dates = yield* sql<{ gameDate: string }>`
      SELECT game_date as "gameDate" FROM season ORDER BY season_number DESC LIMIT 1`;
    const on = dates[0]?.gameDate;
    if (on === undefined) return;
    yield* sql`INSERT INTO player_transfers (player_id, from_club_id, to_club_id, transferred_on, fee)
      VALUES (${params.playerId}, ${params.fromClubId}, ${params.toClubId}, ${on}, ${params.fee})`;
  });

const completeTransfer = (params: {
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

// ---------------------------------------------------------------------------
// AI-club buying/selling (ticket 17): the same Bid/Sign machinery above, self-issued in-process
// on behalf of any club (not just the user's), never through the RpcGroup. `aiClubs.ts` owns
// target selection (which weak Position, which player); everything here is the generic
// buy/accept-counter/sign primitive that target selection calls into.
// ---------------------------------------------------------------------------

/**
 * The AI-bidder side of a countered Bid (ticket 17 / ADR-0005): accepts up to
 * `AI_ACCEPT_COUNTER_MULTIPLIER` (1.15x) Transfer Value if still affordable — a fresh Transfer/
 * Wage Budget check, since an earlier Bid in the same window may already have spent it down —
 * otherwise withdraws. Two callers: `aiPlaceBid`'s own counter branch (AI-vs-AI; in practice
 * unreachable, see the note there) and `respondToBid`'s counter branch, the realistic path where
 * the human-controlled club counters an incoming Bid from an AI club.
 */
export const resolveAiCounterOffer = (bidId: BidId, biddingClubId: ClubId, seasonNumber: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const bid = yield* loadBidRow(bidId);
    if (!bid || bid.counterAmount === null) return;

    const player = yield* loadPlayerEcon(bid.playerId);
    if (!player || player.clubId === null) {
      yield* sql`UPDATE bids SET status = 'withdrawn' WHERE id = ${bidId}`;
      return;
    }

    const value = transferValue(player.overallRating, player.age, player.potentialAbility);
    const withinMultiplier = bid.counterAmount <= value * AI_ACCEPT_COUNTER_MULTIPLIER;

    const budget = yield* loadClubBudgetRow(biddingClubId);
    const wageUsed = yield* loadWageBudgetUsed(biddingClubId);
    const wage = weeklyWage(player.overallRating, player.age, player.potentialAbility);
    const affordable = bid.counterAmount <= budget.transferBudgetRemaining && wageUsed + wage <= budget.wageBudget;

    if (withinMultiplier && affordable) {
      yield* completeTransfer({
        playerId: bid.playerId,
        sellingClubId: bid.sellingClubId,
        biddingClubId,
        amount: bid.counterAmount,
        seasonNumber,
      });
      yield* sql`UPDATE bids SET status = 'accepted' WHERE id = ${bidId}`;
    } else {
      yield* sql`UPDATE bids SET status = 'withdrawn' WHERE id = ${bidId}`;
    }
  });

/**
 * AI-club buyer's `PlaceBid` (ticket 17), parameterized so any club — not only the user's — can be
 * the bidder. Self-issued in-process by `aiClubs.ts`'s transfer-window orchestration, never through
 * the RpcGroup. Doesn't gate on window-open or re-validate the target — callers only invoke this
 * with a target already screened for affordability, during an open window.
 *
 * **The selling club decides how this resolves.** An AI seller answers instantly via
 * `decideAiSellerResponse`, as it always has. A Bid for one of the *human* club's players is
 * inserted `pending` and answered by nobody: it is the first thing in this simulation that waits on
 * the manager, and it is what makes `respondToBid`, `TransfersScreenView.incomingBids`, and the
 * `pending` status reachable in play rather than only from tests.
 *
 * A pending Bid also appends `BidReceived` to the human club's stream, which is what the News Inbox
 * projects it from. The event records that the Bid arrived; whether it is still awaiting an answer
 * is read live off the `bids` row, so the message can never disagree with the decision.
 *
 * `decideAiSellerResponse`'s counter/reject branches only trigger when `amount` is below Transfer
 * Value; `aiClubs.ts` always bids exactly Transfer Value, so an AI-to-AI bid always takes the
 * outright-accept branch. The counter handling is kept for spec-completeness (ticket 17's
 * checklist explicitly describes a "countered" reaction) and for any future caller that bids a
 * different amount.
 */
export const aiPlaceBid = (buyingClubId: ClubId, playerId: PlayerId, amount: number, seasonNumber: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const player = yield* loadPlayerEcon(playerId);
    if (!player || player.clubId === null || player.clubId === buyingClubId) {
      return null;
    }

    const id = BidId.make(randomUUID());

    // A Bid for a human-club player is left for the manager. Nothing else in the transfer path
    // branches on who the seller is, which is exactly why the seller side has never been reachable.
    const sellerRows = yield* sql<{
      isUserClub: number;
    }>`SELECT is_user_club as "isUserClub" FROM clubs WHERE id = ${player.clubId}`;
    if (sellerRows[0]?.isUserClub === 1) {
      yield* sql`INSERT INTO bids (id, player_id, selling_club_id, bidding_club_id, amount, counter_amount, status, season_number)
        VALUES (${id}, ${playerId}, ${player.clubId}, ${buyingClubId}, ${amount}, ${null}, 'pending', ${seasonNumber})`;

      yield* appendHumanClubEvents(player.clubId, [
        {
          tag: "BidReceived",
          payload: {
            bidId: id,
            playerId,
            playerName: `${player.firstName} ${player.lastName}`,
            biddingClubId: buyingClubId,
            amount,
            seasonNumber,
          },
        },
      ]);

      return { id, status: "pending" as BidStatus };
    }

    const value = transferValue(player.overallRating, player.age, player.potentialAbility);
    const decision = decideAiSellerResponse(amount, value);
    const status: BidStatus =
      decision.action === "accept" ? "accepted" : decision.action === "counter" ? "countered" : "rejected";

    if (decision.action === "accept") {
      yield* completeTransfer({
        playerId,
        sellingClubId: player.clubId,
        biddingClubId: buyingClubId,
        amount,
        seasonNumber,
      });
    }

    yield* sql`INSERT INTO bids (id, player_id, selling_club_id, bidding_club_id, amount, counter_amount, status, season_number)
      VALUES (${id}, ${playerId}, ${player.clubId}, ${buyingClubId}, ${amount}, ${decision.counterAmount}, ${status}, ${seasonNumber})`;

    if (decision.action === "counter") {
      yield* resolveAiCounterOffer(id, buyingClubId, seasonNumber);
    }

    return { id, status };
  });

/**
 * AI-club version of `signFreeAgent` (ticket 17): any club, not just the user's, signs a Free
 * Agent for Credits 0 — no Bid/negotiation step for Free Agents (ADR-0005), so unlike `aiPlaceBid`
 * this is the whole flow by itself. Self-issued in-process by `aiClubs.ts`.
 */
export const aiSignFreeAgent = (clubId: ClubId, playerId: PlayerId, seasonNumber: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const player = yield* loadPlayerEcon(playerId);
    if (!player || player.clubId !== null) return;

    const wage = weeklyWage(player.overallRating, player.age, player.potentialAbility);
    yield* sql`UPDATE players SET club_id = ${clubId} WHERE id = ${playerId}`;
    yield* recordTransfer({ playerId, fromClubId: null, toClubId: clubId, fee: 0 });
    yield* sql`INSERT INTO contracts (player_id, wage, years_remaining, signed_season)
      VALUES (${playerId}, ${wage}, ${DEFAULT_CONTRACT_YEARS}, ${seasonNumber})`;

    yield* appendHumanClubEvents(clubId, [
      { tag: "PlayerSigned", payload: { playerId, wage, years: DEFAULT_CONTRACT_YEARS } },
    ]);
  });

// ---------------------------------------------------------------------------
// Read side: the Transfer market/inbox screen
// ---------------------------------------------------------------------------

const buildTransfersScreenView = (club: ClubSummary) =>
  Effect.gen(function* () {
    const seasonRow = yield* loadSeasonRow;
    const budget = yield* loadClubBudgetRow(club.id);
    const wageBudgetUsed = yield* loadWageBudgetUsed(club.id);
    const { incoming, outgoing } = yield* loadBidsForClub(club.id);
    const players = yield* loadAllPlayersEcon;

    const freeAgents = players.filter((player) => player.clubId === null).map(toMarketPlayerView);
    const marketPlayers = players
      .filter((player) => player.clubId !== null && player.clubId !== club.id)
      .map(toMarketPlayerView);

    return new TransfersScreenView({
      club,
      season: toSeasonView(seasonRow),
      windowOpen: isWindowOpen(seasonRow.phase),
      transferBudgetRemaining: budget.transferBudgetRemaining,
      wageBudget: budget.wageBudget,
      wageBudgetUsed,
      incomingBids: incoming,
      outgoingBids: outgoing,
      freeAgents,
      marketPlayers,
    });
  });

export const getTransfersScreen = (savesDir: string, saveId: SaveId) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      const club = yield* loadUserClub;
      return yield* buildTransfersScreenView(club);
    }).pipe(Effect.provide(SqliteClient.layer({ filename, readonly: true })), Effect.scoped),
  );

// ---------------------------------------------------------------------------
// Commands: Bid / respond / sign / renew — all scoped to the user's own club, the only
// human-controlled club this ticket's RPC surface exposes (ticket 16).
// ---------------------------------------------------------------------------

const clampYears = (years: number | undefined): number =>
  Math.min(MAX_CONTRACT_YEARS, Math.max(MIN_CONTRACT_YEARS, years ?? DEFAULT_CONTRACT_YEARS));

/**
 * The selling club's side of a fresh Bid, decided instantly against Transfer Value with
 * ADR-0005's fixed multipliers, shifted by the selling manager's Influence Pillar.
 * Every selling club in this build is AI-controlled — the user only ever plays the buying side
 * of `placeBid` (there's no second human to wait on) — so this stands in for the "AI-club selling"
 * behavior ADR-0005 specifies: accept >=1.0x outright, counter at exactly Transfer Value for
 * 0.85x-1.0x, reject outright below 0.85x, with boundaries modulated by Influence.
 * Pure and exported for direct unit testing, independent of the DB.
 *
 * @param amount - The bid amount
 * @param value - The player's Transfer Value
 * @param influenceModifier - The Influence Pillar's modifier (1.0 at neutral/3, <1.0 at lower, >1.0 at higher).
 *   Higher Influence shifts thresholds in the buyer's favor (wider accept range);
 *   lower Influence shifts them against the buyer (narrower accept range).
 */
export const decideAiSellerResponse = (
  amount: number,
  value: number,
  influenceModifier: number = 1.0,
): { readonly action: "accept" | "counter" | "reject"; readonly counterAmount: number | null } => {
  // Accept threshold is pushed down (easier to accept) by higher Influence, up by lower.
  const acceptThreshold = AI_ACCEPT_BID_MULTIPLIER / influenceModifier;
  // Reject threshold moves proportionally.
  const rejectThreshold = AI_REJECT_BID_MULTIPLIER / influenceModifier;

  if (amount >= value * acceptThreshold) {
    return { action: "accept", counterAmount: null };
  }
  if (amount >= value * rejectThreshold) {
    return { action: "counter", counterAmount: Math.round(value * AI_COUNTER_TARGET_MULTIPLIER) };
  }
  return { action: "reject", counterAmount: null };
};

/** Any player is biddable regardless of a Listed flag (ticket 05: not modeled at all — no gate to
 * bypass). A Bid is legal only during an open Transfer Window. The selling club (always an
 * AI-controlled club in this build) responds instantly via `decideAiSellerResponse`, since there's
 * no human on the other side to await — the resulting Bid can come back `accepted` (the transfer
 * completes immediately), `countered` (the user then calls `respondAsBidder`), or `rejected`. */
export const placeBid = (savesDir: string, saveId: SaveId, playerId: PlayerId, amount: number) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      yield* assertSaveNotArchived(saveId);
      const sql = yield* SqlClient;
      const club = yield* loadUserClub;
      const seasonRow = yield* loadSeasonRow;
      if (!isWindowOpen(seasonRow.phase)) {
        return yield* new TransferWindowClosedError({ saveId });
      }

      const player = yield* loadPlayerEcon(playerId);
      if (!player) {
        return yield* new PlayerNotFoundError({ playerId });
      }
      if (player.clubId === club.id) {
        return yield* new InvalidBidActionError({ reason: "cannot bid for a player already at your own club" });
      }
      if (player.clubId === null) {
        return yield* new InvalidBidActionError({
          reason: "player is a Free Agent — sign them directly, no Bid step needed",
        });
      }

      const budget = yield* loadClubBudgetRow(club.id);
      if (amount > budget.transferBudgetRemaining) {
        return yield* new InsufficientTransferBudgetError({
          clubId: club.id,
          amount,
          remaining: budget.transferBudgetRemaining,
        });
      }

      const id = BidId.make(randomUUID());
      const value = transferValue(player.overallRating, player.age, player.potentialAbility);
      const decision = decideAiSellerResponse(amount, value);

      if (decision.action === "accept") {
        yield* completeTransfer({
          playerId,
          sellingClubId: player.clubId,
          biddingClubId: club.id,
          amount,
          seasonNumber: seasonRow.seasonNumber,
        });
      }

      yield* sql`INSERT INTO bids (id, player_id, selling_club_id, bidding_club_id, amount, counter_amount, status, season_number)
        VALUES (${id}, ${playerId}, ${player.clubId}, ${club.id}, ${amount}, ${decision.counterAmount},
          ${decision.action === "accept" ? "accepted" : decision.action === "counter" ? "countered" : "rejected"},
          ${seasonRow.seasonNumber})`;

      return new BidView({
        id,
        playerId,
        playerName: `${player.firstName} ${player.lastName}`,
        sellingClubId: player.clubId,
        sellingClubName: player.clubName ?? "",
        biddingClubId: club.id,
        biddingClubName: club.name,
        amount,
        counterAmount: decision.counterAmount,
        status: decision.action === "accept" ? "accepted" : decision.action === "counter" ? "countered" : "rejected",
      });
    }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped),
  );

/** The selling club's side of the single-counter-offer Bid flow: accept (completes the transfer
 * at `bid.amount`), reject, or make exactly one counter-offer (ticket 05/16). */
export const respondToBid = (
  savesDir: string,
  saveId: SaveId,
  bidId: BidId,
  action: "accept" | "reject" | "counter",
  counterAmount: number | undefined,
) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      yield* assertSaveNotArchived(saveId);
      const sql = yield* SqlClient;
      const club = yield* loadUserClub;
      const seasonRow = yield* loadSeasonRow;
      const bid = yield* loadBidRow(bidId);
      if (!bid) {
        return yield* new BidNotFoundError({ bidId });
      }
      if (bid.sellingClubId !== club.id) {
        return yield* new InvalidBidActionError({ reason: "this Bid isn't for one of your players" });
      }
      if (bid.status !== "pending") {
        return yield* new InvalidBidActionError({ reason: `Bid is ${bid.status}, not awaiting a seller response` });
      }
      // No transfer-window gate here by design: answering a bid that the market already placed in a
      // window merely resolves a negotiation that is in flight, it does not open a new one. An
      // unanswered incoming bid lapses at the next Continue (`expireStalePendingBids`), so the only
      // thing gating a response is whether the bid is still `pending` — checked above.

      if (action === "reject") {
        yield* sql`UPDATE bids SET status = 'rejected' WHERE id = ${bidId}`;
      } else if (action === "counter") {
        if (counterAmount === undefined || counterAmount <= 0) {
          return yield* new InvalidBidActionError({ reason: "a counter-offer needs a positive counterAmount" });
        }
        yield* sql`UPDATE bids SET status = 'countered', counter_amount = ${counterAmount} WHERE id = ${bidId}`;
        // The bidder here is always an AI club (only the user's own club can call `respondToBid`,
        // and there's exactly one human-controlled club in this build — `bid.sellingClubId ===
        // club.id` above already proves it) — resolve its reaction to the counter immediately via
        // the same 1.15x-or-withdraw threshold `aiClubs.ts`'s own bidding uses (ticket 17), rather
        // than leaving the Bid `countered` forever with no AI turn to act on it.
        yield* resolveAiCounterOffer(bidId, bid.biddingClubId, seasonRow.seasonNumber);
      } else {
        yield* completeTransfer({
          playerId: bid.playerId,
          sellingClubId: bid.sellingClubId,
          biddingClubId: bid.biddingClubId,
          amount: bid.amount,
          seasonNumber: seasonRow.seasonNumber,
        });
        yield* sql`UPDATE bids SET status = 'accepted' WHERE id = ${bidId}`;
      }

      return yield* buildTransfersScreenView(club);
    }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped),
  );

/** The bidding club's side of the Bid flow after a counter-offer: accept (completes the transfer
 * at `bid.counterAmount`) or withdraw. Withdrawing is also allowed before the seller has responded
 * (`status: "pending"`). */
export const respondAsBidder = (
  savesDir: string,
  saveId: SaveId,
  bidId: BidId,
  action: "accept" | "withdraw",
) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      yield* assertSaveNotArchived(saveId);
      const sql = yield* SqlClient;
      const club = yield* loadUserClub;
      const seasonRow = yield* loadSeasonRow;
      const bid = yield* loadBidRow(bidId);
      if (!bid) {
        return yield* new BidNotFoundError({ bidId });
      }
      if (bid.biddingClubId !== club.id) {
        return yield* new InvalidBidActionError({ reason: "this Bid isn't one of yours" });
      }

      if (action === "withdraw") {
        if (bid.status !== "pending" && bid.status !== "countered") {
          return yield* new InvalidBidActionError({ reason: `Bid is ${bid.status}, nothing left to withdraw` });
        }
        yield* sql`UPDATE bids SET status = 'withdrawn' WHERE id = ${bidId}`;
        return yield* buildTransfersScreenView(club);
      }

      if (bid.status !== "countered" || bid.counterAmount === null) {
        return yield* new InvalidBidActionError({ reason: "there's no counter-offer to accept on this Bid" });
      }
      if (!isWindowOpen(seasonRow.phase)) {
        return yield* new TransferWindowClosedError({ saveId });
      }

      yield* completeTransfer({
        playerId: bid.playerId,
        sellingClubId: bid.sellingClubId,
        biddingClubId: bid.biddingClubId,
        amount: bid.counterAmount,
        seasonNumber: seasonRow.seasonNumber,
      });
      yield* sql`UPDATE bids SET status = 'accepted' WHERE id = ${bidId}`;

      return yield* buildTransfersScreenView(club);
    }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped),
  );

/** Signing a Free Agent: same Sign flow as any Contract, at Credits 0 and with no Bid step
 * (ticket 05/16 — expiry produces a Free Agent, signable by any club). */
export const signFreeAgent = (savesDir: string, saveId: SaveId, playerId: PlayerId, years: number | undefined) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      yield* assertSaveNotArchived(saveId);
      const sql = yield* SqlClient;
      const club = yield* loadUserClub;
      const seasonRow = yield* loadSeasonRow;
      if (!isWindowOpen(seasonRow.phase)) {
        return yield* new TransferWindowClosedError({ saveId });
      }

      const player = yield* loadPlayerEcon(playerId);
      if (!player) {
        return yield* new PlayerNotFoundError({ playerId });
      }
      if (player.clubId !== null) {
        return yield* new PlayerNotFreeAgentError({ playerId });
      }

      const wage = weeklyWage(player.overallRating, player.age, player.potentialAbility);
      const budget = yield* loadClubBudgetRow(club.id);
      const wageUsed = yield* loadWageBudgetUsed(club.id);
      if (wageUsed + wage > budget.wageBudget) {
        return yield* new WageBudgetExceededError({
          clubId: club.id,
          wage,
          wageBudgetUsed: wageUsed,
          wageBudget: budget.wageBudget,
        });
      }

      const contractYears = clampYears(years);
      yield* sql`UPDATE players SET club_id = ${club.id} WHERE id = ${playerId}`;
      yield* recordTransfer({ playerId, fromClubId: null, toClubId: club.id, fee: 0 });
      yield* sql`INSERT INTO contracts (player_id, wage, years_remaining, signed_season)
        VALUES (${playerId}, ${wage}, ${contractYears}, ${seasonRow.seasonNumber})`;

      yield* appendHumanClubEvents(club.id, [
        { tag: "PlayerSigned", payload: { playerId, wage, years: contractYears } },
      ]);

      return yield* buildTransfersScreenView(club);
    }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped),
  );

/** Renewal reuses the signing flow against the player's current club during an open Transfer
 * Window (ticket 05/16) — same formula wage, a fresh 1-5 year length. */
export const renewContract = (savesDir: string, saveId: SaveId, playerId: PlayerId, years: number | undefined) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
      yield* assertSaveNotArchived(saveId);
      const sql = yield* SqlClient;
      const club = yield* loadUserClub;
      const seasonRow = yield* loadSeasonRow;
      if (!isWindowOpen(seasonRow.phase)) {
        return yield* new TransferWindowClosedError({ saveId });
      }

      const player = yield* loadPlayerEcon(playerId);
      if (!player) {
        return yield* new PlayerNotFoundError({ playerId });
      }
      if (player.clubId !== club.id) {
        return yield* new InvalidBidActionError({ reason: "player is not contracted to your club" });
      }

      const wage = weeklyWage(player.overallRating, player.age, player.potentialAbility);
      const budget = yield* loadClubBudgetRow(club.id);
      const wageUsed = yield* loadWageBudgetUsed(club.id);
      const wageUsedWithoutThisPlayer = Math.max(0, wageUsed - (yield* currentWage(playerId)));
      if (wageUsedWithoutThisPlayer + wage > budget.wageBudget) {
        return yield* new WageBudgetExceededError({
          clubId: club.id,
          wage,
          wageBudgetUsed: wageUsedWithoutThisPlayer,
          wageBudget: budget.wageBudget,
        });
      }

      const contractYears = clampYears(years);
      yield* sql`UPDATE contracts SET wage = ${wage}, years_remaining = ${contractYears}, signed_season = ${seasonRow.seasonNumber} WHERE player_id = ${playerId}`;

      yield* appendHumanClubEvents(club.id, [
        { tag: "ContractRenewed", payload: { playerId, wage, years: contractYears } },
      ]);

      return yield* buildTransfersScreenView(club);
    }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped),
  );

const currentWage = (playerId: PlayerId) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{ wage: number }>`SELECT wage FROM contracts WHERE player_id = ${playerId}`;
    return rows[0]?.wage ?? 0;
  });
