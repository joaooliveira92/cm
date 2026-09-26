import { createContext, useContext, type ReactNode } from "react";
import type { SaveId } from "@cm-clone/contracts";
import { useTransfersScreen, type TransfersScreenValue } from "./useTransfersScreen.js";

export type { TransfersScreenValue } from "./useTransfersScreen.js";

export const TransfersContext = createContext<TransfersScreenValue | null>(null);

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
  const value = useTransfersScreen(saveId);
  return <TransfersContext.Provider value={value}>{children}</TransfersContext.Provider>;
};

export const useTransfers = (): TransfersScreenValue => {
  const ctx = useContext(TransfersContext);
  if (ctx === null) {
    throw new Error("useTransfers must be used within a TransfersProvider");
  }
  return ctx;
};
