import { Schema } from "effect";
import { FINDING_AREAS, KNOWLEDGE_CONFIDENCES, REPORT_FRESHNESSES } from "@cm-clone/shared";

import { ClubId, PlayerId } from "./ids.js";

/**
 * Team Scout Report (Screen 49): what one club's scouted knowledge of another club amounts to.
 *
 * The shape enforces the glossary's central rule at the boundary rather than trusting the
 * derivation to remember it: **nothing here carries an exact hidden value.** A key player's ability
 * crosses as a range, never a number, so a below-Fully-Scouted player cannot leak an exact figure
 * even if a future derivation tried to put one there. A report about a club with no scouted players
 * is not an empty report — it is the `ClubNotScoutedError` failure, so "we know nothing" can never
 * be mistaken on the wire for "we know they are nothing".
 */

/** How much of the target squad the report rests on. Grades the observed half only: an observation
 *  is never wrong, only partial, so this is coverage and never accuracy. */
export const KnowledgeConfidenceSchema = Schema.Literals(KNOWLEDGE_CONFIDENCES);

/** How far the reading has fallen behind the club it describes. Independent of confidence. */
export const ReportFreshnessSchema = Schema.Literals(REPORT_FRESHNESSES);

/** The part of a club a finding speaks about. */
export const FindingAreaSchema = Schema.Literals(FINDING_AREAS);

/**
 * One thing the report has to say about the target, and how well-founded it is.
 *
 * `confidence` rides each finding rather than only the report as a whole because a report is
 * routinely well-founded about one phase and guessing about another — a squad can be thoroughly
 * scouted in defence and unscouted in attack, and a single report-level number would round that
 * away in whichever direction happened to dominate.
 */
export class ScoutingFindingView extends Schema.Class<ScoutingFindingView>("ScoutingFindingView")({
  area: FindingAreaSchema,
  /** Display prose, already knowledge-gated by the derivation. Rendered as text, never markup. */
  note: Schema.String,
  confidence: KnowledgeConfidenceSchema,
}) {}

/**
 * A scouted member of the target squad, as the report is allowed to describe them.
 *
 * Ability crosses as `[abilityLow, abilityHigh]` — the player's Attribute Range at their current
 * progress — and never as an exact figure. At Fully Scouted the two bounds coincide, which is how
 * an exact reading is expressed without the wire ever carrying a separate exact field that a
 * below-Fully-Scouted player could accidentally populate.
 */
export class ScoutedPlayerSummaryView extends Schema.Class<ScoutedPlayerSummaryView>(
  "ScoutedPlayerSummaryView",
)({
  playerId: PlayerId,
  firstName: Schema.String,
  lastName: Schema.String,
  position: Schema.String,
  /** 0-100. How well this club knows this player; the width of the range below follows from it. */
  progress: Schema.Finite,
  abilityLow: Schema.Finite,
  abilityHigh: Schema.Finite,
}) {}

/** The shape the target is predicted to line up in. Part of the report's *predicted* half, so it
 *  may simply be wrong however high the confidence behind it. */
export class FormationPredictionView extends Schema.Class<FormationPredictionView>(
  "FormationPredictionView",
)({
  formation: Schema.String,
  confidence: KnowledgeConfidenceSchema,
}) {}

/** Who produced the reading. Null when the knowledge came from per-player assignments rather than
 *  from a scout watching this club, which is every report until a Club-target assignment ships. */
export class ReportScoutView extends Schema.Class<ReportScoutView>("ReportScoutView")({
  scoutId: Schema.String,
  scoutName: Schema.String,
}) {}

/** One recent result from the target's point of view — public information, not scouted. */
export class ReportFormResultView extends Schema.Class<ReportFormResultView>(
  "ReportFormResultView",
)({
  /** ISO `YYYY-MM-DD`. */
  date: Schema.String,
  opponentClubName: Schema.String,
  isHome: Schema.Boolean,
  goalsFor: Schema.Finite,
  goalsAgainst: Schema.Finite,
}) {}

/**
 * The report itself, immutable per calendar revision: the same save at the same revision derives
 * the same report, and advancing the calendar produces a new reading rather than mutating this one.
 */
export class TeamScoutReportView extends Schema.Class<TeamScoutReportView>("TeamScoutReportView")({
  /** Stable within a revision: `"<clubId>:<observedAt>"`. Nothing mints it, so a report id can
   *  never name a reading that was not derived. */
  reportId: Schema.String,
  targetClubId: ClubId,
  targetClubName: Schema.String,
  scout: Schema.NullOr(ReportScoutView),
  /** ISO `YYYY-MM-DD`: the calendar date the reading was taken at. */
  observedAt: Schema.String,
  knowledgeConfidence: KnowledgeConfidenceSchema,
  freshness: ReportFreshnessSchema,
  predictedFormation: Schema.NullOr(FormationPredictionView),
  recentForm: Schema.Array(ReportFormResultView),
  strengths: Schema.Array(ScoutingFindingView),
  weaknesses: Schema.Array(ScoutingFindingView),
  keyPlayers: Schema.Array(ScoutedPlayerSummaryView),
  setPieceFindings: Schema.Array(ScoutingFindingView),
}) {}

/**
 * The readings the human's club has filed about one target, newest first. A reading is filed when a
 * Club watch ends, and each is a whole `TeamScoutReportView` as it stood on the day it was taken, so
 * it reads correctly however far the target has since moved: squad, competition, or name. An empty
 * list is an ordinary answer: no watch on this club has ended yet.
 */
export class TeamScoutReadingsView extends Schema.Class<TeamScoutReadingsView>("TeamScoutReadingsView")({
  targetClubId: ClubId,
  readings: Schema.Array(TeamScoutReportView),
}) {}

/**
 * Raised when the human club has scouted nobody at the target club.
 *
 * A distinct failure rather than an empty report, because the two mean opposite things to a
 * manager: an empty report reads as "this club has no strengths", and the absence of knowledge
 * reads as "go and look". It is also the state a `results-only` club is permanently in — such a
 * club holds no player rows at all, so there is nothing there to scout.
 */
export class ClubNotScoutedError extends Schema.TaggedError<ClubNotScoutedError>()(
  "ClubNotScoutedError",
  {
    clubId: ClubId,
    /** The id a reading taken now would carry. A command that sends a scout to look acts from this
     *  reading, exactly as it would from a delivered report, so a stale "not scouted" is refused too. */
    currentReportId: Schema.String,
  },
) {}

/**
 * Raised when a command acts on a Team Scout Report that is no longer the current reading.
 *
 * A report is pinned to the calendar date it was taken at, and its `reportId` names that reading. A
 * command that says which reading it was issued from is refused once the calendar has moved past it,
 * so a manager who decided on an old reading is shown the new one rather than acting blind. Carries
 * the current id so the screen can show that reading without guessing.
 */
export class StaleReportError extends Schema.TaggedError<StaleReportError>()("StaleReportError", {
  expectedReportId: Schema.String,
  currentReportId: Schema.String,
}) {}

/**
 * Raised when a scout is pointed at the manager's own club. Own-squad players are always read in
 * full and never carry Scouting Progress, so there is nothing for such an assignment to learn, and
 * accruing it would write the very rows that rule forbids.
 */
export class OwnClubNotScoutableError extends Schema.TaggedError<OwnClubNotScoutableError>()(
  "OwnClubNotScoutableError",
  {
    clubId: ClubId,
  },
) {}
