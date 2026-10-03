import path from "node:path";
import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  AppRpcs,
  type AppRpcMethod,
  type RpcFailure,
  type RpcPayload,
  type RpcResult,
} from "@cm-clone/contracts";
import { Effect, Schema } from "effect";
import { getCareerSetupSummary } from "../career/careerSetupSummary.js";
import { getClubSelection } from "../career/clubSelection.js";
import { getManagerProfile, getManagerProfileScreen } from "../career/managerProfile.js";
import { getNewsInbox, setNewsMessageState } from "../career/news.js";
import { getPlayerContract, getPlayerProfile } from "../career/player.js";
import { getClubStaff } from "../career/staff.js";
import { getStaffProfile } from "../career/staffProfile.js";
import { getClubInformation } from "../club/clubInformation.js";
import { getClubSquad } from "../club/clubSquad.js";
import { setRetrainingTarget } from "../club/retraining.js";
import {
  assignScout,
  assignScoutToClub,
  getScouting,
  getScoutingKnowledge,
  unassignScout,
} from "../club/scouting.js";
import { getSquad } from "../club/squad.js";
import {
  changeTactics,
  getTactics,
} from "../club/tactics.js";
import {
  deleteTacticTemplate,
  duplicateTacticTemplate,
  loadTacticLibrary,
  overwriteTacticTemplate,
  quickLoadTactic,
  renameTacticTemplate,
  saveTacticTemplate,
} from "../club/tacticLibrary.js";
import { getTacticsOverview } from "../club/tacticsOverview.js";
import { getTeamScoutReadings, getTeamScoutReport } from "../club/teamScoutReport.js";
import {
  getCoachingAssignments,
  getPlayerDevelopmentHistory,
  getSquadDevelopment,
  getWorkload,
  setTrainingFocus,
} from "../club/training.js";
import {
  changeTrainingSchedule,
  getTrainingSchedule,
  setTrainingScheduleDelegation,
} from "../club/trainingSchedule.js";
import {
  CommentaryTableSource,
  chooseCommentaryFile,
  commentaryFileStatus,
  loadCommentaryTable,
  openCommentaryFile,
  resetCommentaryFile,
  updateCommentaryFile,
  type OpenPath,
} from "../match/commentaryFile.js";
import {
  getAwaitingMatch,
  getMatchOverview,
  getMatchPlayerStats,
  getMatchRatings,
  getMatchReport,
  getMatchStatistics,
  getPostMatchSummary,
  getTeamSheet,
  resumeSimulation,
  startMatch,
  submitMatchCommand,
} from "../match/index.js";
import { commitMatchday } from "../season/commitMatchday.js";
import {
  advanceCalendar,
  getCompetitionFixtures,
  getCompetitionTable,
  getFixtures,
  getLeagueTable,
  getSeasonSummary,
  retireManager,
} from "../season/index.js";
import {
  getBoardConfidence,
  getClubFixtures,
  getCompetitionOverview,
  getCompetitions,
} from "../season/queries.js";
import { getClubFinances } from "../transfers/budgetReview.js";
import {
  getBudgetReviewScreen,
  getContractExpiryScreen,
  getContractOffer,
  getPlayerComparison,
  getPlayerSearch,
  getTransferHistoryScreen,
  getTransfersScreen,
  placeBid,
  renewContract,
  respondAsBidder,
  respondToBid,
  signFreeAgent,
} from "../transfers/index.js";
import { getClubTransfers } from "../transfers/transferHistory.js";
import {
  applyLeaguePreset,
  buildLeaguePresetIntents,
  getLeagueSelectionSnapshot,
  getLeagueSetupIndex,
  listLeaguePresets,
  loadSetupDraft,
  resolveLeagueSelection,
  saveLeaguePreset,
  saveSetupDraft,
  submitLeagueSelection,
} from "../world/leagueSelection.js";
import { beginCareer, commitCareer, createSave, discardCareer, listSaves, loadSave, saveCareer } from "../world/saves.js";
import {
  getKeyBindingOverrides,
  resetAllKeyBindings,
  resetKeyBinding,
  setKeyBindingOverride,
} from "./keybindings.js";
import { withWideEvent } from "./logging.js";
import type { SqlError } from "effect/unstable/sql/SqlError";

export interface RpcContext {
  readonly savesDir: string;
  /** Electron `userData` — the parent of `saves/`; the machine-local override file lives here. */
  readonly userDataDir: string;
  /** Electron's `shell.openPath`, for handing a file to the player's editor. Absent under test. */
  readonly openPath?: OpenPath;
}

/**
 * The four methods whose handlers reach engine invariant errors that have no contract schema:
 * `CalendarSlotsExhaustedError`, `FixtureGenerationError`, `SquadTooSmallError`,
 * `FullTimeWhistleMissingError`. Declaring them means first deciding whether an invariant violation
 * belongs in `E` or in the `Cause`, which is an open question —
 * `.scratch/group-l-competitions-nations-and-world-information/decision-request-01-rpc-error-channel.md`.
 *
 * They are listed by name rather than left implicit so the exception is visible and finite. Shrinking
 * this list is the point; adding to it needs the same decision taken first.
 */
type UngatedMethod = "createSave" | "commitCareer" | "advanceCalendar" | "commitMatchday";

/**
 * A method's implementation, over a payload already validated against `AppRpcs[method].payload`.
 * The decode prologue that used to open every handler lives once, in `handle`.
 *
 * The error channel is the per-method gate. `Effect<unknown, unknown>` accepted anything, so an RPC
 * whose declared `error:` union was narrower than what its handler could raise compiled clean and
 * only showed at runtime — the encode against the method's schema fails, the raw error is re-raised,
 * and the renderer gets name/message instead of a typed error it could describe. That shipped twice
 * in consecutive tickets before an audit found eleven instances. Here `tsc` names an omission at the
 * `handle` call site, and the Effect language service reports the missing member directly (TS377003).
 *
 * `SqlError` is an escape hatch, not an endorsement: it sits in roughly every save-scoped handler's
 * error channel and is declared by none of them. Whether a failed query on a local save file is a
 * domain error or a defect is the same open decision linked above; admitting it here is what lets
 * the rest of this type be exact in the meantime.
 */
export type Impl<M extends AppRpcMethod> = M extends UngatedMethod
  ? (payload: RpcPayload<M>, ctx: RpcContext) => Effect.Effect<unknown, unknown>
  : (
      payload: RpcPayload<M>,
      ctx: RpcContext,
    ) => Effect.Effect<unknown, RpcFailure<M> | Schema.SchemaError | SqlError>;

/** A built handler as the dispatcher calls it: raw payload in, decode and the implementation inside. */
export type Handler<M extends AppRpcMethod> = (
  payload: unknown,
  ctx: RpcContext,
) => Effect.Effect<
  unknown,
  M extends UngatedMethod ? unknown : RpcFailure<M> | Schema.SchemaError | SqlError
>;

/**
 * The one combinator every method is built with: decode the raw payload against the method's own
 * contract, then run `impl` on the decoded value. Both the `AppRpcs[method].payload` selection and
 * the error gate are owned here, so a new method needs no prologue and cannot drift from `AppRpcs`.
 *
 * The cast is the price of indexing a union of schemas by a generic method key; the enforcement it
 * hides happens at each `handle` call site, where `impl` is checked against `Impl<M>`.
 */
export const handle = <M extends AppRpcMethod>(method: M, impl: Impl<M>): Handler<M> => {
  const run = impl as (payload: RpcPayload<M>, ctx: RpcContext) => Effect.Effect<unknown, unknown>;
  return ((payload: unknown, ctx: RpcContext) =>
    Schema.decodeUnknownEffect(
      AppRpcs[method].payload as unknown as Schema.ConstraintDecoder<RpcPayload<M>>,
    )(payload).pipe(
      Effect.flatMap((decoded) => run(decoded, ctx)),
    )) as Handler<M>;
};

/** Extract a save-scoped id from a payload when the method carries one, so the
 *  wide event can attribute the request to a save without decoding it. */
const saveIdOf = (method: AppRpcMethod, payload: unknown): string | null => {
  if (payload === null || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  return typeof record["saveId"] === "string" ? record["saveId"] : null;
};

/** A match read renders its commentary from the player's commentary file in the user data folder. */
const withPlayersCommentary = (ctx: RpcContext) =>
  Effect.provideService(CommentaryTableSource, loadCommentaryTable(ctx.userDataDir));

/**
 * The single dispatch table. One `handle` per endpoint; the type keeps it exhaustive over
 * `AppRpcMethod`, so a method missing here is a compile error rather than a silent 404.
 *
 * League and Nation Selection (Screen 3): every one of these re-validates against the catalogue in
 * `leagueSelection.ts`; none trusts a resolved selection the renderer computed.
 */
const handlers: { readonly [M in AppRpcMethod]: Handler<M> } = {
  ping: handle("ping", () => Effect.succeed("pong")),
  listSaves: handle("listSaves", (_payload, ctx) => listSaves(ctx.savesDir)),
  createSave: handle("createSave", ({ name }, ctx) =>
    createSave(ctx.savesDir, name, ctx.userDataDir),
  ),
  beginCareer: handle("beginCareer", ({ snapshotId }, ctx) =>
    beginCareer(ctx.savesDir, { userDataDir: ctx.userDataDir, snapshotId }),
  ),
  commitCareer: handle("commitCareer", (payload, ctx) =>
    commitCareer(ctx.savesDir, payload.id, payload.name, payload.selectedClubId, {
      firstName: payload.firstName,
      lastName: payload.lastName,
      nationalityId: payload.nationalityId,
      dateOfBirth: payload.dateOfBirth,
      favoriteClubId: payload.favoriteClubId,
      preferredFormation: payload.preferredFormation,
      avatarPortraitKey: payload.avatarPortraitKey,
      avatarPrimaryColor: payload.avatarPrimaryColor,
      avatarSecondaryColor: payload.avatarSecondaryColor,
      archetypeOrigin: payload.archetypeOrigin,
      pillars: payload.pillars,
    }),
  ),
  getManagerProfile: handle("getManagerProfile", ({ saveId }, ctx) =>
    getManagerProfile(ctx.savesDir, saveId),
  ),
  getManagerProfileScreen: handle("getManagerProfileScreen", ({ saveId }, ctx) =>
    getManagerProfileScreen(ctx.savesDir, saveId),
  ),
  retireManager: handle("retireManager", ({ saveId }, ctx) =>
    retireManager(ctx.savesDir, saveId),
  ),
  getClubSelection: handle("getClubSelection", ({ saveId }, ctx) =>
    getClubSelection.pipe(
      Effect.provide(SqliteClient.layer({ filename: path.join(ctx.savesDir, `${saveId}.sqlite`) })),
      Effect.scoped,
    ),
  ),
  getCareerSetupSummary: handle("getCareerSetupSummary", ({ saveId }, ctx) =>
    getCareerSetupSummary.pipe(
      Effect.provide(SqliteClient.layer({ filename: path.join(ctx.savesDir, `${saveId}.sqlite`) })),
      Effect.scoped,
    ),
  ),
  discardCareer: handle("discardCareer", ({ id }, ctx) => discardCareer(ctx.savesDir, id)),
  deleteSave: handle("deleteSave", ({ id }, ctx) => discardCareer(ctx.savesDir, id)),
  loadSave: handle("loadSave", ({ id }, ctx) => loadSave(ctx.savesDir, id)),
  saveCareer: handle("saveCareer", ({ saveId, name }, ctx) =>
    saveCareer(ctx.savesDir, saveId, name),
  ),

  getSquad: handle("getSquad", ({ saveId }, ctx) => getSquad(ctx.savesDir, saveId)),
  getTactics: handle("getTactics", ({ saveId }, ctx) => getTactics(ctx.savesDir, saveId)),
  getTacticsOverview: handle("getTacticsOverview", ({ saveId }, ctx) =>
    getTacticsOverview(ctx.savesDir, saveId),
  ),
  changeTactics: handle("changeTactics", ({ saveId, tactic, expectedRevision, requestId }, ctx) =>
    changeTactics(ctx.savesDir, saveId, tactic, expectedRevision, requestId),
  ),
  getTacticLibrary: handle("getTacticLibrary", ({ saveId }, ctx) =>
    loadTacticLibrary(ctx.savesDir, saveId),
  ),
  saveTacticTemplate: handle("saveTacticTemplate", ({ saveId, name, tactic, requestId }, ctx) =>
    saveTacticTemplate(ctx.savesDir, saveId, name, tactic, requestId),
  ),
  renameTacticTemplate: handle(
    "renameTacticTemplate",
    ({ saveId, id, name, expectedRevision, requestId }, ctx) =>
      renameTacticTemplate(ctx.savesDir, saveId, id, name, expectedRevision, requestId),
  ),
  overwriteTacticTemplate: handle(
    "overwriteTacticTemplate",
    ({ saveId, id, tactic, expectedRevision, requestId }, ctx) =>
      overwriteTacticTemplate(ctx.savesDir, saveId, id, tactic, expectedRevision, requestId),
  ),
  duplicateTacticTemplate: handle("duplicateTacticTemplate", ({ saveId, id, requestId }, ctx) =>
    duplicateTacticTemplate(ctx.savesDir, saveId, id, requestId),
  ),
  deleteTacticTemplate: handle(
    "deleteTacticTemplate",
    ({ saveId, id, expectedRevision, requestId }, ctx) =>
      deleteTacticTemplate(ctx.savesDir, saveId, id, expectedRevision, requestId),
  ),
  quickLoadTactic: handle("quickLoadTactic", ({ saveId, id, requestId }, ctx) =>
    quickLoadTactic(ctx.savesDir, saveId, id, requestId),
  ),

  getLeagueTable: handle("getLeagueTable", ({ saveId }, ctx) =>
    getLeagueTable(ctx.savesDir, saveId),
  ),
  getCompetitionTable: handle("getCompetitionTable", ({ saveId, competitionId }, ctx) =>
    getCompetitionTable(ctx.savesDir, saveId, competitionId),
  ),
  getFixtures: handle("getFixtures", ({ saveId }, ctx) => getFixtures(ctx.savesDir, saveId)),
  getCompetitionFixtures: handle("getCompetitionFixtures", ({ saveId, competitionId }, ctx) =>
    getCompetitionFixtures(ctx.savesDir, saveId, competitionId),
  ),
  advanceCalendar: handle("advanceCalendar", ({ saveId }, ctx) =>
    advanceCalendar(ctx.savesDir, saveId),
  ),
  getSeasonSummary: handle("getSeasonSummary", ({ saveId }, ctx) =>
    getSeasonSummary(ctx.savesDir, saveId),
  ),

  startMatch: handle("startMatch", ({ saveId, fixtureId, mode }, ctx) =>
    startMatch(ctx.savesDir, saveId, fixtureId, mode),
  ),
  commitMatchday: handle("commitMatchday", ({ saveId, fixtureId }, ctx) =>
    commitMatchday(ctx.savesDir, saveId, fixtureId),
  ),
  resumeSimulation: handle(
    "resumeSimulation",
    ({ saveId, matchId, cursor, revealedEvents }, ctx) =>
      resumeSimulation(ctx.savesDir, saveId, matchId, cursor, revealedEvents).pipe(
        withPlayersCommentary(ctx),
      ),
  ),
  getAwaitingMatch: handle("getAwaitingMatch", ({ saveId, matchId }, ctx) =>
    getAwaitingMatch(ctx.savesDir, saveId, matchId),
  ),
  getTeamSheet: handle("getTeamSheet", ({ saveId, matchId }, ctx) =>
    getTeamSheet(ctx.savesDir, saveId, matchId),
  ),
  getPostMatchSummary: handle("getPostMatchSummary", ({ saveId, matchId }, ctx) =>
    getPostMatchSummary(ctx.savesDir, saveId, matchId),
  ),
  getMatchStatistics: handle("getMatchStatistics", ({ saveId, matchId, revealedEvents }, ctx) =>
    getMatchStatistics(ctx.savesDir, saveId, matchId, revealedEvents),
  ),
  getMatchRatings: handle("getMatchRatings", ({ saveId, matchId, revealedEvents }, ctx) =>
    getMatchRatings(ctx.savesDir, saveId, matchId, revealedEvents),
  ),
  getMatchReport: handle("getMatchReport", ({ saveId, matchId }, ctx) =>
    getMatchReport(ctx.savesDir, saveId, matchId),
  ),
  getMatchPlayerStats: handle("getMatchPlayerStats", ({ saveId, matchId, revealedEvents }, ctx) =>
    getMatchPlayerStats(ctx.savesDir, saveId, matchId, revealedEvents),
  ),
  getMatchOverview: handle("getMatchOverview", ({ saveId, matchId, revealedEvents }, ctx) =>
    getMatchOverview(ctx.savesDir, saveId, matchId, revealedEvents),
  ),
  submitMatchCommand: handle(
    "submitMatchCommand",
    ({ saveId, matchId, cursor, revealedEvents, minute, isHalftime, command }, ctx) =>
      submitMatchCommand(
        ctx.savesDir,
        saveId,
        matchId,
        cursor,
        revealedEvents,
        minute,
        isHalftime,
        command,
      ).pipe(withPlayersCommentary(ctx)),
  ),

  getTransfersScreen: handle("getTransfersScreen", ({ saveId }, ctx) =>
    getTransfersScreen(ctx.savesDir, saveId),
  ),
  getContractOffer: handle("getContractOffer", ({ saveId, playerId }, ctx) =>
    getContractOffer(ctx.savesDir, saveId, playerId),
  ),
  getContractExpiryScreen: handle("getContractExpiryScreen", ({ saveId }, ctx) =>
    getContractExpiryScreen(ctx.savesDir, saveId),
  ),
  getBudgetReviewScreen: handle("getBudgetReviewScreen", ({ saveId }, ctx) =>
    getBudgetReviewScreen(ctx.savesDir, saveId),
  ),
  getTransferHistoryScreen: handle("getTransferHistoryScreen", ({ saveId }, ctx) =>
    getTransferHistoryScreen(ctx.savesDir, saveId),
  ),
  placeBid: handle("placeBid", ({ saveId, playerId, amount }, ctx) =>
    placeBid(ctx.savesDir, saveId, playerId, amount),
  ),
  respondToBid: handle("respondToBid", ({ saveId, bidId, action, counterAmount }, ctx) =>
    respondToBid(ctx.savesDir, saveId, bidId, action, counterAmount),
  ),
  respondAsBidder: handle("respondAsBidder", ({ saveId, bidId, action }, ctx) =>
    respondAsBidder(ctx.savesDir, saveId, bidId, action),
  ),
  signFreeAgent: handle("signFreeAgent", ({ saveId, playerId, years, wage }, ctx) =>
    signFreeAgent(ctx.savesDir, saveId, playerId, { years, wage }),
  ),
  renewContract: handle("renewContract", ({ saveId, playerId, years }, ctx) =>
    renewContract(ctx.savesDir, saveId, playerId, years),
  ),

  assignScout: handle("assignScout", ({ saveId, scoutId, playerId }, ctx) =>
    assignScout(ctx.savesDir, saveId, scoutId, playerId),
  ),
  assignScoutToClub: handle("assignScoutToClub", ({ saveId, scoutId, clubId, expectedReportId }, ctx) =>
    assignScoutToClub(ctx.savesDir, saveId, scoutId, clubId, expectedReportId),
  ),
  unassignScout: handle("unassignScout", ({ saveId, scoutId }, ctx) =>
    unassignScout(ctx.savesDir, saveId, scoutId),
  ),
  getScouting: handle("getScouting", ({ saveId }, ctx) => getScouting(ctx.savesDir, saveId)),
  getScoutingKnowledge: handle("getScoutingKnowledge", ({ saveId }, ctx) =>
    getScoutingKnowledge(ctx.savesDir, saveId),
  ),
  getPlayerSearch: handle("getPlayerSearch", ({ saveId, query }, ctx) =>
    getPlayerSearch(ctx.savesDir, saveId, query),
  ),
  getPlayerComparison: handle("getPlayerComparison", ({ saveId, playerIds }, ctx) =>
    getPlayerComparison(ctx.savesDir, saveId, playerIds),
  ),
  getTeamScoutReport: handle("getTeamScoutReport", ({ saveId, clubId }, ctx) =>
    getTeamScoutReport(ctx.savesDir, saveId, clubId),
  ),
  getTeamScoutReadings: handle("getTeamScoutReadings", ({ saveId, clubId }, ctx) =>
    getTeamScoutReadings(ctx.savesDir, saveId, clubId),
  ),

  getClubSquad: handle("getClubSquad", ({ saveId, clubId }, ctx) =>
    getClubSquad(ctx.savesDir, saveId, clubId),
  ),
  getPlayerProfile: handle("getPlayerProfile", ({ saveId, playerId }, ctx) =>
    getPlayerProfile(ctx.savesDir, saveId, playerId),
  ),
  getPlayerContract: handle("getPlayerContract", ({ saveId, playerId }, ctx) =>
    getPlayerContract(ctx.savesDir, saveId, playerId),
  ),

  getCompetitions: handle("getCompetitions", ({ saveId }, ctx) =>
    getCompetitions(ctx.savesDir, saveId),
  ),
  getCompetitionOverview: handle("getCompetitionOverview", ({ saveId, competitionId }, ctx) =>
    getCompetitionOverview(ctx.savesDir, saveId, competitionId),
  ),
  getClubFinances: handle("getClubFinances", ({ saveId, clubId }, ctx) =>
    getClubFinances(ctx.savesDir, saveId, clubId),
  ),
  getBoardConfidence: handle("getBoardConfidence", ({ saveId }, ctx) =>
    getBoardConfidence(ctx.savesDir, saveId),
  ),
  getClubTransfers: handle("getClubTransfers", ({ saveId, clubId }, ctx) =>
    getClubTransfers(ctx.savesDir, saveId, clubId),
  ),
  getClubFixtures: handle("getClubFixtures", ({ saveId, clubId }, ctx) =>
    getClubFixtures(ctx.savesDir, saveId, clubId),
  ),
  getClubInformation: handle("getClubInformation", ({ saveId, clubId }, ctx) =>
    getClubInformation(ctx.savesDir, saveId, clubId),
  ),
  getClubStaff: handle("getClubStaff", ({ saveId, clubId }, ctx) =>
    getClubStaff(ctx.savesDir, saveId, clubId),
  ),
  getStaffProfile: handle("getStaffProfile", ({ saveId, clubId, key }, ctx) =>
    getStaffProfile(ctx.savesDir, saveId, clubId, key),
  ),

  setTrainingFocus: handle("setTrainingFocus", ({ saveId, playerId, focus }, ctx) =>
    setTrainingFocus(ctx.savesDir, saveId, playerId, focus),
  ),
  setRetrainingTarget: handle("setRetrainingTarget", ({ saveId, playerId, target }, ctx) =>
    setRetrainingTarget(ctx.savesDir, saveId, playerId, target),
  ),
  getCoachingAssignments: handle("getCoachingAssignments", ({ saveId }, ctx) =>
    getCoachingAssignments(ctx.savesDir, saveId),
  ),
  getWorkload: handle("getWorkload", ({ saveId }, ctx) => getWorkload(ctx.savesDir, saveId)),
  getPlayerDevelopmentHistory: handle("getPlayerDevelopmentHistory", ({ saveId, playerId }, ctx) =>
    getPlayerDevelopmentHistory(ctx.savesDir, saveId, playerId),
  ),
  getSquadDevelopment: handle("getSquadDevelopment", ({ saveId }, ctx) =>
    getSquadDevelopment(ctx.savesDir, saveId),
  ),
  getTrainingSchedule: handle("getTrainingSchedule", ({ saveId }, ctx) =>
    getTrainingSchedule(ctx.savesDir, saveId),
  ),
  changeTrainingSchedule: handle(
    "changeTrainingSchedule",
    ({ saveId, sessions, expectedRevision, requestId }, ctx) =>
      changeTrainingSchedule(ctx.savesDir, saveId, sessions, expectedRevision, requestId),
  ),
  setTrainingScheduleDelegation: handle(
    "setTrainingScheduleDelegation",
    ({ saveId, delegated, expectedRevision, requestId }, ctx) =>
      setTrainingScheduleDelegation(ctx.savesDir, saveId, delegated, expectedRevision, requestId),
  ),

  getKeyBindingOverrides: handle("getKeyBindingOverrides", (_payload, ctx) =>
    getKeyBindingOverrides(ctx.userDataDir),
  ),
  setKeyBindingOverride: handle("setKeyBindingOverride", ({ actionId, binding }, ctx) =>
    setKeyBindingOverride(ctx.userDataDir, actionId, binding),
  ),
  resetKeyBinding: handle("resetKeyBinding", ({ actionId }, ctx) =>
    resetKeyBinding(ctx.userDataDir, actionId),
  ),
  resetAllKeyBindings: handle("resetAllKeyBindings", (_payload, ctx) =>
    resetAllKeyBindings(ctx.userDataDir),
  ),

  getCommentaryFileStatus: handle("getCommentaryFileStatus", (_payload, ctx) =>
    commentaryFileStatus(ctx.userDataDir),
  ),
  openCommentaryFile: handle("openCommentaryFile", ({ target }, ctx) =>
    openCommentaryFile(ctx.userDataDir, target, ctx.openPath),
  ),
  resetCommentaryFile: handle("resetCommentaryFile", (_payload, ctx) =>
    resetCommentaryFile(ctx.userDataDir),
  ),
  updateCommentaryFile: handle("updateCommentaryFile", ({ addNewSections }, ctx) =>
    updateCommentaryFile(ctx.userDataDir, addNewSections),
  ),
  chooseCommentaryFile: handle("chooseCommentaryFile", ({ name }, ctx) =>
    chooseCommentaryFile(ctx.userDataDir, name),
  ),

  getNewsInbox: handle("getNewsInbox", ({ saveId }, ctx) => getNewsInbox(ctx.savesDir, saveId)),
  setNewsMessageState: handle("setNewsMessageState", ({ saveId, messageIds, patch }, ctx) =>
    setNewsMessageState(ctx.savesDir, saveId, messageIds, patch),
  ),

  getLeagueSetupIndex: handle("getLeagueSetupIndex", () => getLeagueSetupIndex),
  resolveLeagueSelection: handle("resolveLeagueSelection", ({ selectionRevision, intents }) =>
    resolveLeagueSelection(selectionRevision, intents),
  ),
  submitLeagueSelection: handle("submitLeagueSelection", ({ intents }, ctx) =>
    submitLeagueSelection(ctx.userDataDir, intents),
  ),
  getLeagueSelectionSnapshot: handle("getLeagueSelectionSnapshot", ({ id }, ctx) =>
    getLeagueSelectionSnapshot(ctx.userDataDir, id),
  ),
  saveSetupDraft: handle("saveSetupDraft", (draft, ctx) => saveSetupDraft(ctx.userDataDir, draft)),
  loadSetupDraft: handle("loadSetupDraft", (_payload, ctx) => loadSetupDraft(ctx.userDataDir)),
  buildLeaguePreset: handle("buildLeaguePreset", ({ preset }) => buildLeaguePresetIntents(preset)),
  listLeaguePresets: handle("listLeaguePresets", (_payload, ctx) => listLeaguePresets(ctx.userDataDir)),
  saveLeaguePreset: handle("saveLeaguePreset", ({ name, intents }, ctx) =>
    saveLeaguePreset(ctx.userDataDir, name, intents),
  ),
  applyLeaguePreset: handle("applyLeaguePreset", ({ id }, ctx) =>
    applyLeaguePreset(ctx.userDataDir, id),
  ),
};

export const handleRpc = (
  method: AppRpcMethod,
  payload: unknown,
  ctx: RpcContext,
): Effect.Effect<RpcResult<AppRpcMethod>> =>
  withWideEvent(
    // The dispatch is inherently dynamic: indexing by a union of methods yields a union of
    // handler types that cannot be called directly. The enforcement this type exists for happens at
    // each `handle` call site above, where the impl is checked against the method's error union.
    (handlers[method] as (payload: unknown, ctx: RpcContext) => Effect.Effect<unknown, unknown>)(
      payload,
      ctx,
    ),
    { method, saveId: saveIdOf(method, payload) },
  ).pipe(
    Effect.map((value) => ({ _tag: "Success", value }) as RpcResult<AppRpcMethod>),
    // Electron copies the reply with the structured clone algorithm, which keeps only the name and
    // message of an `Error`, and every tagged error is one. Encoding it with the method's error
    // schema turns it into plain data the renderer can decode. An error outside that union (a
    // payload that failed to decode) is sent as it is, and the renderer reports a contract decode
    // failure, as before.
    Effect.catch((error) =>
      Schema.encodeUnknownEffect(AppRpcs[method].error)(error).pipe(
        Effect.catch((encodeError) =>
          Effect.logWarning("RPC error did not encode with the method's error schema", {
            method,
            encodeError: String(encodeError),
          }).pipe(Effect.as(error)),
        ),
        Effect.map((encoded): RpcResult<AppRpcMethod> => ({ _tag: "Failure", error: encoded })),
      ),
    ),
  );
