/**
 * The command-palette sort/filter actions for the two transfer tables. Split
 * from `useTransferTables.ts` so neither file carries two registration
 * lifecycles; the assembly calls this immediately after the command handlers,
 * which is the order the single registration effect used before the split.
 */
import { useEffect } from "react";
import type { SaveId } from "@cm-clone/contracts";
import { registerActionHandler } from "../actions/dispatch.js";
import { classifyTableParamAction } from "../table/paramActions.js";
import { sortDirectionOf } from "../table/features/sorting.js";
import { applyFilters, filterChangeNotice, upsertFilter } from "../table/features/filtering.js";
import {
  FREE_AGENT_PALETTE_OPTIONS,
  MARKET_PALETTE_OPTIONS,
  tableSortAndFilterActions,
} from "../table/paletteActions.js";
import {
  MARKET_COLUMN_LABELS,
  type MarketPlayerRow,
} from "../table/transfers/marketColumns.js";
import type { useTransferTableState } from "../table/transfers/useTransferTableState.js";
import { FREE, MARKET } from "./tableIds.js";

type TransferTableState = ReturnType<typeof useTransferTableState>;

export interface TablePaletteHandlersParams {
  readonly saveId: SaveId;
  readonly marketIdsRef: React.MutableRefObject<readonly string[]>;
  readonly freeIdsRef: React.MutableRefObject<readonly string[]>;
  readonly marketActiveRef: React.MutableRefObject<string | null>;
  readonly freeActiveRef: React.MutableRefObject<string | null>;
  readonly marketRowsRef: React.MutableRefObject<readonly MarketPlayerRow[]>;
  readonly freeAgentRowsRef: React.MutableRefObject<readonly MarketPlayerRow[]>;
  readonly recordBookmark: TransferTableState["recordBookmark"];
  readonly setSortFor: TransferTableState["setSortFor"];
  readonly setFiltersFor: TransferTableState["setFiltersFor"];
  readonly filtersFor: TransferTableState["filtersFor"];
  /** The shell's bottom-bar line, where a sort or filter command reports. */
  readonly notify: (message: string) => void;
}

/** The command-palette sort/filter actions for both transfer tables. */
export const useTablePaletteHandlers = ({
  saveId,
  marketIdsRef,
  freeIdsRef,
  marketActiveRef,
  freeActiveRef,
  marketRowsRef,
  freeAgentRowsRef,
  recordBookmark,
  setSortFor,
  setFiltersFor,
  filtersFor,
  notify,
}: TablePaletteHandlersParams): void => {
  useEffect(() => {
    const unregisters: Array<() => void> = [];

    const applyParam = (actionId: string, params: unknown): void => {
      const parsed = classifyTableParamAction(actionId, params);
      if (parsed === null) return;
      const marketish = parsed.tableId === MARKET || parsed.tableId === FREE;
      if (!marketish) return;
      if (parsed.tableId === MARKET) recordBookmark(MARKET, marketIdsRef.current, marketActiveRef.current);
      else recordBookmark(FREE, freeIdsRef.current, freeActiveRef.current);
      const labels = MARKET_COLUMN_LABELS;
      switch (parsed.kind) {
        case "set-sort": {
          const next = parsed.sort ?? null;
          setSortFor(parsed.tableId, next);
          if (next === null) {
            notify(`Cleared the ${parsed.tableId === MARKET ? "Market" : "Free Agents"} sort.`);
          } else {
            notify(`Sorted by ${labels[next.columnId] ?? next.columnId}, ${sortDirectionOf(next.direction)}.`);
          }
          break;
        }
        case "clear-sort":
          setSortFor(parsed.tableId, null);
          notify(`Cleared the ${parsed.tableId === MARKET ? "Market" : "Free Agents"} sort.`);
          break;
        case "set-filter":
          if (parsed.filter !== undefined) {
            const rows =
              parsed.tableId === MARKET ? marketRowsRef.current : freeAgentRowsRef.current;
            const before = filtersFor(parsed.tableId);
            const next = upsertFilter(before, parsed.filter);
            setFiltersFor(parsed.tableId, next);
            notify(filterChangeNotice(before, next, applyFilters(rows, next).length));
          }
          break;
        case "clear-filters":
          setFiltersFor(parsed.tableId, []);
          notify(`Cleared the ${parsed.tableId === MARKET ? "Market" : "Free Agents"} filters.`);
          break;
      }
    };

    for (const action of tableSortAndFilterActions(MARKET_PALETTE_OPTIONS)) {
      unregisters.push(registerActionHandler(action.id, (params: unknown) => applyParam(action.id, params)));
    }
    for (const action of tableSortAndFilterActions(FREE_AGENT_PALETTE_OPTIONS)) {
      unregisters.push(registerActionHandler(action.id, (params: unknown) => applyParam(action.id, params)));
    }
    return () => {
      for (const unregister of unregisters) unregister();
    };
    // Handlers read through refs.
  }, [saveId]); // eslint-disable-line react-hooks/exhaustive-deps
};
