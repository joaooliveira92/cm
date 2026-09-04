import { createContext, useContext, type ReactNode } from "react";
import type { SaveId } from "@cm-clone/contracts";
import {
  useSquadScreen,
  type SquadScreenValue,
} from "./useSquadScreen.js";

export type { SquadScreenValue } from "./useSquadScreen.js";

export const SquadContext = createContext<SquadScreenValue | null>(null);

/** The squad screen's shared state, lifted so sibling leaves (the filter
 *  toolbar, column visibility controls, and the data table) read and write the
 *  same sort/filter/focus/selection state. This provider is the only module
 *  that calls the underlying `useSquadScreen` hook; the once-per-save action
 *  handler registration and all live-handler refs stay owned by that hook. */
export const SquadProvider = ({
  saveId,
  children,
}: {
  readonly saveId: SaveId;
  readonly children: ReactNode;
}) => {
  const value = useSquadScreen(saveId);
  return <SquadContext.Provider value={value}>{children}</SquadContext.Provider>;
};

export const useSquad = (): SquadScreenValue => {
  const ctx = useContext(SquadContext);
  if (ctx === null) {
    throw new Error("useSquad must be used within a SquadProvider");
  }
  return ctx;
};
