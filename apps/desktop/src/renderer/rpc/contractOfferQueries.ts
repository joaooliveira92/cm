/**
 * getContractOffer — `["save", saveId]`, `["scouting", saveId]`.
 *
 * The Contract Offer for one Free Agent (Screen 137, ticket 09). The figures are read exactly the
 * way the market and the Player Profile read that player — an Attribute Range on the Overall Rating,
 * the Transfer Value and the wage below Fully Scouted, exact at it (Agent Note 2026-09-19) — so the
 * terms form can only offer a wage its own knowledge supports.
 *
 * Reactive on the scouting key beside the save key: an advance moves every scout's progress, and a
 * scouting assignment is the other thing that moves it, so either has to re-read the offer or the
 * band on screen would outlive the knowledge behind it.
 *
 * Split out of `queries.ts` along the file-length seam, like `playerComparisonQueries.ts`.
 */
import { type PlayerId, type SaveId } from "@cm-clone/contracts";
import { Atom } from "effect/unstable/reactivity";
import { call } from "./call.js";
import { managementReadPolicy } from "./policy.js";
import { saveKey, scoutingKey } from "./queries.js";

const offersForSave = Atom.family((saveId: SaveId) =>
  Atom.family((playerId: PlayerId) =>
    managementReadPolicy(
      Atom.make(
        call("getContractOffer", { saveId, playerId }),
      ).pipe(Atom.withReactivity([saveKey(saveId), scoutingKey(saveId)])),
    ),
  ),
);

export const contractOfferAtom = (saveId: SaveId, playerId: PlayerId) =>
  offersForSave(saveId)(playerId);
