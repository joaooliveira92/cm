/**
 * The squad screen's three presentation preferences and their single-source
 * setters: the chosen view (which layout and column set — see `squadViews.ts`),
 * the reconciled column preferences that survive a restart
 * (`columnPreferences.ts`), and whether the status-legend disclosure is open.
 *
 * All three persist independently of the session store, and all three are
 * "standing" choices — what a manager reads their squad in — so they live
 * apart from the soon-forgotten sort/filter/focus session state. The raw
 * setters here do no announcing; the wrappers that pair each change with a
 * screen-reader line live in the assembly hook.
 */
import { useCallback, useState } from "react";
import {
  loadSquadColumnPreferences,
  saveSquadColumnPreferences,
  type SquadColumnPreferences,
} from "../table/columnPreferences.js";
import { loadSquadViewId, saveSquadViewId, type SquadViewId } from "./squadViews.js";

export interface SquadColumnState {
  readonly viewId: SquadViewId;
  readonly preferences: SquadColumnPreferences;
  readonly legendExpanded: boolean;
}

export interface SquadColumnActions {
  readonly setViewId: (next: SquadViewId) => void;
  readonly applyPreferences: (next: SquadColumnPreferences) => void;
  readonly setLegendExpanded: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useSquadColumns = (): {
  readonly columnState: SquadColumnState;
  readonly columnActions: SquadColumnActions;
} => {
  const [viewId, setViewIdState] = useState<SquadViewId>(() => loadSquadViewId());
  const [preferences, setPreferences] = useState<SquadColumnPreferences>(() =>
    loadSquadColumnPreferences(),
  );
  const [legendExpanded, setLegendExpanded] = useState(false);

  const setViewId = useCallback((next: SquadViewId) => {
    setViewIdState(next);
    saveSquadViewId(next);
  }, []);
  const applyPreferences = useCallback((next: SquadColumnPreferences) => {
    setPreferences(next);
    saveSquadColumnPreferences(next);
  }, []);

  return {
    columnState: { viewId, preferences, legendExpanded },
    columnActions: { setViewId, applyPreferences, setLegendExpanded },
  };
};
