import { Schema } from "effect";
import { MANAGER_OUTCOMES, VERDICTS } from "@cm-clone/shared";

import { ClubId, FixtureId, SaveId } from "./ids.js";
import { ArchivedCauseSchema } from "./saves.js";

/** Season/Calendar vocabulary: the Calendar advances only by jumping to the next dated boundary — a
 * date carrying a playable competition's fixture, or a Transfer Window's open — never a day-by-day
 * clock. */
export const SEASON_PHASES = ["pre_season", "in_season", "mid_window_open", "season_complete"] as const;
export const SeasonPhaseSchema = Schema.Literals(SEASON_PHASES);

export class SeasonView extends Schema.Class<SeasonView>("SeasonView")({
  seasonNumber: Schema.Finite,
  /** ISO `YYYY-MM-DD`: where the calendar stands. Every fixture dated on or before it has resolved. */
  currentDate: Schema.String,
  phase: SeasonPhaseSchema,
}) {}

export class FixtureView extends Schema.Class<FixtureView>("FixtureView")({
  id: FixtureId,
  /** The competition-local round number. Means nothing across competitions. */
  round: Schema.Finite,
  /** ISO `YYYY-MM-DD`: when this fixture is played. */
  date: Schema.String,
  homeClubId: ClubId,
  homeClubName: Schema.String,
  awayClubId: ClubId,
  awayClubName: Schema.String,
  homeGoals: Schema.NullOr(Schema.Finite),
  awayGoals: Schema.NullOr(Schema.Finite),
  played: Schema.Boolean,
}) {}

export class FixturesView extends Schema.Class<FixturesView>("FixturesView")({
  season: SeasonView,
  fixtures: Schema.Array(FixtureView),
}) {}

/** One League Table row — points → goal difference → goals scored tie-break order (ADR-0004),
 * no head-to-head. */
export class LeagueTableRow extends Schema.Class<LeagueTableRow>("LeagueTableRow")({
  clubId: ClubId,
  clubName: Schema.String,
  played: Schema.Finite,
  won: Schema.Finite,
  drawn: Schema.Finite,
  lost: Schema.Finite,
  goalsFor: Schema.Finite,
  goalsAgainst: Schema.Finite,
  goalDifference: Schema.Finite,
  points: Schema.Finite,
}) {}

export class LeagueTableView extends Schema.Class<LeagueTableView>("LeagueTableView")({
  season: SeasonView,
  standings: Schema.Array(LeagueTableRow),
}) {}

/** Board Objective Verdict (ADR-0006 / ticket 18): compares the player's club's final League
 * position to its Season-start band. */
export const VerdictSchema = Schema.Literals(VERDICTS);

/** Consecutive-Miss Counter outcome (ADR-0006 / ticket 18): `"none"` when the counter didn't cross
 * a threshold this Season, `"warned"`/`"sacked"` on the 0->1/1->2 transitions. */
export const ManagerOutcomeSchema = Schema.Literals(MANAGER_OUTCOMES);

export class AdvanceCalendarResult extends Schema.Class<AdvanceCalendarResult>("AdvanceCalendarResult")({
  season: SeasonView,
  /** The date the advance landed on, or `null` when it stopped at a Transfer Window's open rather
   *  than at football. */
  resolvedDate: Schema.NullOr(Schema.String),
  transferWindowClosed: Schema.NullOr(Schema.String),
  transferWindowOpened: Schema.NullOr(Schema.String),
  seasonConcluded: Schema.Boolean,
  /** Set only when `seasonConcluded` — the `BoardObjectiveJudged` Verdict for the player's club,
   * computed in the same request right after `SeasonConcluded` (ticket 18 / ADR-0006). Callers that
   * only need the headline outcome don't need a follow-up `getSeasonSummary` call; the full
   * band/standings breakdown still lives there. */
  boardObjectiveVerdict: Schema.NullOr(VerdictSchema),
  /** Set only when `seasonConcluded` — whether the Consecutive-Miss Counter crossed the
   * warn/sack threshold this Season (ticket 18 / ADR-0006). */
  managerOutcome: ManagerOutcomeSchema,
}) {}

/** Raised when `AdvanceCalendar` is invoked after every fixture of the Season has resolved. */
export class SeasonCompleteError extends Schema.TaggedError<SeasonCompleteError>()(
  "SeasonCompleteError",
  {
    saveId: SaveId,
  },
) {}

/** The player's club's Board Objective for one Season (ticket 18 / ADR-0006) — `finalPosition`/
 * `verdict` are `null` until `SeasonConcluded` triggers `BoardObjectiveJudged`. */
export class BoardObjectiveView extends Schema.Class<BoardObjectiveView>("BoardObjectiveView")({
  seasonNumber: Schema.Finite,
  clubId: ClubId,
  minPosition: Schema.Finite,
  maxPosition: Schema.Finite,
  finalPosition: Schema.NullOr(Schema.Finite),
  verdict: Schema.NullOr(VerdictSchema),
}) {}

/** Season summary screen (ticket 18): final League Table position, the Board Objective Verdict, and
 * (if applicable) the warning/sacking outcome and the running Consecutive-Miss Counter. */
export class SeasonSummaryView extends Schema.Class<SeasonSummaryView>("SeasonSummaryView")({
  season: SeasonView,
  standings: Schema.Array(LeagueTableRow),
  clubId: ClubId,
  clubName: Schema.String,
  finalPosition: Schema.NullOr(Schema.Finite),
  boardObjective: Schema.NullOr(BoardObjectiveView),
  managerOutcome: ManagerOutcomeSchema,
  consecutiveMisses: Schema.Finite,
  /** Which cause ended the career, or `null` while it is live — the renderer picks its closing
   * message from the cause rather than inferring one from `managerOutcome`, which is a board
   * judgment and says nothing about a retirement. */
  archivedCause: Schema.NullOr(ArchivedCauseSchema),
}) {}
