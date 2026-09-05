import { Schema } from "effect";

import { ClubId, MatchId, PlayerId } from "./ids.js";
import { Tactic } from "./tactics.js";

export class MatchNotFoundError extends Schema.TaggedError<MatchNotFoundError>()("MatchNotFoundError", {
  matchId: MatchId,
}) {}

/** A Match Decider stream is keyed by a fresh matchId (ADR-0007); ticket 15's fixture list exists
 * separately, so `startMatch` (ticket 13) lets the player pick any other club as a stand-in
 * opponent for a manual friendly — see `listOpponentClubs`. */
export class MatchSummary extends Schema.Class<MatchSummary>("MatchSummary")({
  matchId: MatchId,
  homeClubId: ClubId,
  homeClubName: Schema.String,
  awayClubId: ClubId,
  awayClubName: Schema.String,
}) {}

/** One rendered Commentary Line (ADR-0008) — minute is a separate field, never baked into `text`. */
export class CommentaryLineView extends Schema.Class<CommentaryLineView>("CommentaryLineView")({
  minute: Schema.Finite,
  tag: Schema.String,
  text: Schema.String,
}) {}

/** Per-club substitution cap status (ticket 14: 5 subs / 3 windows, halftime doesn't count as a
 * window — see `computeSubstitutionStatus` in `apps/desktop/src/main/match/view.ts`) — lets the UI
 * disable the substitution control and show subs used/remaining without guessing at the engine's
 * cap enforcement (which otherwise just silently no-ops an over-cap `MakeSubstitution`). */
export class SubstitutionStatusView extends Schema.Class<SubstitutionStatusView>("SubstitutionStatusView")({
  used: Schema.Finite,
  remaining: Schema.Finite,
  windowsUsed: Schema.Finite,
  windowsRemaining: Schema.Finite,
  capReached: Schema.Boolean,
}) {}

/** A typed `Injury` Match Event, so the renderer's commentary/indicators and the no-subs prompts
 * consume the same typed data the engine emits (ticket 08/07) — no separate representation. */
export class InjuryView extends Schema.Class<InjuryView>("InjuryView")({
  minute: Schema.Finite,
  teamClubId: ClubId,
  playerId: PlayerId,
  trigger: Schema.Literals(["contact", "non-contact"]),
  severity: Schema.Literals(["light", "medium", "severe"]),
  tier: Schema.Literals(["orange", "red"]),
  type: Schema.Literals(["brokenToe", "twistedAnkle", "deadLeg", "hamstring", "calf", "strain"]),
}) {}

/** `ResumeSimulation`'s response (ADR-0007 chunked resimulation, no RPC streaming): the next chunk
 * of already-rendered Commentary Lines after `cursor`, the new cursor, and whether the match has
 * reached `FullTimeWhistle`. `homeSubs`/`awaySubs` and `injuredClubIds` are ticket 14 additions —
 * `injuredClubIds` lists the clubs (deduplicated) that had an `Injury` Match Event land in *this*
 * chunk, so the renderer can prompt an immediate substitution. `injuries` (ticket 08) carries the
 * full typed detail of each `Injury` in this chunk for severity-scaled indicators/prompts. */
export class ResumeSimulationView extends Schema.Class<ResumeSimulationView>("ResumeSimulationView")({
  matchId: MatchId,
  cursor: Schema.Finite,
  isComplete: Schema.Boolean,
  homeScore: Schema.Finite,
  awayScore: Schema.Finite,
  lines: Schema.Array(CommentaryLineView),
  homeSubs: SubstitutionStatusView,
  awaySubs: SubstitutionStatusView,
  injuredClubIds: Schema.Array(Schema.String),
  injuries: Schema.Array(InjuryView),
  /** On-pitch head-counts for both clubs as of this chunk (ticket 11) — a value below 11 means
   * the team is playing with 10 (an empty slot / forced-off), surfacing the no-subs fallback. */
  homeOnPitchCount: Schema.Finite,
  awayOnPitchCount: Schema.Finite,
  /** Per-player Condition (%) at full time, keyed by playerId across both teams (ticket 02). */
  conditions: Schema.Record(Schema.String, Schema.Finite),
}) {}

/** `SubmitMatchCommand` (ticket 14) payload shapes — structurally identical to game-engine's
 * `ChangeTacticsCommand`/`MakeSubstitutionCommand` (`packages/game-engine/src/match/commands.ts`),
 * duplicated here rather than imported so `@cm-clone/contracts` stays decoupled from
 * `@cm-clone/game-engine` (same rationale as `MatchTactic` aliasing `Tactic` the other way). */
export class ChangeTacticsCommandPayload extends Schema.Class<ChangeTacticsCommandPayload>(
  "ChangeTacticsCommandPayload",
)({
  _tag: Schema.Literal("ChangeTactics"),
  clubId: ClubId,
  tactic: Tactic,
}) {}

export class MakeSubstitutionCommandPayload extends Schema.Class<MakeSubstitutionCommandPayload>(
  "MakeSubstitutionCommandPayload",
)({
  _tag: Schema.Literal("MakeSubstitution"),
  clubId: ClubId,
  outPlayerId: PlayerId,
  inPlayerId: PlayerId,
}) {}

/** `ForceOff` (ticket 11): manager drags an on-pitch player off to 10 men (no-subs bring-off) —
 * structurally identical to game-engine's `ForceOffCommand` (`packages/game-engine/src/match/
 * commands.ts`), duplicated here to keep `@cm-clone/contracts` decoupled from `@cm-clone/game-engine`. */
export class ForceOffCommandPayload extends Schema.Class<ForceOffCommandPayload>("ForceOffCommandPayload")({
  _tag: Schema.Literal("ForceOff"),
  clubId: ClubId,
  playerId: PlayerId,
}) {}

export const MatchCommandPayload = Schema.Union([
  ChangeTacticsCommandPayload,
  MakeSubstitutionCommandPayload,
  ForceOffCommandPayload,
]);
