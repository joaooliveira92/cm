import type { ClubId, PlayerId } from "@cm-clone/contracts";
import type { PlayerAttributes, PlayerInstructions, PositionalRatings, Slot, TeamInstructions, TeamSetPieces, TakerList } from "@cm-clone/shared";
import { DEFAULT_TEAM_SET_PIECES, EMPTY_TAKERS } from "@cm-clone/shared";
import type { PerSlotBehaviour, TeamBehaviourModifiers } from "./resolveBehaviourVectors.js";

/** The takers ordered lists for each set-piece type, keyed by the list name. */
export type Takers = { readonly [K in TakerList]: ReadonlyArray<PlayerId> };

/** One starter of a match: the player, the grid cell his slot stands in, and his optional run target cell. */
export interface MatchSlot {
  readonly playerId: PlayerId;
  readonly cell: Slot;
  readonly run: Slot | null;
}

/**
 * The engine's own view of a Tactic, and all of it the engine reads: who starts in which cell, who
 * is on the bench, the team instructions, and per-slot player instructions.
 *
 * The tactic is resolved into numbers at the boundary by the resolution step;
 * the engine reads the resolved numbers only. This intermediate form carries the raw tactic
 * so resolution can re-run on a live ChangeTactics.
 */
export interface MatchTactic {
  readonly slots: ReadonlyArray<MatchSlot>;
  readonly bench: ReadonlyArray<PlayerId | null>;
  readonly team: TeamInstructions;
  readonly slotInstructions: ReadonlyArray<{ readonly cell: Slot; readonly instructions: PlayerInstructions }>;
  /** Team set-piece instructions per side (Corners, Free Kicks, Throw Ins on left and right). */
  readonly teamSetPieces: TeamSetPieces;
  /** Ordered taker lists for each set-piece type. Empty arrays when no taker is nominated. */
  readonly takers: Takers;
  /**
   * Match-time specific marking (ticket 28): maps a marker on this team (playerId) to a marked
   * opponent (playerId). The marked opponent has reduced finishing/composure share when picked
   * as finisher. Dropped at full time — only present on live tactics changes.
   */
  readonly specificMarkings?: ReadonlyMap<PlayerId, PlayerId>;
}

/** The slice of a complete Tactic the adapter reads. */
export interface CompleteTacticLike {
  readonly slots: ReadonlyArray<{ readonly cell: Slot; readonly run?: Slot | null }>;
  readonly assignments: ReadonlyArray<PlayerId>;
  readonly bench: ReadonlyArray<PlayerId | null>;
  readonly team: TeamInstructions;
  readonly slotInstructions?: ReadonlyArray<{ readonly cell: Slot; readonly instructions: PlayerInstructions }>;
  readonly teamSetPieces?: TeamSetPieces;
  readonly takers?: Takers;
}

/** The transitional adapter: a complete Tactic in, the engine's `MatchTactic` out. Preserves runs. */
export const toMatchTactic = (tactic: CompleteTacticLike): MatchTactic => ({
  slots: tactic.slots.map((slot, index) => ({
    playerId: tactic.assignments[index]!,
    cell: slot.cell,
    run: slot.run ?? null,
  })),
  bench: tactic.bench,
  team: tactic.team,
  slotInstructions: tactic.slotInstructions ?? tactic.slots.map((slot) => ({
    cell: slot.cell,
    instructions: null as unknown as PlayerInstructions,
  })),
  teamSetPieces: tactic.teamSetPieces ?? DEFAULT_TEAM_SET_PIECES,
  takers: tactic.takers ?? EMPTY_TAKERS,
});

export interface MatchPlayerInput {
  readonly id: PlayerId;
  readonly attributes: PlayerAttributes;
  /** The player's Condition (%) at kickoff — defaults to full (100) when absent. Lets a not-fully-
   *  recovered player from the previous fixture (ticket 09) start the match below full Condition. */
  readonly startingCondition?: number;
  /** The player's PositionalRatings — read for suitability scoring against the slot (formations-and-instructions). */
  readonly positionalRatings: PositionalRatings;
}

export interface MatchTeamSetup {
  readonly clubId: ClubId;
  readonly squad: ReadonlyArray<MatchPlayerInput>;
  readonly tactic: MatchTactic;
}

/** Flat multiplier/bias struct (ADR-0002/0003) — the only shape of tactics the engine consumes. */
export interface TacticalModifiers {
  readonly attack: number;
  readonly midfield: number;
  readonly defense: number;
  readonly eventOddsBias: number;
}

export interface PhaseStrengths {
  readonly attack: number;
  readonly midfield: number;
  readonly defense: number;
}

/**
 * The fully resolved numeric state for one team, produced at the tactic boundary.
 * The engine reads these numbers and never sees tactics vocabulary.
 */
export interface ResolvedTacticState {
  readonly teamModifiers: TeamBehaviourModifiers;
  readonly slotBehaviours: ReadonlyArray<PerSlotBehaviour>;
  readonly phaseStrengths: PhaseStrengths;
}