import { type AppRpcs, type RpcPayload, type RpcSuccess, type SaveId } from "@cm-clone/contracts";
import { Layer } from "effect";
import type { Effect } from "effect";
import { Atom, Reactivity } from "effect/unstable/reactivity";
import { call } from "./call.js";
import type { RpcClientError } from "./errors.js";
import {
  economyKey,
  matchKey,
  saveKey,
  squadKey,
  tacticsKey,
  trainingKey,
  transfersKey,
} from "./queries.js";

/**
 * The registered Effect-Atom runtime the mutation fns run through. Its layer
 * merges the shared `Reactivity.layer`, built per-registry from the same memo
 * map `Atom.withReactivity` uses, so mutation invalidation reaches exactly the
 * registry whose queries are mounted. Screens never see this runtime — they
 * get a `useAtomSet(mutation)` handle from the seam.
 */
export const rpcRuntime = Atom.runtime(Layer.empty);

/**
 * Declared invalidation domains per mutation, collocated with the effects so
 * the rule and the code cannot drift. No wildcards, no cascades: a mutation
 * invalidates only what it can authoritatively change.
 */
export const INVALIDATION_RULES = {
  advanceCalendar: (saveId: SaveId): ReadonlyArray<unknown> => [saveKey(saveId)],
  setTrainingFocus: (saveId: SaveId): ReadonlyArray<unknown> => [
    squadKey(saveId),
    trainingKey(saveId),
  ],
  placeBid: (saveId: SaveId): ReadonlyArray<unknown> => [
    transfersKey(saveId),
    economyKey(saveId),
  ],
  submitMatchCommand: (saveId: SaveId, matchId: string): ReadonlyArray<unknown> => [
    matchKey(saveId, matchId),
  ],
  commitCareer: (_saveId: SaveId): ReadonlyArray<unknown> => [],
} as const;

export type MutationName = keyof typeof INVALIDATION_RULES;

type MutationEffect<M extends keyof typeof AppRpcs> = Effect.Effect<
  RpcSuccess<M>,
  RpcClientError<M>,
  Reactivity.Reactivity
>;

/** `advanceCalendar` — after success only, invalidates `["save", saveId]`. */
export const advanceCalendarEffect = (
  saveId: SaveId,
): MutationEffect<"advanceCalendar"> =>
  call("advanceCalendar", { saveId }).pipe(
    Reactivity.mutation(INVALIDATION_RULES.advanceCalendar(saveId)),
  );

/** `changeTactics` — invalidates `["tactics", saveId]` and the save-wide key. */
export const changeTacticsEffect = (
  input: RpcPayload<"changeTactics">,
): MutationEffect<"changeTactics"> =>
  call("changeTactics", input).pipe(
    Reactivity.mutation([tacticsKey(input.saveId), saveKey(input.saveId)]),
  );

/** `placeBid` — invalidates transfers + economy, never squad (a pending bid does not change squad state). */
export const placeBidEffect = (
  input: RpcPayload<"placeBid">,
): MutationEffect<"placeBid"> =>
  call("placeBid", input).pipe(Reactivity.mutation(INVALIDATION_RULES.placeBid(input.saveId)));

/** `signFreeAgent` — invalidates transfers + economy. */
export const signFreeAgentEffect = (
  input: RpcPayload<"signFreeAgent">,
): MutationEffect<"signFreeAgent"> =>
  call("signFreeAgent", input).pipe(
    Reactivity.mutation(INVALIDATION_RULES.placeBid(input.saveId)),
  );

/** `respondToBid` — invalidates transfers + economy. */
export const respondToBidEffect = (
  input: RpcPayload<"respondToBid">,
): MutationEffect<"respondToBid"> =>
  call("respondToBid", input).pipe(Reactivity.mutation(INVALIDATION_RULES.placeBid(input.saveId)));

/** `respondAsBidder` — invalidates transfers + economy. */
export const respondAsBidderEffect = (
  input: RpcPayload<"respondAsBidder">,
): MutationEffect<"respondAsBidder"> =>
  call("respondAsBidder", input).pipe(Reactivity.mutation(INVALIDATION_RULES.placeBid(input.saveId)));

/** `renewContract` has no shipped consumer in this stage; its invalidation is covered by `INVALIDATION_RULES` when a screen exists. */

/** `submitMatchCommand` — invalidates `["match", saveId, matchId]` only.
 * A command is the only mutation that must never touch calendar/transfers data.
 */
export const submitMatchCommandEffect = (
  input: RpcPayload<"submitMatchCommand">,
): MutationEffect<"submitMatchCommand"> =>
  call("submitMatchCommand", input).pipe(
    Reactivity.mutation(INVALIDATION_RULES.submitMatchCommand(input.saveId, input.matchId)),
  );

/** `advanceCalendar` — mutation atom for registry-scoped invalidation. */
export const advanceCalendarMutation = rpcRuntime.fn((input: RpcPayload<"advanceCalendar">) =>
  advanceCalendarEffect(input.saveId),
);

/** `changeTactics` — mutation atom. */
export const changeTacticsMutation = rpcRuntime.fn((input: RpcPayload<"changeTactics">) =>
  changeTacticsEffect(input),
);

/** `placeBid` — mutation atom. */
export const placeBidMutation = rpcRuntime.fn((input: RpcPayload<"placeBid">) =>
  placeBidEffect(input),
);

/** `signFreeAgent` — mutation atom. */
export const signFreeAgentMutation = rpcRuntime.fn((input: RpcPayload<"signFreeAgent">) =>
  signFreeAgentEffect(input),
);

/** `respondToBid` — mutation atom. */
export const respondToBidMutation = rpcRuntime.fn((input: RpcPayload<"respondToBid">) =>
  respondToBidEffect(input),
);

/** `respondAsBidder` — mutation atom. */
export const respondAsBidderMutation = rpcRuntime.fn((input: RpcPayload<"respondAsBidder">) =>
  respondAsBidderEffect(input),
);

/** `submitMatchCommand` — mutation atom. */
export const submitMatchCommandMutation = rpcRuntime.fn(
  (input: RpcPayload<"submitMatchCommand">) => submitMatchCommandEffect(input),
);