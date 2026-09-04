import { TablePanel } from "../table/TablePanel.js";
import { useTransfers } from "../TransfersProvider.js";
import { marketPlayerColumns } from "../table/transfers/marketColumns.js";
import { STATE_COPY } from "../table/viewState.js";
import { TransferFilterBar } from "./TransferFilterBar.js";

const MARKET = "transfer-market";

/** The Market table leaf: an explicit variant of the generic table panel that
 *  owns the Market key, columns, copy, and row handling, and reads the shared
 *  Market/Free-Agents selection from the transfers context. */
export const MarketTable = () => {
  const { state, actions, meta } = useTransfers();
  const { market, marketFiltered, marketRows, refreshState, selected } = state;
  const {
    setFiltersFor,
    onSortChangeFor,
    onActiveChangeFor,
    onBookmarkChangeFor,
    onToggleSelectionFor,
    onRowPrimaryFor,
  } = actions;
  const { speak } = meta;

  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold">Market</h2>
      <TablePanel
        tableId={MARKET}
        screen="transfers"
        region="marketTable"
        label="Market"
        columns={marketPlayerColumns()}
        rows={marketFiltered}
        unfilteredRowCount={marketRows.length}
        sort={market.sort}
        onSortChange={onSortChangeFor(MARKET)}
        filters={market.filters}
        onSetFilters={(next) => {
          setFiltersFor(MARKET, next);
          speak(MARKET, "filter-set", `${next.length === 0 ? "Cleared the Market filters." : "Filters updated."}`);
        }}
        filterArea={
          <TransferFilterBar
            label="Market"
            filters={market.filters}
            onSetFilters={(next) => {
              setFiltersFor(MARKET, next);
              speak(MARKET, "filter-set", `${next.length === 0 ? "Cleared the Market filters." : "Filters updated."}`);
            }}
          />
        }
        activeId={market.active}
        onActiveChange={onActiveChangeFor(MARKET)}
        onBookmarkChange={onBookmarkChangeFor(MARKET)}
        selectedId={selected !== null && selected.tableId === MARKET ? selected.player.id : null}
        onToggleSelection={onToggleSelectionFor(MARKET)}
        onRowPrimary={onRowPrimaryFor(MARKET)}
        busy={refreshState._tag === "Refreshing"}
        announcement={market.announcement?.message ?? ""}
        copy={STATE_COPY["transfer-market"]}
        loadError={null}
      />
    </section>
  );
};
