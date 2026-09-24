/**
 * getPlayerComparison — `["save", saveId]`, `["squad", saveId]`.
 *
 * Transfer Target Comparison (Screen 129, ticket 12): the Players the manager selected in Player
 * Search, side by side, each read exactly the way the search and profile reads do (Agent Note
 * 2026-09-19) — the manager's own Players and Fully Scouted rivals exact, every rival or Free
 * Agent below that an Attribute Range on every visible Attribute, Overall Rating and Transfer
 * Value. Wage, contract and availability are facts the reads know regardless of progress, so they
 * stay exact. The rows come back in the requested order, so the atomic key fixes the order up
 * front: the ids are hashed through `playerComparisonKey` (navigation's canonical slug), so a
 * comparison set always names one atom regardless of selection order.
 *
 * Reactive on the squad key beside the save key, like `playerSearchAtom`: an advance (the save key)
 * moves every scout's progress, and a completed transfer (the squad key) moves a Player between
 * clubs and rewrites the wage and contract this read shows.
 *
 * Split out of `queries.ts` along the file-length seam, like `playerSearchQueries.ts`.
 */
import {
  PlayerId as PlayerIdSchema,
  type PlayerId,
  type SaveId,
} from "@cm-clone/contracts";
import { Schema } from "effect";
import { Atom } from "effect/unstable/reactivity";
import { playerComparisonKey } from "../navigation/destinations.js";
import { call } from "./call.js";
import { managementReadPolicy } from "./policy.js";
import { saveKey, squadKey } from "./queries.js";

/** The inverse of `playerComparisonKey` — the atom's key is what the RPC payload is built from.
 *  Each segment re-decodes through the contract's brand before it travels, so the payload is typed
 *  on both sides of the seam. The key's segments came from (or round-tripped through) a route that
 *  `decodePlayerIds` already validated, so the brand's nominal cast cannot fail here — the decode
 *  is for the brand, not a fresh shape check. */
const parsePlayerComparisonKey = (key: string): ReadonlyArray<PlayerId> =>
  key.split(",").map((segment) => Schema.decodeSync(PlayerIdSchema)(segment));

const comparisonsForSave = Atom.family((saveId: SaveId) =>
  Atom.family((playersKey: string) =>
    managementReadPolicy(
      Atom.make(
        call("getPlayerComparison", {
          saveId,
          playerIds: parsePlayerComparisonKey(playersKey),
        }),
      ).pipe(Atom.withReactivity([saveKey(saveId), squadKey(saveId)])),
    ),
  ),
);

export const playerComparisonAtom = (
  saveId: SaveId,
  playerIds: ReadonlyArray<PlayerId>,
) => comparisonsForSave(saveId)(playerComparisonKey(playerIds));