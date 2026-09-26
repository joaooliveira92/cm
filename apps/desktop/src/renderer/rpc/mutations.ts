import { type AppRpcs, type RpcPayload, type RpcSuccess, type SaveId } from "@cm-clone/contracts";
import { Layer } from "effect";
import type { Effect } from "effect";
import { Atom, Reactivity } from "effect/unstable/reactivity";
import { call } from "./call.js";
import type { RpcClientError } from "./errors.js";
import {
  economyKey,
  matchKey,
  newsKey,
  saveKey,
  scoutingKey,
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
  /** Starting a match links the awaiting Fixture to it (`PendingFixtureView.matchId`), and accepting
   *  its result clears that link and plays the Matchday, so both change the season read and invalidate
   *  the save-wide key (group-g-match-day 41). */
  startMatch: (saveId: SaveId): ReadonlyArray<unknown> => [saveKey(saveId)],
  commitMatchday: (saveId: SaveId): ReadonlyArray<unknown> => [saveKey(saveId)],
  setTrainingFocus: (saveId: SaveId): ReadonlyArray<unknown> => [
    squadKey(saveId),
    trainingKey(saveId),
  ],
  placeBid: (saveId: SaveId): ReadonlyArray<unknown> => [
    transfersKey(saveId),
    economyKey(saveId),
  ],
  /** Signing a Free Agent, or answering a bid either way, can complete a transfer on the spot: a
   *  player joins or leaves the squad and a Contract is written or dropped. So beside transfers and
   *  economy it invalidates the squad key, which the squad reads and the short-squad advisory's
   *  Contract Expiry read follow (gate-red-on-dev 08). */
  completeTransfer: (saveId: SaveId): ReadonlyArray<unknown> => [
    squadKey(saveId),
    transfersKey(saveId),
    economyKey(saveId),
  ],
  submitMatchCommand: (saveId: SaveId, matchId: string): ReadonlyArray<unknown> => [
    matchKey(saveId, matchId),
  ],
  /** Retiring archives the save, which changes every save-scoped read (the badge, every guard's
   * answer), so it invalidates the save-wide key and nothing narrower. */
  retireManager: (saveId: SaveId): ReadonlyArray<unknown> => [saveKey(saveId)],
  commitCareer: (_saveId: SaveId): ReadonlyArray<unknown> => [],
  /** Read/flagged/archived is inbox-local user state: it changes no simulation state, so it
   * invalidates the inbox key and nothing wider. */
  setNewsMessageState: (saveId: SaveId): ReadonlyArray<unknown> => [newsKey(saveId)],
  /** A scouting assignment changes who is watching whom and nothing else, so it invalidates the
   * scouting key — which the scouting board and every Team Scout Report read — and nothing wider. */
  assignScoutToClub: (saveId: SaveId): ReadonlyArray<unknown> => [scoutingKey(saveId)],
  /** Ending an assignment frees a scout and files the reading a Club watch leaves behind, both of
   * which the scouting key covers, so it invalidates exactly what assigning does. */
  unassignScout: (saveId: SaveId): ReadonlyArray<unknown> => [scoutingKey(saveId)],
  /** A renewal rewrites one own-club Contract's wage and length. The squad key covers the Player's
   * contract and profile reads; transfers and economy cover the Wage Budget used. */
  renewContract: (saveId: SaveId): ReadonlyArray<unknown> => [
    squadKey(saveId),
    transfersKey(saveId),
    economyKey(saveId),
  ],
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

/** `startMatch` — after success only, invalidates `["save", saveId]`. */
export const startMatchEffect = (input: RpcPayload<"startMatch">): MutationEffect<"startMatch"> =>
  call("startMatch", input).pipe(Reactivity.mutation(INVALIDATION_RULES.startMatch(input.saveId)));

/** `commitMatchday` — the career accepting the match's result; after success only, invalidates
 *  `["save", saveId]`. Explicit, because `resumeSimulation` is a read and must never be what commits a
 *  Matchday. */
export const commitMatchdayEffect = (input: RpcPayload<"commitMatchday">): MutationEffect<"commitMatchday"> =>
  call("commitMatchday", input).pipe(Reactivity.mutation(INVALIDATION_RULES.commitMatchday(input.saveId)));

/** `retireManager` — after success only, invalidates `["save", saveId]`. */
export const retireManagerEffect = (saveId: SaveId): MutationEffect<"retireManager"> =>
  call("retireManager", { saveId }).pipe(
    Reactivity.mutation(INVALIDATION_RULES.retireManager(saveId)),
  );

/** `setNewsMessageState` — invalidates `["news", saveId]` only. */
export const setNewsMessageStateEffect = (
  input: RpcPayload<"setNewsMessageState">,
): MutationEffect<"setNewsMessageState"> =>
  call("setNewsMessageState", input).pipe(
    Reactivity.mutation(INVALIDATION_RULES.setNewsMessageState(input.saveId)),
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

/** `signFreeAgent` — invalidates squad + transfers + economy (it completes a transfer). */
export const signFreeAgentEffect = (
  input: RpcPayload<"signFreeAgent">,
): MutationEffect<"signFreeAgent"> =>
  call("signFreeAgent", input).pipe(
    Reactivity.mutation(INVALIDATION_RULES.completeTransfer(input.saveId)),
  );

/** `respondToBid` — invalidates squad + transfers + economy (accepting completes a transfer). */
export const respondToBidEffect = (
  input: RpcPayload<"respondToBid">,
): MutationEffect<"respondToBid"> =>
  call("respondToBid", input).pipe(Reactivity.mutation(INVALIDATION_RULES.completeTransfer(input.saveId)));

/** `respondAsBidder` — invalidates squad + transfers + economy (accepting completes a transfer). */
export const respondAsBidderEffect = (
  input: RpcPayload<"respondAsBidder">,
): MutationEffect<"respondAsBidder"> =>
  call("respondAsBidder", input).pipe(Reactivity.mutation(INVALIDATION_RULES.completeTransfer(input.saveId)));

/** `renewContract` — invalidates squad + transfers + economy. */
export const renewContractEffect = (
  input: RpcPayload<"renewContract">,
): MutationEffect<"renewContract"> =>
  call("renewContract", input).pipe(
    Reactivity.mutation(INVALIDATION_RULES.renewContract(input.saveId)),
  );

/** `submitMatchCommand` — invalidates `["match", saveId, matchId]` only.
 * A command is the only mutation that must never touch calendar/transfers data.
 */
export const submitMatchCommandEffect = (
  input: RpcPayload<"submitMatchCommand">,
): MutationEffect<"submitMatchCommand"> =>
  call("submitMatchCommand", input).pipe(
    Reactivity.mutation(INVALIDATION_RULES.submitMatchCommand(input.saveId, input.matchId)),
  );

/** `assignScoutToClub` — invalidates `["scouting", saveId]` only. */
export const assignScoutToClubEffect = (
  input: RpcPayload<"assignScoutToClub">,
): MutationEffect<"assignScoutToClub"> =>
  call("assignScoutToClub", input).pipe(
    Reactivity.mutation(INVALIDATION_RULES.assignScoutToClub(input.saveId)),
  );

/** `assignScoutToClub` — mutation atom. */
export const assignScoutToClubMutation = rpcRuntime.fn(
  (input: RpcPayload<"assignScoutToClub">) => assignScoutToClubEffect(input),
);

/** `unassignScout` — invalidates `["scouting", saveId]` only. */
export const unassignScoutEffect = (
  input: RpcPayload<"unassignScout">,
): MutationEffect<"unassignScout"> =>
  call("unassignScout", input).pipe(
    Reactivity.mutation(INVALIDATION_RULES.unassignScout(input.saveId)),
  );

/** `unassignScout` — mutation atom. */
export const unassignScoutMutation = rpcRuntime.fn(
  (input: RpcPayload<"unassignScout">) => unassignScoutEffect(input),
);

/** `setTrainingFocus` effect — invalidates squad + training keys. */
export const setTrainingFocusEffect = (
  input: RpcPayload<"setTrainingFocus">,
): MutationEffect<"setTrainingFocus"> =>
  call("setTrainingFocus", input).pipe(
    Reactivity.mutation(INVALIDATION_RULES.setTrainingFocus(input.saveId)),
  );

/** `setTrainingFocus` mutation atom. */
export const setTrainingFocusMutation = rpcRuntime.fn(
  (input: RpcPayload<"setTrainingFocus">) => setTrainingFocusEffect(input),
);

/** `advanceCalendar` — mutation atom for registry-scoped invalidation. */
export const advanceCalendarMutation = rpcRuntime.fn((input: RpcPayload<"advanceCalendar">) =>
  advanceCalendarEffect(input.saveId),
);

/** `startMatch` — mutation atom. */
export const startMatchMutation = rpcRuntime.fn((input: RpcPayload<"startMatch">) => startMatchEffect(input));

/** `commitMatchday` — mutation atom. */
export const commitMatchdayMutation = rpcRuntime.fn((input: RpcPayload<"commitMatchday">) =>
  commitMatchdayEffect(input),
);

/** `retireManager` — mutation atom. */
export const retireManagerMutation = rpcRuntime.fn((input: RpcPayload<"retireManager">) =>
  retireManagerEffect(input.saveId),
);

/** `setNewsMessageState` — mutation atom. */
export const setNewsMessageStateMutation = rpcRuntime.fn(
  (input: RpcPayload<"setNewsMessageState">) => setNewsMessageStateEffect(input),
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

/** `renewContract` — mutation atom. */
export const renewContractMutation = rpcRuntime.fn((input: RpcPayload<"renewContract">) =>
  renewContractEffect(input),
);

/** `submitMatchCommand` — mutation atom. */
export const submitMatchCommandMutation = rpcRuntime.fn(
  (input: RpcPayload<"submitMatchCommand">) => submitMatchCommandEffect(input),
);