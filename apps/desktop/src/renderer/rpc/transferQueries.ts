/** Transfer and budget atoms. */
import type { ClubId, SaveId } from "@cm-clone/contracts";
import { Atom } from "effect/unstable/reactivity";
import { call } from "./call.js";
import {
  economyKey,
  saveKey,
  transferHistoryKey,
  transfersKey,
  budgetReviewKey,
} from "./keys.js";
import { managementReadPolicy } from "./policy.js";

/** getTransfersScreen — `["save", saveId]`, `["transfers", saveId]`, `["economy", saveId]`. */
export const transfersAtom = Atom.family((saveId: SaveId) =>
  managementReadPolicy(
    Atom.make(call("getTransfersScreen", { saveId })).pipe(
      Atom.withReactivity([saveKey(saveId), transfersKey(saveId), economyKey(saveId)]),
    ),
  ),
);

/**
 * getClubTransfers — `["save", saveId]`, `["transfers", saveId]`.
 *
 * Club Transfers (Screen 42): any club's completed transfers. Reactive on the transfers key for the
 * same reason `transferHistoryAtom` is — a settled bid adds a row.
 */
const clubTransfersForSave = Atom.family((saveId: SaveId) =>
  Atom.family((clubId: ClubId) =>
    managementReadPolicy(
      Atom.make(call("getClubTransfers", { saveId, clubId })).pipe(
        Atom.withReactivity([saveKey(saveId), transfersKey(saveId)]),
      ),
    ),
  ),
);

export const clubTransfersAtom = (saveId: SaveId, clubId: ClubId) =>
  clubTransfersForSave(saveId)(clubId);

/**
 * getClubFinances — `["save", saveId]`, `["transfers", saveId]`, `["economy", saveId]`.
 *
 * Club Finances (Screen 39): any club's budgets. Same reactivity as `budgetReviewAtom`, which is
 * the own-club sibling — a settled bid or a renewed contract moves these numbers.
 */
const clubFinancesForSave = Atom.family((saveId: SaveId) =>
  Atom.family((clubId: ClubId) =>
    managementReadPolicy(
      Atom.make(call("getClubFinances", { saveId, clubId })).pipe(
        Atom.withReactivity([saveKey(saveId), transfersKey(saveId), economyKey(saveId)]),
      ),
    ),
  ),
);

export const clubFinancesAtom = (saveId: SaveId, clubId: ClubId) =>
  clubFinancesForSave(saveId)(clubId);

/** Budget Review (Screen 145): the manager's club's Transfer Budget remaining, Wage Budget,
 *  committed wages, and headroom. A pure read, reactive on the save-wide key. */
export const budgetReviewAtom = Atom.family((saveId: SaveId) =>
  managementReadPolicy(
    Atom.make(call("getBudgetReviewScreen", { saveId })).pipe(
      Atom.withReactivity([saveKey(saveId), budgetReviewKey(saveId)]),
    ),
  ),
);

/** Transfer History (Screen 146): every completed transfer into or out of the manager's Club,
 *  newest first. A pure read, reactive on the save-wide key. */
export const transferHistoryAtom = Atom.family((saveId: SaveId) =>
  managementReadPolicy(
    Atom.make(call("getTransferHistoryScreen", { saveId })).pipe(
      Atom.withReactivity([saveKey(saveId), transferHistoryKey(saveId)]),
    ),
  ),
);