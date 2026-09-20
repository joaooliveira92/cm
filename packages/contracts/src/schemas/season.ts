import { Schema } from "effect";
import { MANAGER_OUTCOMES, VERDICTS } from "@cm-clone/shared";

import { ClubSummary } from "./clubs.js";
import { ClubId, CompetitionId, FixtureId, MatchId, SaveId } from "./ids.js";
import { ArchivedCauseSchema } from "./saves.js";

/** Season/Calendar vocabulary: the Calendar advances only by jumping to the next dated boundary — a
 * date carrying a playable competition's fixture, or a Transfer Window's open — never a day-by-day
 * clock. */
export const SEASON_PHASES = ["pre_season", "in_season", "mid_window_open", "season_complete"] as const;
export const SeasonPhaseSchema = Schema.Literals(SEASON_PHASES);

/**
 * One reason a Fixture cannot be played, carried as data rather than assembled by the surface that
 * shows it. `destination` is the screen that owns the fix, so "resolve this" is a step rather than
 * a hunt, and a reworded blocker never breaks the routing.
 */
export class ReadinessBlockerView extends Schema.Class<ReadinessBlockerView>("ReadinessBlockerView")({
  id: Schema.String,
  title: Schema.String,
  detail: Schema.String,
  destination: Schema.NullOr(Schema.String),
}) {}

/**
 * The human club's scheduled fixture the Calendar has reached and stopped before.
 *
 * Advisory on read. It reports what is pending, not whether it may be played: readiness is derived
 * fresh whenever resolution is actually requested, because the player may repair a blocker a moment
 * after reading this.
 */
export class PendingFixtureView extends Schema.Class<PendingFixtureView>("PendingFixtureView")({
  fixtureId: FixtureId,
  /** ISO `YYYY-MM-DD`: the date the Calendar has stopped on. */
  date: Schema.String,
  competitionId: Schema.String,
  opponentClubId: ClubId,
  opponentClubName: Schema.String,
  /** Whether the human club is the home side. Taken from the fixture, never assumed. */
  isHome: Schema.Boolean,
  /** The started match stream for this Fixture, or `null` while the boundary is un-entered.
   *  Non-null means Match day resumes that stream rather than starting a new one. */
  matchId: Schema.NullOr(MatchId),
  /** What currently stops this Fixture being played. Advisory: recomputed authoritatively when
   *  Play or Quick result is actually requested, because the player may repair one in between. */
  blockers: Schema.Array(ReadinessBlockerView),
}) {}

export class SeasonView extends Schema.Class<SeasonView>("SeasonView")({
  seasonNumber: Schema.Finite,
  /** ISO `YYYY-MM-DD`: where the calendar stands. Every fixture dated on or before it has resolved. */
  currentDate: Schema.String,
  phase: SeasonPhaseSchema,
  /**
   * The pre-match boundary, or `null` when nothing is pending.
   *
   * It rides the season rather than one screen's view because it is a fact about where the career
   * stands, like the date beside it: every surface that orients the player needs it, and it has to
   * survive a restart rather than existing only in the reply to the advance that created it.
   */
  awaitingFixture: Schema.NullOr(PendingFixtureView),
}) {}

/**
 * The season names a pending fixture that cannot be what it claims — already played, belonging to
 * another season, or not involving the human club.
 *
 * Raised rather than repaired. A boundary that picked the "closest matching" fixture, cleared
 * itself, or silently advanced would turn a corrupted career into a career that quietly plays the
 * wrong match, and no foreign key can express these invariants.
 */
export class PendingFixtureIntegrityError extends Schema.TaggedError<PendingFixtureIntegrityError>()(
  "PendingFixtureIntegrityError",
  {
    /** `null` for the one violation that has no fixture to name: a match link with no pending
     *  fixture behind it. */
    fixtureId: Schema.NullOr(FixtureId),
    reason: Schema.String,
  },
) {}

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

/**
 * Raised when a second `AdvanceCalendar` arrives for a Save while one is still running.
 *
 * The Calendar advance is not idempotent — it lapses pending Bids, resolves every due Fixture,
 * draws cup rounds, and at a Season's end rolls the world over — so two interleaved advances would
 * play the same Matchday twice. The renderer disables Continue while one is in flight, but a
 * disabled control is a convenience: a repeated key press that outruns a re-render still reaches
 * the command, and the guard that matters is the one in the main process.
 *
 * Refusal rather than queueing: the second press was made without seeing the first one's result, so
 * running it afterwards would advance the career past a boundary the player never read.
 */
export class AdvanceInProgressError extends Schema.TaggedError<AdvanceInProgressError>()(
  "AdvanceInProgressError",
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

/**
 * Club Fixtures (Screen 40): one club's fixtures this Season, across every Competition it plays in.
 *
 * Carries the club and `isUserClub` alongside the fixtures for the reason `ClubStaffView` does:
 * one read answers the whole page, so there is no state where the screen knows the fixtures but
 * not whose they are, and no second failure to reconcile.
 *
 * Declared here rather than in `clubs.ts` because `transfers.ts` already imports `ClubSummary`
 * from there, so a club→season edge would close a cycle and leave a schema undefined at module
 * init. The dependency runs season→clubs, one way.
 */
export class ClubFixturesView extends Schema.Class<ClubFixturesView>("ClubFixturesView")({
  club: ClubSummary,
  isUserClub: Schema.Boolean,
  season: SeasonView,
  fixtures: Schema.Array(FixtureView),
}) {}

/**
 * Supporter and Board Confidence (Screen 47) — the board half only.
 *
 * **Save-scoped, and deliberately so.** `board_objective` is keyed on `season_number` and names the
 * human's club, so a rival club has no Board Objective at all. That is the one exception to
 * [the club-scoped rule](../../../../.agents/notes/proposed/architecture/2026-09-19-a-club-screen-is-club-scoped-unless-only-your-club-has-one.md),
 * and it is subject existence rather than secrecy: there is nothing to withhold because there is
 * nothing there.
 *
 * Supporter confidence is not modelled and is absent rather than zeroed — the Group C ledger
 * `deferred`s it.
 *
 * `objective` is null before the first Season's objective is set, which is a real state and not an
 * error.
 */
export class BoardConfidenceView extends Schema.Class<BoardConfidenceView>("BoardConfidenceView")({
  season: SeasonView,
  clubName: Schema.String,
  objective: Schema.NullOr(BoardObjectiveView),
}) {}

/**
 * No such Competition in this save.
 *
 * Mirrors `ClubNotFoundError`, and exists because Screen 161 is the first competition-scoped read
 * that needs the distinction. `getCompetitionFixtures` and `getCompetitionTable` answer an unknown
 * competition with an empty list, which is fine for them — an empty card and an empty table are
 * real answers. A landing page is different: a blank name is not a competition with nothing in it.
 */
export class CompetitionNotFoundError extends Schema.TaggedError<CompetitionNotFoundError>()(
  "CompetitionNotFoundError",
  { id: CompetitionId },
) {}

/**
 * Competition Overview (Screen 161) — a Competition's landing page.
 *
 * **One small read rather than a composition, and the reason is the title.** No existing view names
 * a competition: `LeagueTableView` is `{ season, standings }` and `FixturesView` is
 * `{ season, fixtures }`, so a hub built purely by composing its siblings could not say which
 * competition it was about. Composing three reads would also put three independent failure states
 * on one page, which is what `ClubStaffView`'s comment argues against.
 *
 * What it deliberately does **not** carry is rows. No standings, no fixtures, no results — those
 * live on Screens 162, 163 and 164, and this page links to them rather than reimplementing them.
 * The counts are what a landing page owes: enough to know whether there is anything to look at.
 */
export class CompetitionOverviewView extends Schema.Class<CompetitionOverviewView>(
  "CompetitionOverviewView",
)({
  competitionId: CompetitionId,
  competitionName: Schema.String,
  /** The nation this competition belongs to, or `null` for a cross-border tournament — the schema
   *  models confederations as containers with no `nations` row to point at. */
  nationName: Schema.NullOr(Schema.String),
  /** `league`, `cup`, `reserve` or `continental`, as the schema's own check constraint allows. */
  kind: Schema.String,
  season: SeasonView,
  /** Authoritative from `competitions.club_count`, not counted from participants — `null` for a
   *  competition whose field is a function of its sources. */
  clubCount: Schema.NullOr(Schema.Finite),
  playedCount: Schema.Finite,
  remainingCount: Schema.Finite,
}) {}

/** One row of the Competitions browse list: enough to recognise a competition and open it. */
export class CompetitionListItemView extends Schema.Class<CompetitionListItemView>(
  "CompetitionListItemView",
)({
  competitionId: CompetitionId,
  competitionName: Schema.String,
  /** `league`, `cup`, `reserve` or `continental`, as the schema's check constraint allows. */
  kind: Schema.String,
  /** `null` for a cross-border tournament, which has no `nations` row to point at. */
  nationName: Schema.NullOr(Schema.String),
  /** Pyramid tier, 1 = highest. `null` for a kind that does not sit on the ladder. */
  tier: Schema.NullOr(Schema.Finite),
  clubCount: Schema.NullOr(Schema.Finite),
}) {}

/**
 * Competitions (the World section's browse entry) — every competition in the save.
 *
 * A browse list and nothing more: each row opens that competition's Overview (Screen 161), which is
 * where its table, card and results hang. It carries no standings, no form and no honours, because
 * a browse list is exactly where a stray "titles won" column would look harmless and every one of
 * those screens is `deferred`.
 *
 * This is what makes the competition branch reachable at all: Screens 161–164 shipped with no entry
 * point and were addressable only by typing a URL.
 */
export class CompetitionsListView extends Schema.Class<CompetitionsListView>(
  "CompetitionsListView",
)({
  competitions: Schema.Array(CompetitionListItemView),
}) {}
