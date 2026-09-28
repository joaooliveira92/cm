/**
 * The Training area's handlers: Training Focus, coaching, workload, development, and the team
 * training schedule.
 *
 * Split out of `rpcServer.ts` when the training schedule's two methods would have taken that file
 * past the 600-line ceiling. The seam is the Training area: these methods serve the screens under
 * `/training` and change together. `rpcServer.ts` spreads this in and types the whole against
 * `{ [M in AppRpcMethod]: Handler<M> }`, so a method missing from both is still a compile error.
 */
import { AppRpcs } from "@cm-clone/contracts";
import { Effect, Schema } from "effect";
import {
  getCoachingAssignments,
  getPlayerDevelopmentHistory,
  getSquadDevelopment,
  getWorkload,
  setTrainingFocus,
} from "../club/training.js";
import { changeTrainingSchedule, getTrainingSchedule } from "../club/trainingSchedule.js";
import type { Handler } from "./rpcServer.js";

type TrainingMethod =
  | "setTrainingFocus"
  | "getCoachingAssignments"
  | "getWorkload"
  | "getPlayerDevelopmentHistory"
  | "getSquadDevelopment"
  | "getTrainingSchedule"
  | "changeTrainingSchedule";

export const trainingHandlers: { readonly [M in TrainingMethod]: Handler<M> } = {
  setTrainingFocus: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId, playerId, focus } = yield* Schema.decodeUnknownEffect(
        AppRpcs.setTrainingFocus.payload,
      )(payload);
      return yield* setTrainingFocus(ctx.savesDir, saveId, playerId, focus);
    }),
  getCoachingAssignments: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId } = yield* Schema.decodeUnknownEffect(AppRpcs.getCoachingAssignments.payload)(
        payload,
      );
      return yield* getCoachingAssignments(ctx.savesDir, saveId);
    }),
  getWorkload: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId } = yield* Schema.decodeUnknownEffect(AppRpcs.getWorkload.payload)(payload);
      return yield* getWorkload(ctx.savesDir, saveId);
    }),
  getPlayerDevelopmentHistory: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId, playerId } = yield* Schema.decodeUnknownEffect(
        AppRpcs.getPlayerDevelopmentHistory.payload,
      )(payload);
      return yield* getPlayerDevelopmentHistory(ctx.savesDir, saveId, playerId);
    }),
  getSquadDevelopment: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId } = yield* Schema.decodeUnknownEffect(AppRpcs.getSquadDevelopment.payload)(payload);
      return yield* getSquadDevelopment(ctx.savesDir, saveId);
    }),
  getTrainingSchedule: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId } = yield* Schema.decodeUnknownEffect(AppRpcs.getTrainingSchedule.payload)(payload);
      return yield* getTrainingSchedule(ctx.savesDir, saveId);
    }),
  changeTrainingSchedule: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId, sessions, expectedRevision, requestId } = yield* Schema.decodeUnknownEffect(
        AppRpcs.changeTrainingSchedule.payload,
      )(payload);
      return yield* changeTrainingSchedule(ctx.savesDir, saveId, sessions, expectedRevision, requestId);
    }),
};
