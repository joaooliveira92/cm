import { Schema } from "effect";

import { ClubId, FixtureId, MatchId, PlayerId } from "./ids.js";
import { ReadinessBlockerView } from "./season.js";
import { PositionSchema } from "./squad.js";
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
 * window — see `substitutionStatus` in `apps/desktop/src/main/match/substitutions.ts`) — lets the UI
 * disable the substitution control and show subs used/remaining without guessing at the engine's
 * cap enforcement (which otherwise just silently no-ops an over-cap `MakeSubstitution`). */
export class SubstitutionStatusView extends Schema.Class<SubstitutionStatusView>("SubstitutionStatusView")({
  used: Schema.Finite,
  remaining: Schema.Finite,
  windowsUsed: Schema.Finite,
  windowsRemaining: Schema.Finite,
  capReached: Schema.Boolean,
}) {}

/** One occupied slot of a club's shape on the pitch: the player in it and the Position the slot
 * was drawn at in the kickoff Tactic. A substitute takes the slot of the player they replace. */
export class PitchSlotView extends Schema.Class<PitchSlotView>("PitchSlotView")({
  playerId: PlayerId,
  position: PositionSchema,
}) {}

/** A club's side of the pitch as of the revealed position (group-g-match-day ticket 19): who is on
 * the pitch now, and the squad players who have not been on it, so may still come on. A red card or
 * a bring-off leaves an empty slot, so `onPitch` can hold fewer than 11. Derived by the main
 * process from the re-derived timeline under the same cut as the substitution counts, so the
 * substitution picker never offers a player the match has already taken off. */
export class MatchPitchView extends Schema.Class<MatchPitchView>("MatchPitchView")({
  onPitch: Schema.Array(PitchSlotView),
  substitutes: Schema.Array(PlayerId),
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
  /** True when a substitute came on for the injured player: the forced Substitution the engine records
   *  right after a severe Injury. False for a knock, and for a severe Injury that leaves the team a
   *  player short, including when an outfield player already on the pitch moves into goal. That move
   *  is also a Substitution line, so the line alone cannot say the player was replaced. */
  replaced: Schema.Boolean,
}) {}

/** `ResumeSimulation`'s response (ADR-0007 chunked resimulation, no RPC streaming): the next chunk
 * of already-rendered Commentary Lines after `cursor`, the new cursor, and whether the match has
 * reached `FullTimeWhistle`.
 *
 * Chunks are fetched ahead of the reveal, so the response carries two kinds of field
 * (group-g-match-day ticket 22). The match state — score, substitution counts, pitch and on-pitch
 * head-counts — is as of the Match Events the request says are revealed, never the chunk's end, so a
 * surface may show it as soon as it lands. The chunk payload — `lines`, `injuries`, `injuredClubIds`
 * — covers exactly this chunk and is buffered with it: `injuries` holds one typed entry per `Injury`
 * line of the chunk, in order (ticket 08), and the renderer acts on each only when its line is
 * revealed. Substitution counts and pitch also include every lineup command the manager has
 * journaled (ticket 18/19). */
export class ResumeSimulationView extends Schema.Class<ResumeSimulationView>("ResumeSimulationView")({
  matchId: MatchId,
  cursor: Schema.Finite,
  isComplete: Schema.Boolean,
  /** The score as of the revealed position. */
  homeScore: Schema.Finite,
  awayScore: Schema.Finite,
  lines: Schema.Array(CommentaryLineView),
  homeSubs: SubstitutionStatusView,
  awaySubs: SubstitutionStatusView,
  /** Each club's pitch as of the revealed position, cut the way `homeSubs`/`awaySubs` are. */
  homePitch: MatchPitchView,
  awayPitch: MatchPitchView,
  /** The clubs (deduplicated) with an `Injury` in this chunk. */
  injuredClubIds: Schema.Array(Schema.String),
  injuries: Schema.Array(InjuryView),
  /** On-pitch head-counts as of the revealed position: the size of `homePitch`/`awayPitch`'s
   * `onPitch` (ticket 11). Below 11, the team is playing a player short. */
  homeOnPitchCount: Schema.Finite,
  awayOnPitchCount: Schema.Finite,
}) {}

/** `SubmitMatchCommand`'s response: the same chunk `ResumeSimulation` returns, plus the command's
 * own outcome. `substitutionApplied` is true when the re-derived timeline holds a Substitution Match
 * Event for this `MakeSubstitution` and for every earlier journaled one of the same pair at the same
 * point, false when the engine refused it, and null for any other command. A count difference cannot
 * stand in for it: re-simulating the rest of the match can remove a later forced substitution in the
 * same call that adds this one. `forceOffApplied` is true when this `ForceOff`'s player was on the
 * pitch when the engine applied it, false when they were not (the engine records nothing), and null
 * for any other command. */
export class SubmitMatchCommandView extends ResumeSimulationView.extend<SubmitMatchCommandView>("SubmitMatchCommandView")({
  substitutionApplied: Schema.NullOr(Schema.Boolean),
  forceOffApplied: Schema.NullOr(Schema.Boolean),
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
// Team Sheet view: squad + formation for both clubs
// ---------------------------------------------------------------------------

export class TeamSheetPlayerView extends Schema.Class<TeamSheetPlayerView>("TeamSheetPlayerView")({
  playerId: PlayerId,
  firstName: Schema.String,
  lastName: Schema.String,
  position: Schema.String,
  role: Schema.String,
}) {}

export class TeamSheetClubView extends Schema.Class<TeamSheetClubView>("TeamSheetClubView")({
  clubId: ClubId,
  clubName: Schema.String,
  formation: Schema.String,
  starters: Schema.Array(TeamSheetPlayerView),
  bench: Schema.Array(Schema.NullOr(Schema.String)),
}) {}

export class TeamSheetView extends Schema.Class<TeamSheetView>("TeamSheetView")({
  home: TeamSheetClubView,
  away: TeamSheetClubView,
}) {}

// ---------------------------------------------------------------------------
// Post-Match Summary (Screen 99): the settled result and its key events
// ---------------------------------------------------------------------------

/** One key event of a finished match as the Post-Match Summary lists it: who, for which side, when, and in which half. */
export class PostMatchEventView extends Schema.Class<PostMatchEventView>("PostMatchEventView")({
  minute: Schema.Finite,
  half: Schema.Literals([1, 2]),
  kind: Schema.Literals(["Goal", "YellowCard", "RedCard", "Injury"]),
  clubId: ClubId,
  playerId: PlayerId,
  playerName: Schema.String,
}) {}

/** The whole-match read the Post-Match Summary renders: final score and the goals, cards and
 *  injuries in match order, plus shootout outcome for cup ties. Derived from the persisted match
 *  stream and fixture row on every call, never stored. */
export class PostMatchSummaryView extends Schema.Class<PostMatchSummaryView>("PostMatchSummaryView")({
  matchId: MatchId,
  homeClubId: ClubId,
  homeClubName: Schema.String,
  awayClubId: ClubId,
  awayClubName: Schema.String,
  homeScore: Schema.Finite,
  awayScore: Schema.Finite,
  /** The home side's penalty shootout score, null when the tie did not go to penalties. */
  homePenalties: Schema.NullOr(Schema.Finite),
  /** The away side's penalty shootout score, null when the tie did not go to penalties. */
  awayPenalties: Schema.NullOr(Schema.Finite),
  /** Whether this Fixture belongs to a knockout Competition (cup) that must produce a winner. */
  isCup: Schema.Boolean,
  events: Schema.Array(PostMatchEventView),
}) {}

// ---------------------------------------------------------------------------
// Match Statistics (Screens 95/100): team totals aggregated from the Match Events
// ---------------------------------------------------------------------------

/** The team totals the match model can back. Every attack ends in exactly one of Goal, BigChance,
 *  ShotOnTarget or ShotMissed, so `attempts` is their sum, `shotsOnTarget` counts Goal + ShotOnTarget,
 *  `shotsOffTarget` counts ShotMissed and `bigChances` counts BigChance (a clear chance not converted
 *  into a recorded shot). */
export const MatchStatisticKey = Schema.Literals([
  "goals",
  "attempts",
  "shotsOnTarget",
  "shotsOffTarget",
  "bigChances",
  "yellowCards",
  "redCards",
  "injuries",
  "substitutions",
]);
export type MatchStatisticKey = Schema.Schema.Type<typeof MatchStatisticKey>;

/** Statistics a football reader expects that the match model does not simulate. Listed so the
 *  screen says they are unavailable rather than showing a zero (Screen 95 §17). */
export const UnavailableMatchStatistic = Schema.Literals(["possession", "corners", "fouls", "offsides"]);
export type UnavailableMatchStatistic = Schema.Schema.Type<typeof UnavailableMatchStatistic>;

export class MatchStatisticRow extends Schema.Class<MatchStatisticRow>("MatchStatisticRow")({
  key: MatchStatisticKey,
  home: Schema.Finite,
  away: Schema.Finite,
}) {}

export class MatchStatisticsView extends Schema.Class<MatchStatisticsView>("MatchStatisticsView")({
  matchId: MatchId,
  homeClubName: Schema.String,
  awayClubName: Schema.String,
  /** The minute of the last Match Event the totals include, for display; null for the whole match.
   *  Never a cut-off: minutes repeat across stoppage time and half time. */
  throughMinute: Schema.NullOr(Schema.Finite),
  rows: Schema.Array(MatchStatisticRow),
  unavailable: Schema.Array(UnavailableMatchStatistic),
}) {}

// ---------------------------------------------------------------------------
// Match Report (Screen 103): the committed match's record
// ---------------------------------------------------------------------------

/** A Substitution's other half: who came off, and whether an Injury forced the change. */
export class MatchReportReplacedView extends Schema.Class<MatchReportReplacedView>("MatchReportReplacedView")({
  playerId: PlayerId,
  playerName: Schema.String,
  forcedByInjury: Schema.Boolean,
}) {}

/** One key event of the report's timeline. For a Substitution the player is the one who came on and
 *  `replaced` names the one who went off; every other kind has `replaced: null`. */
export class MatchReportEventView extends Schema.Class<MatchReportEventView>("MatchReportEventView")({
  minute: Schema.Finite,
  half: Schema.Literals([1, 2]),
  kind: Schema.Literals(["Goal", "YellowCard", "RedCard", "Injury", "Substitution"]),
  clubId: ClubId,
  playerId: PlayerId,
  playerName: Schema.String,
  replaced: Schema.NullOr(MatchReportReplacedView),
}) {}

/** The Match Report of a Fixture whose result has been committed: final and half-time score, every
 *  goal, card, injury and substitution in match order, and the full-match team statistics. Derived
 *  from the persisted match stream on every call, never stored. */
export class MatchReportView extends Schema.Class<MatchReportView>("MatchReportView")({
  matchId: MatchId,
  homeClubId: ClubId,
  homeClubName: Schema.String,
  awayClubId: ClubId,
  awayClubName: Schema.String,
  homeScore: Schema.Finite,
  awayScore: Schema.Finite,
  halfTimeHomeScore: Schema.Finite,
  halfTimeAwayScore: Schema.Finite,
  events: Schema.Array(MatchReportEventView),
  statistics: MatchStatisticsView,
}) {}

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
