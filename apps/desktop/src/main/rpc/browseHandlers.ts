/**
 * The club- and competition-scoped browse handlers.
 *
 * Split out of `rpcServer.ts` when that file crossed the 600-line ceiling, and along this seam
 * rather than an arbitrary one: these eight are the read-only surfaces reached *with a target in
 * hand* — a club or a competition — as opposed to the save-scoped screens the manager navigates to
 * directly. They arrived together over group-c tickets 06-08 and group-l tickets 07-10, and they
 * change together.
 *
 * The map stays exhaustive because `rpcServer.ts` spreads this in and then types the whole against
 * `{ [M in AppRpcMethod]: Handler<M> }`. A method missing from both is still a compile error, at
 * the same place it always was.
 */
import { AppRpcs } from "@cm-clone/contracts";
import { Effect, Schema } from "effect";
import { getClubInformation } from "../club/clubInformation.js";
import {
  getBoardConfidence,
  getClubFixtures,
  getCompetitionOverview,
  getCompetitions,
} from "../season/queries.js";
import { getClubFinances } from "../transfers/budgetReview.js";
import { getClubTransfers } from "../transfers/transferHistory.js";
import type { Handler } from "./rpcServer.js";

type BrowseMethod =
  | "getCompetitions"
  | "getCompetitionOverview"
  | "getClubFinances"
  | "getBoardConfidence"
  | "getClubTransfers"
  | "getClubFixtures"
  | "getClubInformation";

export const browseHandlers: { readonly [M in BrowseMethod]: Handler<M> } = {
  getCompetitions: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId } = yield* Schema.decodeUnknownEffect(AppRpcs.getCompetitions.payload)(payload);
      return yield* getCompetitions(ctx.savesDir, saveId);
    }),
  getCompetitionOverview: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId, competitionId } = yield* Schema.decodeUnknownEffect(
        AppRpcs.getCompetitionOverview.payload,
      )(payload);
      return yield* getCompetitionOverview(ctx.savesDir, saveId, competitionId);
    }),
  getClubFinances: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId, clubId } = yield* Schema.decodeUnknownEffect(
        AppRpcs.getClubFinances.payload,
      )(payload);
      return yield* getClubFinances(ctx.savesDir, saveId, clubId);
    }),
  getBoardConfidence: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId } = yield* Schema.decodeUnknownEffect(AppRpcs.getBoardConfidence.payload)(
        payload,
      );
      return yield* getBoardConfidence(ctx.savesDir, saveId);
    }),
  getClubTransfers: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId, clubId } = yield* Schema.decodeUnknownEffect(
        AppRpcs.getClubTransfers.payload,
      )(payload);
      return yield* getClubTransfers(ctx.savesDir, saveId, clubId);
    }),
  getClubFixtures: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId, clubId } = yield* Schema.decodeUnknownEffect(
        AppRpcs.getClubFixtures.payload,
      )(payload);
      return yield* getClubFixtures(ctx.savesDir, saveId, clubId);
    }),
  getClubInformation: (payload, ctx) =>
    Effect.gen(function* () {
      const { saveId, clubId } = yield* Schema.decodeUnknownEffect(
        AppRpcs.getClubInformation.payload,
      )(payload);
      return yield* getClubInformation(ctx.savesDir, saveId, clubId);
    }),
};
