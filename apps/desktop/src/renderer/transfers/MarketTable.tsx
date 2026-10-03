import { TablePanel } from "../table/TablePanel.js";
import { TableLoadingProvider } from "../table/TableLoadingProvider.js";
import { useTransfers } from "./TransfersProvider.js";
import { marketPlayerColumns } from "../table/transfers/marketColumns.js";
import { STATE_COPY } from "../table/viewState.js";
import { TransferFilterBar } from "./TransferFilterBar.js";

const MARKET = "transfer-market";

/** The Market table leaf: an explicit variant of the generic table panel that
 *  owns the Market key, columns, copy, and row handling, and reads the shared
 *  Market/Free-Agents selection from the transfers context. */
export const MarketTable = () => {
  const { state, actions } = useTransfers();
  const { market, marketFiltered, marketRows, refreshState, selected } = state;
  const {
    applyFiltersFor,
    onSortChangeFor,
    onActiveChangeFor,
    onBookmarkChangeFor,
    onToggleSelectionFor,
    onRowPrimaryFor,
  } = actions;

  return (
    <section>
      <TableLoadingProvider busy={refreshState._tag === "Refreshing"} loadError={null}>
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
            applyFiltersFor(MARKET, next);
          }}
          filterArea={
            <TransferFilterBar
              label="Market"
              filters={market.filters}
              onSetFilters={(next) => {
                applyFiltersFor(MARKET, next);
              }}
            />
          }
          activeId={market.active}
          onActiveChange={onActiveChangeFor(MARKET)}
          onBookmarkChange={onBookmarkChangeFor(MARKET)}
          selectedId={selected !== null && selected.tableId === MARKET ? selected.player.id : null}
          onToggleSelection={onToggleSelectionFor(MARKET)}
          onRowPrimary={onRowPrimaryFor(MARKET)}
          announcement={market.announcement?.message ?? ""}
          copy={STATE_COPY["transfer-market"]}
          denseGrid
        />
      </TableLoadingProvider>
    </section>
  );
};
