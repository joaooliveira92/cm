import { Tactic, type ClubId, type PlayerId } from "@cm-clone/contracts";
import {
  FORMATIONS,
  FORMATION_SLOTS,
  POSITIONS,
  POSITION_ROLES,
  selectBestFormationXI,
  transferValue,
  weeklyWage,
  type Formation,
  type Position,
  type PositionRatingsLike,
} from "@cm-clone/shared";
import { Data, Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { loadSquadPlayers } from "./squad.js";
import { persistTactic, validateTactic } from "./tactics.js";
import { aiPlaceBid, aiSignFreeAgent, loadAllPlayersEcon, loadClubBudgetRow, loadWageBudgetUsed } from "./transfers.js";

// ---------------------------------------------------------------------------
// Domain errors
// ---------------------------------------------------------------------------

/** Raised when a squad has fewer players than a Formation's fixed slot count — the greedy best-XI
 * fill cannot field the Formation. */
export class SquadTooSmallError extends Data.TaggedError("SquadTooSmallError")<{
  readonly formation: Formation;
  readonly slots: number;
  readonly squadSize: number;
}> {}

// ---------------------------------------------------------------------------
// AI Tactic assignment (ticket 17 / ADR-0005): one fixed Tactic per AI club, chosen once at
// Season start by best-fit against the squad's own Position Ratings, never touched again.
//
// The core best-XI algorithm lives in `packages/shared/src/bestXi.ts` (`selectBestFormationXI`).
// This module owns the Effect-level squad-size wrapper, `SquadTooSmallError`, and Tactic
// construction — the thinnest possible seam (ADR-0005, ticket 01a).
// ---------------------------------------------------------------------------

/**
 * Best-fit Tactic for one club's squad: the Formation (among the 5 v1 Formations) maximizing
 * mean Position Rating across its 11 slots, filled greedily; roles defaulted to each slot's v1
 * Role (`POSITION_ROLES`); instructions fixed at balanced/normal/medium. Wraps the shared
 * `selectBestFormationXI` with the Effect-level `SquadTooSmallError`.
 */
export const pickBestFormationTactic = (
  squad: ReadonlyArray<PositionRatingsLike<PlayerId>>,
): Effect.Effect<Tactic, SquadTooSmallError> =>
  Effect.gen(function* () {
    const result = selectBestFormationXI(squad);
    if (result._tag === "failure") {
      // All formations failed — report the first formation's slot count for context
      return yield* new SquadTooSmallError({ formation: FORMATIONS[0], slots: FORMATION_SLOTS[FORMATIONS[0]].length, squadSize: squad.length });
    }
    return new Tactic({
      formation: result.formation,
      slots: result.slots.map((slot) => ({
        position: slot.position,
        role: POSITION_ROLES[slot.position],
        playerId: slot.playerId,
      })),
      mentality: "balanced",
      tempo: "normal",
      pressing: "medium",
    });
  });

/**
 * Season-start AI Tactic assignment (ticket 17): every non-user club gets one fixed Tactic for
 * the whole Season, persisted the same way `changeTactics` persists the user's — direct in-process
 * writes via `tactics.ts`'s `persistTactic`, never through the RpcGroup. Called once from
 * `startSeason`; nothing else ever recomputes or rewrites an AI club's Tactic afterward, so "never
 * changes mid-season" holds by construction rather than needing an explicit guard. Clubs
 * processed in id order for determinism (ticket 17), though tactic assignment is per-club
 * independent so order has no effect on the outcome — kept for consistency with the transfer-
 * window orchestration below, where order does matter.
 */
export const assignAiTactics = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const clubs = yield* sql<{
    id: ClubId;
    isUserClub: number;
  }>`SELECT id, is_user_club as "isUserClub" FROM clubs ORDER BY id`;

  for (const club of clubs) {
    if (club.isUserClub === 1) continue;
    const squad = yield* loadSquadPlayers(club.id);
    // A club with no players has no formation to pick and nothing to write a tactic about. This is
    // not a Depth branch: it reads the rows, and the absence of rows *is* Depth's whole footprint
    // on disk. A results-only club and a club whose squad was deleted are the same case here.
    if (squad.length === 0) continue;
    const tactic = yield* pickBestFormationTactic(squad);
    yield* validateTactic(tactic, new Set(squad.map((player) => player.id)));
    yield* persistTactic(club.id, tactic);
  }
});

// ---------------------------------------------------------------------------
// AI transfer-window activity (ticket 17 / ADR-0005): squad-gap detection against the league
// average, then buying/signing to fix it, self-issued in-process.
// ---------------------------------------------------------------------------

/** How far below the league average a club's best Position Rating at a slot must fall before it's
 * treated as a squad gap worth fixing (ticket 17 design judgment call — neither the ticket nor
 * ADR-0005 pins a number). 90% keeps AI buying reserved for genuinely weak slots rather than
 * firing on every slot that's merely a little below average; cited here since it's this ticket's
 * call, not a formula derived elsewhere. */
const WEAK_POSITION_THRESHOLD = 0.9;

const bestRatingAtPosition = (
  squad: ReadonlyArray<{ readonly positionRatings: Record<string, number> }>,
  position: Position,
): number => (squad.length === 0 ? 0 : Math.max(...squad.map((player) => player.positionRatings[position] ?? 0)));

/**
 * League-average best Position Rating per slot, across every club's squad (ticket 17: "a per-
 * Position league average across all clubs' squads"). `squadsByClub` is one squad per club in the
 * league (every club, not just AI ones — the user's squad counts toward the average too), in any
 * order. Pure; exported for direct unit testing.
 */
export const computeLeagueAveragePositionRatings = (
  squadsByClub: ReadonlyArray<ReadonlyArray<{ readonly positionRatings: Record<string, number> }>>,
): Record<Position, number> => {
  // A club with no squad is not evidence that the league is weak at a position — it is evidence of
  // nothing, so it is left out of the average rather than counted as a zero.
  const squads = squadsByClub.filter((squad) => squad.length > 0);
  const result = {} as Record<Position, number>;
  for (const position of POSITIONS) {
    const bestPerClub = squads.map((squad) => bestRatingAtPosition(squad, position));
    result[position] = bestPerClub.length === 0 ? 0 : bestPerClub.reduce((sum, r) => sum + r, 0) / bestPerClub.length;
  }
  return result;
};

/** Positions where `squad`'s own best Position Rating falls below `WEAK_POSITION_THRESHOLD` of
 * the league average for that slot (ticket 17). Pure; exported for direct unit testing. */
export const identifyWeakPositions = (
  squad: ReadonlyArray<{ readonly positionRatings: Record<string, number> }>,
  leagueAverages: Record<Position, number>,
): ReadonlyArray<Position> =>
  POSITIONS.filter((position) => bestRatingAtPosition(squad, position) < leagueAverages[position] * WEAK_POSITION_THRESHOLD);

/**
 * AI-club transfer activity at one Transfer Window's open (ticket 17 / ADR-0005): for every AI
 * club, in club-id order (deterministic outcomes given the same starting state — ticket 17), find
 * weak Positions against the league average and, for each one, bid Transfer Value exactly on the
 * highest-Transfer-Value affordable Natural/Competent player at that Position — a Free Agent is
 * signed directly instead of bid on, since Free Agent signing has no Bid step (ADR-0005). Budget
 * and wage headroom are re-read fresh before every bid, so an earlier bid this same window (by
 * this club or an earlier one) is already reflected. One target per weak Position per window; if
 * two AI clubs would target the same player this window, the first (by club-id processing order)
 * gets it and the later club simply skips that player this window — this ticket's documented
 * simplification for concurrent-target conflicts, not a real negotiation.
 *
 * After that weakness-driven buying, a deterministic guarantee pass makes the seller side reachable:
 * because every non-human seller is resolved inline, the weakness pass alone would never leave the
 * human's own players bid on. If the window produced no pending bid on the human club, the human
 * club's strongest affordable player is bid on by the AI club (of the affordable ones) with the most
 * Wage Budget headroom, leaving a pending `BidReceived` for the manager to answer. Self-issued
 * in-process — never through the RpcGroup.
 */
export const runAiTransferWindow = (seasonNumber: number) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const clubRows = yield* sql<{
      id: ClubId;
      isUserClub: number;
    }>`SELECT id, is_user_club as "isUserClub" FROM clubs ORDER BY id`;

    const squadsByClub = new Map<ClubId, ReadonlyArray<{ readonly id: PlayerId; readonly positionRatings: Record<string, number> }>>();
    for (const club of clubRows) {
      squadsByClub.set(club.id, yield* loadSquadPlayers(club.id));
    }
    const leagueAverages = computeLeagueAveragePositionRatings([...squadsByClub.values()]);

    const allPlayers = yield* loadAllPlayersEcon;
    // Players already targeted by an earlier AI club this window — a later club skips them
    // (ticket 17's documented same-window-conflict simplification, see doc comment above).
    const targetedThisWindow = new Set<string>();

    const userClubRow = clubRows.find((club) => club.isUserClub === 1);
    const userClubId = userClubRow?.id;

    for (const club of clubRows) {
      if (club.isUserClub === 1) continue;
      const mySquad = squadsByClub.get(club.id)!;
      // No squad, no transfer activity: a results-only club has no contracts to sign into and no
      // weak position to identify. Read from the rows, never from a Depth column.
      if (mySquad.length === 0) continue;
      const weakPositions = identifyWeakPositions(mySquad, leagueAverages);

      for (const position of weakPositions) {
        const budget = yield* loadClubBudgetRow(club.id);
        const wageUsed = yield* loadWageBudgetUsed(club.id);

        const candidates = allPlayers.filter(
          (player) =>
            player.clubId !== club.id &&
            !targetedThisWindow.has(player.id) &&
            player.positions.some(
              (p) => p.position === position && (p.familiarity === "natural" || p.familiarity === "competent"),
            ),
        );

        const affordable = candidates
          .map((player) => ({
            player,
            value: transferValue(player.overallRating, player.age, player.potentialAbility),
            wage: weeklyWage(player.overallRating, player.age, player.potentialAbility),
          }))
          .filter(({ value, wage }) => value <= budget.transferBudgetRemaining && wageUsed + wage <= budget.wageBudget)
          // Highest Transfer Value first; ties broken by player id — deterministic, no unseeded
          // randomness (ticket 17).
          .sort((a, b) => b.value - a.value || a.player.id.localeCompare(b.player.id));

        const target = affordable[0];
        if (!target) continue;

        targetedThisWindow.add(target.player.id);
        if (target.player.clubId === null) {
          yield* aiSignFreeAgent(club.id, target.player.id, seasonNumber);
        } else {
          yield* aiPlaceBid(club.id, target.player.id, target.value, seasonNumber);
        }
      }
    }

    // Guarantee the seller side is reachable (incoming-bid flow): the weakness-driven buying above
    // only ever bids on clubs it can afford to prise a player away from, and it resolves every seller
    // that isn't the human inline — so left to that pass alone the manager's own players are never
    // bid on and `BidReceived` never fires for them. If no AI club has left the human a pending bid
    // this window, deterministically pick the human club's strongest player and bid on it from an AI
    // club that can actually afford the transfer — both its Transfer Budget must cover the value and
    // its Wage Budget must have headroom for the wage — so that if the manager accepts,
    // `completeTransfer`'s own affordability checks pass.
    if (userClubId) {
      const userPlayers = allPlayers
        .filter((player) => player.clubId === userClubId)
        .map((player) => ({
          player,
          value: transferValue(player.overallRating, player.age, player.potentialAbility),
          wage: weeklyWage(player.overallRating, player.age, player.potentialAbility),
        }))
        .sort((a, b) => b.value - a.value || a.player.id.localeCompare(b.player.id));

      // `status = 'pending'` is load-bearing. Counting every Bid ever sent to the human club would
      // make this guarantee fire once per career rather than once per window: the first window's Bid
      // is still on the table afterwards — answered or lapsed — so the count is never zero again.
      // What the pass is guarding against is the manager having *nothing to answer*, which is a
      // question about open Bids only.
      const existingUserBid = yield* sql<{ n: number }>`
        SELECT COUNT(*) as n FROM bids WHERE selling_club_id = ${userClubId} AND status = 'pending'`;
      if (userPlayers.length > 0 && existingUserBid[0]!.n === 0) {
        loop: for (const candidate of userPlayers) {
          // Collect every AI club that can afford the value, then pick the one with the most Wage
          // Budget headroom so that accepting the incoming bid never teeters on a knife-edge of
          // wage capacity (ties broken by club id — deterministic). Only fall through to a cheaper
          // user player if no AI club can afford this one at all.
          const affordableBuyers: Array<{ club: ClubId; headroom: number }> = [];
          for (const club of clubRows) {
            if (club.isUserClub === 1) continue;
            const budget = yield* loadClubBudgetRow(club.id);
            const wageUsed = yield* loadWageBudgetUsed(club.id);
            if (candidate.value <= budget.transferBudgetRemaining && wageUsed + candidate.wage <= budget.wageBudget) {
              affordableBuyers.push({ club: club.id, headroom: budget.wageBudget - wageUsed - candidate.wage });
            }
          }
          affordableBuyers.sort((a, b) => b.headroom - a.headroom || a.club.localeCompare(b.club));
          const buyer = affordableBuyers[0];
          if (buyer) {
            yield* aiPlaceBid(buyer.club, candidate.player.id, candidate.value, seasonNumber);
            break loop;
          }
        }
      }
    }
  });
