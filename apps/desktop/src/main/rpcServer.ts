import path from "node:path";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { AppRpcs, type AppRpcMethod, type RpcResult } from "@cm-clone/contracts";
import { Effect, Schema } from "effect";
import { getClubSelection } from "./clubSelection.js";
import { listOpponentClubs, resumeSimulation, startMatch, submitMatchCommand } from "./match.js";
import { getManagerProfile } from "./managerProfile.js";
import { advanceCalendar, getFixtures, getLeagueTable, getSeasonSummary } from "./season.js";
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
} from "./transfers.js";
import { setTrainingFocus } from "./training.js";

export interface RpcContext {
  readonly savesDir: string;
}

type Handler = (payload: unknown, ctx: RpcContext) => Effect.Effect<unknown, unknown>;

const handlers: Record<AppRpcMethod, Handler> = {
  ping: () => Effect.succeed("pong"),
  listSaves: (_payload, ctx) => listSaves(ctx.savesDir),
  createSave: (payload, ctx) =>
    Effect.gen(function* () {
      const { name } = yield* Schema.decodeUnknownEffect(AppRpcs.createSave.payload)(payload);
      return yield* createSave(ctx.savesDir, name);
    }),
  beginCareer: (_payload, ctx) =>
    Effect.gen(function* () {
      return yield* beginCareer(ctx.savesDir);
    }),
  commitCareer: (payload, ctx) =>
    Effect.gen(function* () {
      const { id, name, selectedClubId, managerName, archetypeOrigin, tacticalAcumen, influence, regimen, technicalCoaching } = yield* Schema.decodeUnknownEffect(AppRpcs.commitCareer.payload)(payload);
      return yield* commitCareer(ctx.savesDir, id, name, selectedClubId, { managerName, archetypeOrigin, tacticalAcumen, influence, regimen, technicalCoaching });
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
};

export const handleRpc = (
  method: AppRpcMethod,
  payload: unknown,
  ctx: RpcContext,
): Effect.Effect<RpcResult<AppRpcMethod>> =>
  handlers[method](payload, ctx).pipe(
    Effect.map((value) => ({ _tag: "Success", value }) as RpcResult<AppRpcMethod>),
    Effect.catch((error) =>
      Effect.succeed<RpcResult<AppRpcMethod>>({ _tag: "Failure", error }),
    ),
  );
