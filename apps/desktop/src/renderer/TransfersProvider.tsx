import { createContext, useContext, type ReactNode } from "react";
import type { SaveId } from "@cm-clone/contracts";
import { useTransfersScreen, type TransfersScreenState } from "./useTransfersScreen.js";

/** Data the transfers screen shows or holds (the `state` bucket of the context
 *  value, mirroring the MatchProvider state/actions/meta convention). */
export type TransfersState = Pick<
  TransfersScreenState,
  | "status"
  | "bidAlert"
  | "selected"
  | "draftState"
  | "counters"
  | "counterAmount"
  | "counterError"
  | "market"
  | "free"
  | "marketRows"
  | "freeAgentRows"
  | "marketFiltered"
  | "freeFiltered"
  | "refreshState"
  | "windowOpen"
  | "draft"
  | "draftedPlayer"
  | "draftedPlayerName"
  | "draftAmount"
  | "draftAmountValid"
  | "counterAmountValid"
  | "viewError"
  | "view"
>;

/** Commands siblings raise against the shared transfers state. */
export type TransfersActions = Pick<
  TransfersScreenState,
  | "setSelected"
  | "setDraft"
  | "setCounter"
  | "setCounterAmount"
  | "setCounterError"
  | "setFiltersFor"
  | "run"
  | "runRespond"
  | "onSortChangeFor"
  | "onToggleSelectionFor"
  | "onActiveChangeFor"
  | "onBookmarkChangeFor"
  | "onRowPrimaryFor"
>;

/** Focus/announcement plumbing and the refs the JSX needs to touch directly. */
export type TransfersMeta = Pick<
  TransfersScreenState,
  | "amountInputRef"
  | "draftRef"
  | "speak"
  | "findPlayer"
> & {
  readonly saveId: SaveId;
};

export interface TransfersContextValue {
  readonly state: TransfersState;
  readonly actions: TransfersActions;
  readonly meta: TransfersMeta;
}

export const TransfersContext = createContext<TransfersContextValue | null>(null);

/** The transfers screen's shared state, lifted so sibling leaves (Market and
 *  Free Agents tables, the bid composer, the counter-offer modal) read and
 *  write the same selection/draft/counter state. This provider is the only
 *  module that calls the underlying `useTransfersScreen` hook; the once-per-save
 *  action-handler registration and all live-handler refs stay owned by that
 *  hook, so nothing is re-registered here. */
export const TransfersProvider = ({
  saveId,
  children,
}: {
  readonly saveId: SaveId;
  readonly children: ReactNode;
}) => {
  const screen = useTransfersScreen(saveId);
  const value: TransfersContextValue = {
    state: {
      status: screen.status,
      bidAlert: screen.bidAlert,
      selected: screen.selected,
      draftState: screen.draftState,
      counters: screen.counters,
      counterAmount: screen.counterAmount,
      counterError: screen.counterError,
      market: screen.market,
      free: screen.free,
      marketRows: screen.marketRows,
      freeAgentRows: screen.freeAgentRows,
      marketFiltered: screen.marketFiltered,
      freeFiltered: screen.freeFiltered,
      refreshState: screen.refreshState,
      windowOpen: screen.windowOpen,
      draft: screen.draft,
      draftedPlayer: screen.draftedPlayer,
      draftedPlayerName: screen.draftedPlayerName,
      draftAmount: screen.draftAmount,
      draftAmountValid: screen.draftAmountValid,
      counterAmountValid: screen.counterAmountValid,
      viewError: screen.viewError,
      view: screen.view,
    },
    actions: {
      setSelected: screen.setSelected,
      setDraft: screen.setDraft,
      setCounter: screen.setCounter,
      setCounterAmount: screen.setCounterAmount,
      setCounterError: screen.setCounterError,
      setFiltersFor: screen.setFiltersFor,
      run: screen.run,
      runRespond: screen.runRespond,
      onSortChangeFor: screen.onSortChangeFor,
      onToggleSelectionFor: screen.onToggleSelectionFor,
      onActiveChangeFor: screen.onActiveChangeFor,
      onBookmarkChangeFor: screen.onBookmarkChangeFor,
      onRowPrimaryFor: screen.onRowPrimaryFor,
    },
    meta: {
      saveId,
      amountInputRef: screen.amountInputRef,
      draftRef: screen.draftRef,
      speak: screen.speak,
      findPlayer: screen.findPlayer,
    },
  };
  return <TransfersContext.Provider value={value}>{children}</TransfersContext.Provider>;
};

export const useTransfers = (): TransfersContextValue => {
  const ctx = useContext(TransfersContext);
  if (ctx === null) {
    throw new Error("useTransfers must be used within a TransfersProvider");
  }
  return ctx;
};
