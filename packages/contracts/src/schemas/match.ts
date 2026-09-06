import { Schema } from "effect";

import { ClubId, FixtureId, MatchId, PlayerId } from "./ids.js";
import { ReadinessBlockerView } from "./season.js";
import { Tactic } from "./tactics.js";

export class MatchNotFoundError extends Schema.TaggedError<MatchNotFoundError>()("MatchNotFoundError", {
  matchId: MatchId,
}) {}

/**
 * The match the player is about to watch, or is already watching.
 *
 * Keyed on the Fixture rather than on a fresh id: every match the human plays is one the Calendar
 * scheduled, so the stream and the Fixture are one identity. The home and away clubs come from the
 * Fixture too — the player does not choose an opponent and is not automatically seated at home.
 */
export class MatchSummary extends Schema.Class<MatchSummary>("MatchSummary")({
  matchId: MatchId,
  fixtureId: FixtureId,
  homeClubId: ClubId,
  homeClubName: Schema.String,
  awayClubId: ClubId,
  awayClubName: Schema.String,
  /** Whether the human club is the home side, taken from the Fixture. */
  isHome: Schema.Boolean,
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

// ---------------------------------------------------------------------------
// The pre-match boundary: starting the scheduled Fixture, and committing it
// ---------------------------------------------------------------------------

/**
 * How the player consumes their Fixture. Both modes run the same authoritative simulation over the
 * same persisted stream and differ only in whether the timeline is revealed as it happens.
 *
 * `quick` is not a lightweight, simplified or approximate simulation. It runs the real match with
 * an empty command journal and skips the live reveal, and the resulting match stays as inspectable
 * afterwards as a watched one. Quick result means *do not make me watch this now*, never *discard
 * this match's history*.
 */
export const MATCH_MODES = ["play", "quick"] as const;
export const MatchModeSchema = Schema.Literals(MATCH_MODES);
export type MatchMode = (typeof MATCH_MODES)[number];

/**
 * The requested Fixture is not the one the Calendar is standing at.
 *
 * A client that has drifted — a stale window, a replayed request — must not be able to start some
 * other Fixture, so the pending Fixture is confirmed in the same transaction that starts the match
 * rather than trusted from the payload.
 */
export class FixtureNotPendingError extends Schema.TaggedError<FixtureNotPendingError>()(
  "FixtureNotPendingError",
  { fixtureId: FixtureId },
) {}

/**
 * The pending Fixture already has a started match stream.
 *
 * Once `MatchStarted` exists the seed and both teams' setups are frozen and authoritative, so a
 * second start would either fork the match or silently re-roll it. Returning to Match day resumes;
 * it does not restart.
 */
export class MatchAlreadyStartedError extends Schema.TaggedError<MatchAlreadyStartedError>()(
  "MatchAlreadyStartedError",
  { fixtureId: FixtureId, matchId: MatchId },
) {}

/**
 * Play or Quick result was requested while required preparation is absent or structurally invalid.
 *
 * The blockers travel with the refusal so the caller can state them and route to the fix. The
 * renderer's disabled control is a convenience; this is the integrity boundary, and it recomputes
 * readiness rather than trusting what the client last saw.
 */
export class MatchNotReadyError extends Schema.TaggedError<MatchNotReadyError>()("MatchNotReadyError", {
  fixtureId: FixtureId,
  blockers: Schema.Array(ReadinessBlockerView),
}) {}

/** A club arrived at kickoff with no persisted Tactic. Loud by design: the fallback that used to
 *  paper over this is what let the human's club play a machine-picked formation unnoticed. */
export class TacticMissingError extends Schema.TaggedError<TacticMissingError>()("TacticMissingError", {
  clubId: ClubId,
}) {}

/** The Matchday cannot commit because Play or Quick result was never accepted for its Fixture. */
export class MatchNotStartedError extends Schema.TaggedError<MatchNotStartedError>()(
  "MatchNotStartedError",
  { fixtureId: FixtureId },
) {}

/** The Matchday cannot commit because the human's match has not reached full time. */
export class MatchNotCompleteError extends Schema.TaggedError<MatchNotCompleteError>()(
  "MatchNotCompleteError",
  { matchId: MatchId },
) {}

/**
 * What committing the Matchday did.
 *
 * `alreadyCommitted` is the idempotent path: the Fixture was already played, so this call wrote
 * nothing and is reporting the first call's result. Both outcomes carry the same score, because a
 * repeated commit must never produce a different one.
 */
export class CommitMatchdayResult extends Schema.Class<CommitMatchdayResult>("CommitMatchdayResult")({
  fixtureId: FixtureId,
  alreadyCommitted: Schema.Boolean,
  homeClubId: ClubId,
  awayClubId: ClubId,
  homeGoals: Schema.Finite,
  awayGoals: Schema.Finite,
  /** The rest of the Matchday, resolved in the same transaction as the human's result. */
  otherFixturesResolved: Schema.Finite,
  /** True when this Matchday was the season's last and the conclusion ran inside this commit. */
  seasonConcluded: Schema.Boolean,
}) {}
