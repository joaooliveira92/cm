import { randomUUID } from "node:crypto";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  BidNotFoundError,
  BidView,
  ClubSummary,
  InsufficientTransferBudgetError,
  InvalidBidActionError,
  MarketPlayerView,
  PlayerNotFoundError,
  PlayerNotFreeAgentError,
  SaveNotFoundError,
  SeasonView,
  TransferWindowClosedError,
  TransfersScreenView,
  WageBudgetExceededError,
} from "@cm-clone/contracts";
import {
  AI_ACCEPT_BID_MULTIPLIER,
  AI_COUNTER_TARGET_MULTIPLIER,
  AI_REJECT_BID_MULTIPLIER,
  ALL_ATTRIBUTES,
  DEFAULT_CONTRACT_YEARS,
  MAX_CONTRACT_YEARS,
  MIN_CONTRACT_YEARS,
  POSITIONS,
  TRANSFER_BUDGET_BY_TIER,
  WAGE_BUDGET_BY_TIER,
  overallRating,
  transferValue,
  weeklyWage,
  type PlayerAttributes,
  type PlayerPosition,
  type StatureTier,
} from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { appendStreamEvents, nextStreamSeq } from "./decider.js";
import { loadUserClub } from "./squad.js";

type BidStatus = "pending" | "countered" | "accepted" | "rejected" | "withdrawn";

// ---------------------------------------------------------------------------
// Shared save-file plumbing (mirrors season.ts/tactics.ts's private helper)
// ---------------------------------------------------------------------------

const withExistingSave = <A, E>(
  savesDir: string,
  saveId: string,
  onFound: (filename: string) => Effect.Effect<A, E>,
) =>
  Effect.gen(function* () {
    const filename = path.join(savesDir, `${saveId}.sqlite`);
    const exists = yield* Effect.promise(() =>
      readdir(savesDir).then((entries) => entries.includes(`${saveId}.sqlite`)),
    );
    if (!exists) {
      return yield* new SaveNotFoundError({ id: saveId });
    }
    return yield* onFound(filename);
  });

interface SeasonRow {
  readonly seasonNumber: number;
  readonly currentMatchday: number;
  readonly phase: "pre_season" | "in_season" | "mid_window_open" | "season_complete";
}

const loadSeasonRow = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const rows = yield* sql<{
    seasonNumber: number;
    currentMatchday: number;
    phase: SeasonRow["phase"];
  }>`SELECT season_number as "seasonNumber", current_matchday as "currentMatchday", phase FROM season LIMIT 1`;
  return rows[0]!;
});

const toSeasonView = (row: SeasonRow) =>
  new SeasonView({ seasonNumber: row.seasonNumber, currentMatchday: row.currentMatchday, phase: row.phase });

/** Transfer commands are legal only inside an open Transfer Window: pre-season (before Matchday 1)
 * or the mid-season window (Matchday 19 -> 20), per ADR-0004/ticket 15's `season.phase`. */
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
  readonly id: string;
  readonly clubId: string | null;
  readonly clubName: string | null;
  readonly firstName: string;
  readonly lastName: string;
  readonly dateOfBirth: string;
  readonly potentialAbility: number;
  readonly [attribute: string]: unknown;
}

interface PlayerEcon {
  readonly id: string;
  readonly clubId: string | null;
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
 * the wage/Transfer Value formulas used by Bid/Sign/Renew commands. */
const loadAllPlayersEcon = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const playerRows = yield* sql.unsafe<PlayerEconRow>(
    `SELECT p.id, p.club_id as "clubId", c.name as "clubName", p.first_name as "firstName", p.last_name as "lastName",
            p.date_of_birth as "dateOfBirth", p.potential_ability as "potentialAbility", ${attributeSelectList("p.")}
     FROM players p LEFT JOIN clubs c ON c.id = p.club_id`,
    [],
  );
  const positionRows = yield* sql<{
    playerId: string;
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
      clubName: row.clubName,
      firstName: row.firstName,
      lastName: row.lastName,
      age: ageFromDateOfBirth(row.dateOfBirth),
      overallRating: overallRating(attributes, positions),
      potentialAbility: row.potentialAbility,
      positions,
    };
  });
});

const loadPlayerEcon = (playerId: string) =>
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

const loadClubBudgetRow = (clubId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<ClubBudgetRow>`SELECT transfer_budget_remaining as "transferBudgetRemaining",
      wage_budget as "wageBudget" FROM club_budgets WHERE club_id = ${clubId}`;
    return rows[0]!;
  });

const loadWageBudgetUsed = (clubId: string) =>
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
export const initializeSeasonEconomy = (seasonNumber: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const clubRows = yield* sql<{
      id: string;
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
      const years = 1 + Math.floor(Math.random() * 3);
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
  const expiredRows = yield* sql<{ playerId: string }>`SELECT player_id as "playerId" FROM contracts WHERE years_remaining <= 0`;
  for (const row of expiredRows) {
    yield* sql`UPDATE players SET club_id = NULL WHERE id = ${row.playerId}`;
  }
  yield* sql`DELETE FROM contracts WHERE years_remaining <= 0`;
});

// ---------------------------------------------------------------------------
// Bids (ticket 16 / ADR-0005)
// ---------------------------------------------------------------------------

interface BidRow {
  readonly id: string;
  readonly playerId: string;
  readonly sellingClubId: string;
  readonly biddingClubId: string;
  readonly amount: number;
  readonly counterAmount: number | null;
  readonly status: BidStatus;
  readonly seasonNumber: number;
}

const loadBidRow = (bidId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<BidRow>`SELECT id, player_id as "playerId", selling_club_id as "sellingClubId",
      bidding_club_id as "biddingClubId", amount, counter_amount as "counterAmount", status,
      season_number as "seasonNumber" FROM bids WHERE id = ${bidId}`;
    return rows[0] ?? null;
  });

const loadBidsForClub = (clubId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{
      id: string;
      playerId: string;
      playerFirstName: string;
      playerLastName: string;
      sellingClubId: string;
      sellingClubName: string;
      biddingClubId: string;
      biddingClubName: string;
      amount: number;
      counterAmount: number | null;
      status: BidStatus;
    }>`SELECT b.id, b.player_id as "playerId", p.first_name as "playerFirstName", p.last_name as "playerLastName",
              b.selling_club_id as "sellingClubId", sc.name as "sellingClubName",
              b.bidding_club_id as "biddingClubId", bc.name as "biddingClubName",
              b.amount, b.counter_amount as "counterAmount", b.status
       FROM bids b
       JOIN players p ON p.id = b.player_id
       JOIN clubs sc ON sc.id = b.selling_club_id
       JOIN clubs bc ON bc.id = b.bidding_club_id
       WHERE b.selling_club_id = ${clubId} OR b.bidding_club_id = ${clubId}
       ORDER BY b.created_at DESC`;

    const views = rows.map(
      (row) =>
        new BidView({
          id: row.id,
          playerId: row.playerId,
          playerName: `${row.playerFirstName} ${row.playerLastName}`,
          sellingClubId: row.sellingClubId,
          sellingClubName: row.sellingClubName,
          biddingClubId: row.biddingClubId,
          biddingClubName: row.biddingClubName,
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
const completeTransfer = (params: {
  readonly playerId: string;
  readonly sellingClubId: string;
  readonly biddingClubId: string;
  readonly amount: number;
  readonly seasonNumber: number;
}) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
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
    yield* sql`DELETE FROM contracts WHERE player_id = ${params.playerId}`;
    yield* sql`INSERT INTO contracts (player_id, wage, years_remaining, signed_season)
      VALUES (${params.playerId}, ${wage}, ${DEFAULT_CONTRACT_YEARS}, ${params.seasonNumber})`;

    yield* sql`UPDATE club_budgets SET transfer_budget_remaining = transfer_budget_remaining - ${params.amount} WHERE club_id = ${params.biddingClubId}`;
    yield* sql`UPDATE club_budgets SET transfer_budget_remaining = transfer_budget_remaining + ${params.amount} WHERE club_id = ${params.sellingClubId}`;

    const sellerSeq = yield* nextStreamSeq("club", params.sellingClubId);
    yield* appendStreamEvents("club", params.sellingClubId, sellerSeq, [
      {
        tag: "PlayerTransferredOut",
        payload: { playerId: params.playerId, toClubId: params.biddingClubId, amount: params.amount },
      },
    ]);
    const buyerSeq = yield* nextStreamSeq("club", params.biddingClubId);
    yield* appendStreamEvents("club", params.biddingClubId, buyerSeq, [
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

export const getTransfersScreen = (savesDir: string, saveId: string) =>
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
 * ADR-0005's fixed multipliers. Every selling club in this build is AI-controlled — the user only
 * ever plays the buying side of `placeBid` (there's no second human to wait on) — so this stands
 * in for the "AI-club selling" behavior ADR-0005 specifies: accept >=1.0x outright, counter at
 * exactly Transfer Value for 0.85x-1.0x, reject outright below 0.85x. Pure and exported for direct
 * unit testing, independent of the DB.
 */
export const decideAiSellerResponse = (
  amount: number,
  value: number,
): { readonly action: "accept" | "counter" | "reject"; readonly counterAmount: number | null } => {
  if (amount >= value * AI_ACCEPT_BID_MULTIPLIER) {
    return { action: "accept", counterAmount: null };
  }
  if (amount >= value * AI_REJECT_BID_MULTIPLIER) {
    return { action: "counter", counterAmount: Math.round(value * AI_COUNTER_TARGET_MULTIPLIER) };
  }
  return { action: "reject", counterAmount: null };
};

/** Any player is biddable regardless of a Listed flag (ticket 05: not modeled at all — no gate to
 * bypass). A Bid is legal only during an open Transfer Window. The selling club (always an
 * AI-controlled club in this build) responds instantly via `decideAiSellerResponse`, since there's
 * no human on the other side to await — the resulting Bid can come back `accepted` (the transfer
 * completes immediately), `countered` (the user then calls `respondAsBidder`), or `rejected`. */
export const placeBid = (savesDir: string, saveId: string, playerId: string, amount: number) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
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

      const id = randomUUID();
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
  saveId: string,
  bidId: string,
  action: "accept" | "reject" | "counter",
  counterAmount: number | undefined,
) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
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
      if (!isWindowOpen(seasonRow.phase)) {
        return yield* new TransferWindowClosedError({ saveId });
      }

      if (action === "reject") {
        yield* sql`UPDATE bids SET status = 'rejected' WHERE id = ${bidId}`;
      } else if (action === "counter") {
        if (counterAmount === undefined || counterAmount <= 0) {
          return yield* new InvalidBidActionError({ reason: "a counter-offer needs a positive counterAmount" });
        }
        yield* sql`UPDATE bids SET status = 'countered', counter_amount = ${counterAmount} WHERE id = ${bidId}`;
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
  saveId: string,
  bidId: string,
  action: "accept" | "withdraw",
) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
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
export const signFreeAgent = (savesDir: string, saveId: string, playerId: string, years: number | undefined) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
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
      yield* sql`INSERT INTO contracts (player_id, wage, years_remaining, signed_season)
        VALUES (${playerId}, ${wage}, ${contractYears}, ${seasonRow.seasonNumber})`;

      const seq = yield* nextStreamSeq("club", club.id);
      yield* appendStreamEvents("club", club.id, seq, [
        { tag: "PlayerSigned", payload: { playerId, wage, years: contractYears } },
      ]);

      return yield* buildTransfersScreenView(club);
    }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped),
  );

/** Renewal reuses the signing flow against the player's current club during an open Transfer
 * Window (ticket 05/16) — same formula wage, a fresh 1-5 year length. */
export const renewContract = (savesDir: string, saveId: string, playerId: string, years: number | undefined) =>
  withExistingSave(savesDir, saveId, (filename) =>
    Effect.gen(function* () {
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

      const seq = yield* nextStreamSeq("club", club.id);
      yield* appendStreamEvents("club", club.id, seq, [
        { tag: "ContractRenewed", payload: { playerId, wage, years: contractYears } },
      ]);

      return yield* buildTransfersScreenView(club);
    }).pipe(Effect.provide(SqliteClient.layer({ filename })), Effect.scoped),
  );

const currentWage = (playerId: string) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const rows = yield* sql<{ wage: number }>`SELECT wage FROM contracts WHERE player_id = ${playerId}`;
    return rows[0]?.wage ?? 0;
  });
