import path from "node:path";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { AppRpcs, type AppRpcMethod, type RpcResult } from "@cm-clone/contracts";
import { Effect, Schema } from "effect";
import { getClubSelection } from "./clubSelection.js";
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
} from "./leagueSelection.js";
import {
  getKeyBindingOverrides,
  resetAllKeyBindings,
  resetKeyBinding,
  setKeyBindingOverride,
} from "./keybindings.js";
import { listOpponentClubs, resumeSimulation, startMatch, submitMatchCommand } from "./match.js";
import { getManagerProfile, getManagerProfileScreen } from "./managerProfile.js";
import { getNewsInbox, setNewsMessageState } from "./news.js";
import { advanceCalendar, getFixtures, getLeagueTable, getSeasonSummary, retireManager } from "./season/index.js";
import { beginCareer, commitCareer, createSave, discardCareer, listSaves, loadSave } from "./saves.js";
import { getSquad } from "./squad.js";
import { changeTactics, getTactics } from "./tactics.js";
import {
  getTransfersScreen,
  placeBid,
  renewContract,
  respondAsBidder,
  respondToBid,
  signFreeAgent,
} from "./transfers/index.js";
import { setTrainingFocus } from "./training.js";
import { assignScout, getScouting, unassignScout } from "./scouting.js";
import { withWideEvent } from "./logging.js";

export interface RpcContext {
  readonly savesDir: string;
  /** Electron `userData` — the parent of `saves/`; the machine-local override file lives here. */
  readonly userDataDir: string;
}

type Handler = (payload: unknown, ctx: RpcContext) => Effect.Effect<unknown, unknown>;

/** Extract a save-scoped id from a payload when the method carries one, so the
 *  wide event can attribute the request to a save without decoding it. */
const saveIdOf = (method: AppRpcMethod, payload: unknown): string | null => {
  if (payload === null || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  return typeof record["saveId"] === "string" ? record["saveId"] : null;
};

const handlers: Record<AppRpcMethod, Handler> = {
  ping: () => Effect.succeed("pong"),

  // League and Nation Selection (Screen 3). Every one of these re-validates against the catalogue
  // in `leagueSelection.ts`; none of them trusts a resolved selection the renderer computed.
  getLeagueSetupIndex: () => getLeagueSetupIndex,
  resolveLeagueSelection: (payload) =>
    Effect.gen(function* () {
      const { selectionRevision, intents } = yield* Schema.decodeUnknownEffect(
        AppRpcs.resolveLeagueSelection.payload,
      )(payload);
      return yield* resolveLeagueSelection(selectionRevision, intents);
    }),
  submitLeagueSelection: (payload, ctx) =>
    Effect.gen(function* () {
      const { intents } = yield* Schema.decodeUnknownEffect(AppRpcs.submitLeagueSelection.payload)(payload);
      return yield* submitLeagueSelection(ctx.userDataDir, intents);
    }),
  getLeagueSelectionSnapshot: (payload, ctx) =>
    Effect.gen(function* () {
      const { id } = yield* Schema.decodeUnknownEffect(AppRpcs.getLeagueSelectionSnapshot.payload)(payload);
      return yield* getLeagueSelectionSnapshot(ctx.userDataDir, id);
    }),
  saveSetupDraft: (payload, ctx) =>
    Effect.gen(function* () {
      const draft = yield* Schema.decodeUnknownEffect(AppRpcs.saveSetupDraft.payload)(payload);
      return yield* saveSetupDraft(ctx.userDataDir, draft);
    }),
  loadSetupDraft: (_payload, ctx) => loadSetupDraft(ctx.userDataDir),
  buildLeaguePreset: (payload) =>
    Effect.gen(function* () {
      const { preset } = yield* Schema.decodeUnknownEffect(AppRpcs.buildLeaguePreset.payload)(payload);
      return yield* buildLeaguePresetIntents(preset);
    }),
  listLeaguePresets: (_payload, ctx) => listLeaguePresets(ctx.userDataDir),
  saveLeaguePreset: (payload, ctx) =>
    Effect.gen(function* () {
      const { name, intents } = yield* Schema.decodeUnknownEffect(AppRpcs.saveLeaguePreset.payload)(payload);
      return yield* saveLeaguePreset(ctx.userDataDir, name, intents);
    }),
  applyLeaguePreset: (payload, ctx) =>
    Effect.gen(function* () {
      const { id } = yield* Schema.decodeUnknownEffect(AppRpcs.applyLeaguePreset.payload)(payload);
      return yield* applyLeaguePreset(ctx.userDataDir, id);
    }),

  listSaves: (_payload, ctx) => listSaves(ctx.savesDir),
  createSave: (payload, ctx) =>
    Effect.gen(function* () {
      const { name } = yield* Schema.decodeUnknownEffect(AppRpcs.createSave.payload)(payload);
      return yield* createSave(ctx.savesDir, name, ctx.userDataDir);
    }),
  beginCareer: (payload, ctx) =>
    Effect.gen(function* () {
      const { snapshotId } = yield* Schema.decodeUnknownEffect(AppRpcs.beginCareer.payload)(payload);
      return yield* beginCareer(ctx.savesDir, { userDataDir: ctx.userDataDir, snapshotId });
    }),
  commitCareer: (payload, ctx) =>
    Effect.gen(function* () {
      const { id, name, selectedClubId, managerName, archetypeOrigin, pillars } = yield* Schema.decodeUnknownEffect(AppRpcs.commitCareer.payload)(payload);
      return yield* commitCareer(ctx.savesDir, id, name, selectedClubId, { managerName, archetypeOrigin, pillars });
    }),
  discardCareer: (payload, ctx) =>
    Effect.gen(function* () {
      const { id } = yield* Schema.decodeUnknownEffect(AppRpcs.discardCareer.payload)(payload);
      return yield* discardCareer(ctx.savesDir, id);
    }),
  getManagerProfile: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId } = yield* Schema.decodeUnknownEffect(AppRpcs.getManagerProfile.payload)(payload);
      return yield* getManagerProfile(ctx.savesDir, saveId);
    }),
  getManagerProfileScreen: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId } = yield* Schema.decodeUnknownEffect(AppRpcs.getManagerProfileScreen.payload)(payload);
      return yield* getManagerProfileScreen(ctx.savesDir, saveId);
    }),
  getClubSelection: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId } = yield* Schema.decodeUnknownEffect(AppRpcs.getClubSelection.payload)(payload);
      return yield* getClubSelection.pipe(
        Effect.provide(SqliteClient.layer({ filename: path.join(ctx.savesDir, `${saveId}.sqlite`) })),
        Effect.scoped,
      );
    }),
  loadSave: (payload, ctx) =>
    Effect.gen(function* () {
      const { id } = yield* Schema.decodeUnknownEffect(AppRpcs.loadSave.payload)(payload);
      return yield* loadSave(ctx.savesDir, id);
    }),
  getSquad: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId } = yield* Schema.decodeUnknownEffect(AppRpcs.getSquad.payload)(payload);
      return yield* getSquad(ctx.savesDir, saveId);
    }),
  getTactics: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId } = yield* Schema.decodeUnknownEffect(AppRpcs.getTactics.payload)(payload);
      return yield* getTactics(ctx.savesDir, saveId);
    }),
  changeTactics: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId, tactic } = yield* Schema.decodeUnknownEffect(AppRpcs.changeTactics.payload)(
        payload,
      );
      return yield* changeTactics(ctx.savesDir, saveId, tactic);
    }),
  getLeagueTable: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId } = yield* Schema.decodeUnknownEffect(AppRpcs.getLeagueTable.payload)(payload);
      return yield* getLeagueTable(ctx.savesDir, saveId);
    }),
  getFixtures: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId } = yield* Schema.decodeUnknownEffect(AppRpcs.getFixtures.payload)(payload);
      return yield* getFixtures(ctx.savesDir, saveId);
    }),
  advanceCalendar: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId } = yield* Schema.decodeUnknownEffect(AppRpcs.advanceCalendar.payload)(payload);
      return yield* advanceCalendar(ctx.savesDir, saveId);
    }),
  retireManager: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId } = yield* Schema.decodeUnknownEffect(AppRpcs.retireManager.payload)(payload);
      return yield* retireManager(ctx.savesDir, saveId);
    }),
  getSeasonSummary: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId } = yield* Schema.decodeUnknownEffect(AppRpcs.getSeasonSummary.payload)(payload);
      return yield* getSeasonSummary(ctx.savesDir, saveId);
    }),
  listOpponentClubs: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId } = yield* Schema.decodeUnknownEffect(AppRpcs.listOpponentClubs.payload)(payload);
      return yield* listOpponentClubs(ctx.savesDir, saveId);
    }),
  startMatch: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId, opponentClubId } = yield* Schema.decodeUnknownEffect(AppRpcs.startMatch.payload)(
        payload,
      );
      return yield* startMatch(ctx.savesDir, saveId, opponentClubId);
    }),
  resumeSimulation: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId, matchId, cursor } = yield* Schema.decodeUnknownEffect(
        AppRpcs.resumeSimulation.payload,
      )(payload);
      return yield* resumeSimulation(ctx.savesDir, saveId, matchId, cursor);
    }),
  submitMatchCommand: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId, matchId, cursor, minute, isHalftime, command } = yield* Schema.decodeUnknownEffect(
        AppRpcs.submitMatchCommand.payload,
      )(payload);
      return yield* submitMatchCommand(ctx.savesDir, saveId, matchId, cursor, minute, isHalftime, command);
    }),
  getTransfersScreen: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId } = yield* Schema.decodeUnknownEffect(AppRpcs.getTransfersScreen.payload)(payload);
      return yield* getTransfersScreen(ctx.savesDir, saveId);
    }),
  placeBid: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId, playerId, amount } = yield* Schema.decodeUnknownEffect(AppRpcs.placeBid.payload)(
        payload,
      );
      return yield* placeBid(ctx.savesDir, saveId, playerId, amount);
    }),
  respondToBid: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId, bidId, action, counterAmount } = yield* Schema.decodeUnknownEffect(
        AppRpcs.respondToBid.payload,
      )(payload);
      return yield* respondToBid(ctx.savesDir, saveId, bidId, action, counterAmount);
    }),
  respondAsBidder: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId, bidId, action } = yield* Schema.decodeUnknownEffect(
        AppRpcs.respondAsBidder.payload,
      )(payload);
      return yield* respondAsBidder(ctx.savesDir, saveId, bidId, action);
    }),
  signFreeAgent: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId, playerId, years } = yield* Schema.decodeUnknownEffect(
        AppRpcs.signFreeAgent.payload,
      )(payload);
      return yield* signFreeAgent(ctx.savesDir, saveId, playerId, years);
    }),
  renewContract: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId, playerId, years } = yield* Schema.decodeUnknownEffect(
        AppRpcs.renewContract.payload,
      )(payload);
      return yield* renewContract(ctx.savesDir, saveId, playerId, years);
    }),
  setTrainingFocus: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId, playerId, focus } = yield* Schema.decodeUnknownEffect(
        AppRpcs.setTrainingFocus.payload,
      )(payload);
      return yield* setTrainingFocus(ctx.savesDir, saveId, playerId, focus);
    }),
  assignScout: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId, scoutId, playerId } = yield* Schema.decodeUnknownEffect(
        AppRpcs.assignScout.payload,
      )(payload);
      return yield* assignScout(ctx.savesDir, saveId, scoutId, playerId);
    }),
  unassignScout: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId, scoutId } = yield* Schema.decodeUnknownEffect(
        AppRpcs.unassignScout.payload,
      )(payload);
      return yield* unassignScout(ctx.savesDir, saveId, scoutId);
    }),
  getScouting: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId } = yield* Schema.decodeUnknownEffect(AppRpcs.getScouting.payload)(payload);
      return yield* getScouting(ctx.savesDir, saveId);
    }),
  getKeyBindingOverrides: (_payload, ctx) => getKeyBindingOverrides(ctx.userDataDir),
  setKeyBindingOverride: (payload, ctx) =>
    Effect.gen(function* () {
      const { actionId, binding } = yield* Schema.decodeUnknownEffect(
        AppRpcs.setKeyBindingOverride.payload,
      )(payload);
      return yield* setKeyBindingOverride(ctx.userDataDir, actionId, binding);
    }),
  resetKeyBinding: (payload, ctx) =>
    Effect.gen(function* () {
      const { actionId } = yield* Schema.decodeUnknownEffect(AppRpcs.resetKeyBinding.payload)(
        payload,
      );
      return yield* resetKeyBinding(ctx.userDataDir, actionId);
    }),
  resetAllKeyBindings: (_payload, ctx) => resetAllKeyBindings(ctx.userDataDir),
  getNewsInbox: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId } = yield* Schema.decodeUnknownEffect(AppRpcs.getNewsInbox.payload)(payload);
      return yield* getNewsInbox(ctx.savesDir, saveId);
    }),
  setNewsMessageState: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId, messageIds, patch } = yield* Schema.decodeUnknownEffect(
        AppRpcs.setNewsMessageState.payload,
      )(payload);
      return yield* setNewsMessageState(ctx.savesDir, saveId, messageIds, patch);
    }),
};

export const handleRpc = (
  method: AppRpcMethod,
  payload: unknown,
  ctx: RpcContext,
): Effect.Effect<RpcResult<AppRpcMethod>> =>
  withWideEvent(
    handlers[method](payload, ctx),
    { method, saveId: saveIdOf(method, payload) },
  ).pipe(
    Effect.map((value) => ({ _tag: "Success", value }) as RpcResult<AppRpcMethod>),
    Effect.catch((error) =>
      Effect.succeed<RpcResult<AppRpcMethod>>({ _tag: "Failure", error }),
    ),
  );
