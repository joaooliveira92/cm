import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { SaveId } from "@cm-clone/contracts";
import {
  useSquadScreen,
  type SquadScreenValue,
} from "./useSquadScreen.js";

import { SlotByPlayerContext, slotByPlayerOf } from "./SelectionIndicator.js";

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
  // Derived once per lineup edit and shared, so both layouts' indicators read one map.
  const slotByPlayer = useMemo(() => slotByPlayerOf(value.lineup.tactic), [value.lineup.tactic]);
  return (
    <SquadContext.Provider value={value}>
      <SlotByPlayerContext.Provider value={slotByPlayer}>{children}</SlotByPlayerContext.Provider>
    </SquadContext.Provider>
  );
};

export const useSquad = (): SquadScreenValue => {
  const ctx = useContext(SquadContext);
  if (ctx === null) {
    throw new Error("useSquad must be used within a SquadProvider");
  }
  return ctx;
};
