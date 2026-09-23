/**
 * The classification of every `CareerDestination` as a top-level career screen or a named
 * sub-surface, shared by the tests that need it.
 *
 * It lives here rather than inside one spec because two of them assert against it: the registry
 * spec proves the classification is total, and the nav route index spec proves the navbar links
 * nothing outside it.
 */
import type {
  CAREER_SCREEN_TYPES,
  CareerDestination,
} from "../../src/renderer/navigation/destinations.js";

/**
 * `CAREER_SCREEN_TYPES` names the subset of `CareerDestination` the repo treats as a top-level
 * career screen. Nothing in the union's shape distinguishes those from the sub-surfaces, so the
 * subset cannot be derived. What *can* be made compulsory is the classification itself: every union
 * member is either a top-level screen or a named sub-surface, and this record is the half that
 * carries the reasons.
 *
 * **What separates the two is not written down anywhere, and it is not what the obvious guesses
 * say.** It is not "has a `g <key>` binding": there are seven `g` nav actions resolving to six
 * distinct destinations, so sixteen of the twenty-two top-level screens have no binding either. It
 * is not "is a navbar item": six members of this record are first-class `NavItem`s in
 * `nav-config.ts`, siblings of top-level screens. Several entries below are therefore a recorded
 * judgement rather than a derivation, and this record makes the classification compulsory without
 * making it *checkable*. See
 * `.scratch/desktop-suite-red/decision-request-01-what-makes-a-career-destination-top-level.md`.
 *
 * Add a member to `CareerDestination` and forget `CAREER_SCREEN_TYPES`, and it lands in
 * `CareerSubSurfaceType`, this literal stops satisfying its `Record`, and `pnpm -r typecheck` fails
 * with `Property '<name>' is missing`. List it in both and it is an excess property here instead.
 * `apps/desktop`'s tsconfig covers `test/`, so this is a gate, not a comment.
 *
 * This replaced a frozen `CAREER_SCREEN_TYPES.length === 22` plus a hand-copied name list, which
 * cost an edit per new screen and caught nothing: every new *top-level* screen still slipped past
 * it, because `arrayContaining` only asserts a lower bound and the count was updated by whoever
 * broke it.
 */
export type CareerSubSurfaceType = Exclude<
  CareerDestination["type"],
  (typeof CAREER_SCREEN_TYPES)[number]
>;

export const CAREER_SUB_SURFACES: Readonly<Record<CareerSubSurfaceType, string>> = {
  tacticsEditor: "edits the tactic reached from the read-only Tactics overview",
  contractExpiry: "a Recruitment navbar item, but classed under the Transfers area, not a screen of its own",
  budgetReview: "a Recruitment navbar item, but classed under the Transfers area, not a screen of its own",
  transferHistory: "a Recruitment navbar item, but classed under the Transfers area, not a screen of its own",
  trainingWorkload: "Workload and Recovery (Screen 112), reached from Coaching Assignments",
  trainingCoaching: "Coaching Assignments (Screen 111); a Training navbar item, classed under the Training area",
  trainingPlan: "names a player, so it cannot be built from a save alone",
  trainingDevelopment: "Player Development Centre (Screen 114), reached from Coaching Assignments",
  scoutingAssignment: "Scouting Assignment (Screen 121); a Recruitment navbar item, classed under Scouting",
  scoutingKnowledge: "Scouting Knowledge (Screen 126); a Recruitment navbar item, classed under Scouting",
  teamScoutReport: "names a club, so it cannot be built from a save alone",
  clubStaff: "names a club, so it cannot be built from a save alone",
  clubSquad: "names a club, so it cannot be built from a save alone",
  clubInformation: "names a club, so it cannot be built from a save alone",
  clubFixturesDetail: "names a club, so it cannot be built from a save alone",
  clubTransfersDetail: "names a club, so it cannot be built from a save alone",
  clubFinancesDetail: "names a club, so it cannot be built from a save alone",
  competitionOverview: "names a competition, so it cannot be built from a save alone",
  competitionTable: "names a competition, so it cannot be built from a save alone",
  competitionFixturesDetail: "names a competition, so it cannot be built from a save alone",
  competitionResults: "names a competition, so it cannot be built from a save alone",
  playerDetail: "names a player, so it cannot be built from a save alone",
  playerDevelopment: "names a player, so it cannot be built from a save alone",
  playerContract: "names a player, so it cannot be built from a save alone",
  matchMatchTactics: "needs a match in play, reached from the live Match day section",
  matchSubstitutions: "needs a match in play, reached from the live Match day section",
  matchStats: "a post-match review screen, reached from the Post-Match Summary",
  matchRatings: "a post-match review screen, reached from the Post-Match Summary",
  matchReport: "names its match, which the cleared match session can no longer supply",
  matchCommentary: "a match-day sub-screen of the main match view",
  matchLatestScores: "a match-day sub-screen of the main match view",
  matchLiveTable: "a match-day sub-screen of the main match view",
  squadStaff: "a Squad section sub-item, work in progress placeholder",
  squadInformation: "a Squad section sub-item, work in progress placeholder",
  squadFinances: "a Squad section sub-item, work in progress placeholder",
  squadHistory: "a Squad section sub-item, work in progress placeholder",
  managerInbox: "a Manager section sub-tab",
  managerConfidence: "a Manager section sub-tab",
  managerNotes: "a Manager section sub-tab",
  managerJobs: "a Manager section sub-tab",
  managerResponsibilities: "a Manager section sub-tab",
  managerCareer: "a Manager section sub-tab",
};

