/**
 * Tactical Adapter: the single boundary between tactical vocabulary and the simulation loop.
 *
 * Owns the two resolution functions that turn team-level tactical instructions into the flat
 * numeric modifiers and multipliers the engine consumes. The simulation loop reads tactical
 * state through the {@link TacticalState} interface instead of accessing raw team state fields,
 * and uses {@link reconcileTacticalChange} to apply AI-driven tactical changes.
 *
 * The adapter is the loop's entry point for all tactical resolution. Production code reads
 * shared rules via the functions in `tactical-modifiers.ts`; tests swap the adapter for a stub.
 */

import type { ClubId, PlayerId } from "@cm-clone/contracts";
import type { TeamInstructions } from "@cm-clone/shared";
import type { MatchPlayerInput, MatchTactic } from "../types.js";
import type { TeamBehaviourModifiers } from "../resolveBehaviourVectors.js";
import type { TacticalDecision } from "../aiController.js";
import {
  resolveTeamInstructions,
  resolveTeamModifiers,
  resolveTeamTactics,
  type ResolvedInstructions,
  type ResolvedTeamTactics,
} from "../tactical-modifiers.js";

// The adapter re-exports the full resolution entry point so the loop imports
// tactical services from one place.
export { resolveTeamTactics, resolveTeamInstructions, resolveTeamModifiers };
export type { ResolvedInstructions, ResolvedTeamTactics };

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * Narrow tactical view that the simulation loop reads instead of accessing
 * `TeamRuntimeState` fields directly. The adapter owns how the view is constructed
 * and how changes are reconciled.
 */
export interface TacticalState {
  readonly clubId: ClubId;
  readonly mentality: TeamInstructions["mentality"];
  readonly menBehindTheBall: boolean;
  readonly teamInstructions: TeamInstructions;
  readonly playersById: ReadonlyMap<PlayerId, MatchPlayerInput>;
  readonly teamModifiers: TeamBehaviourModifiers;
  readonly instructions: ResolvedInstructions;
  readonly slotCount: number;
}

/**
 * A lightweight tactical change an AI controller can request, without needing to
 * construct a full MatchTactic. The adapter re-resolves the team-level modifiers
 * and instruction multipliers from the change alone.
 */
export interface AiTacticalChange {
  mentality?: TeamInstructions["mentality"];
  teamOverrides?: Partial<Pick<TeamInstructions, "menBehindTheBall">>;
}

// ─── Loop integration ───────────────────────────────────────────────────────

/**
 * Resolve a full tactic from the loop's perspective — the single entry point the
 * simulation loop uses for kickoff and live ChangeTactics commands.
 * Returns a complete {@link TacticalState} the loop reads instead of accessing
 * raw team state fields.
 */
export const resolveFromTactic = (
  tactic: MatchTactic,
  playersById: ReadonlyMap<PlayerId, MatchPlayerInput>,
  clubId: ClubId,
): TacticalState => {
  const resolved = resolveTeamTactics(tactic, playersById);
  return viewTacticalState(
    clubId, tactic.team, playersById,
    resolved.teamModifiers, resolved.instructions, resolved.slots.length,
  );
};

/**
 * Apply an AI-driven tactical change to a {@link TacticalState} and return the
 * new resolved values the loop writes back to the team's runtime state.
 *
 * Returns `null` when nothing changed — no re-resolution needed.
 */
export const reconcileTacticalChange = (
  state: TacticalState,
  change: AiTacticalChange,
): {
  readonly teamInstructions: TeamInstructions;
  readonly teamModifiers: TeamBehaviourModifiers;
  readonly instructions: ResolvedInstructions;
} | null => {
  let newInstructions = state.teamInstructions;
  let changed = false;

  if (change.mentality) {
    newInstructions = { ...newInstructions, mentality: change.mentality };
    changed = true;
  }
  if (change.teamOverrides) {
    newInstructions = { ...newInstructions, ...change.teamOverrides };
    changed = true;
  }

  if (!changed) return null;

  return {
    teamInstructions: newInstructions,
    teamModifiers: resolveTeamModifiers(newInstructions),
    instructions: resolveTeamInstructions({ team: newInstructions }),
  };
};

/**
 * Apply an AI controller's {@link TacticalDecision} to a {@link TacticalState}.
 * Flatter API than {@link reconcileTacticalChange} — the controller returns a
 * decision struct, not an `AiTacticalChange` with nested overrides.
 *
 * Returns `null` when nothing changed.
 */
export const reconcileTacticalDecision = (
  state: TacticalState,
  decision: TacticalDecision,
): {
  readonly teamInstructions: TeamInstructions;
  readonly teamModifiers: TeamBehaviourModifiers;
  readonly instructions: ResolvedInstructions;
} | null => {
  let newInstructions = state.teamInstructions;
  let changed = false;

  if (decision.mentality) {
    newInstructions = { ...newInstructions, mentality: decision.mentality };
    changed = true;
  }
  if (decision.menBehindTheBall !== undefined) {
    newInstructions = { ...newInstructions, menBehindTheBall: decision.menBehindTheBall };
    changed = true;
  }

  if (!changed) return null;

  return {
    teamInstructions: newInstructions,
    teamModifiers: resolveTeamModifiers(newInstructions),
    instructions: resolveTeamInstructions({ team: newInstructions }),
  };
};

/**
 * Produce a {@link TacticalState} view from a team's runtime state.
 * The loop uses this to read tactical fields without coupling to
 * the concrete `TeamRuntimeState` shape.
 */
export const viewTacticalState = (
  clubId: ClubId,
  teamInstructions: TeamInstructions,
  playersById: ReadonlyMap<PlayerId, MatchPlayerInput>,
  teamModifiers: TeamBehaviourModifiers,
  instructions: ResolvedInstructions,
  slotCount: number,
): TacticalState => ({
  clubId,
  mentality: teamInstructions.mentality,
  menBehindTheBall: teamInstructions.menBehindTheBall,
  teamInstructions,
  playersById,
  teamModifiers,
  instructions,
  slotCount,
});