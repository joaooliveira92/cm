import { TablePanel } from "../table/TablePanel.js";
import { useTransfers } from "../TransfersProvider.js";
import { freeAgentColumns } from "../table/transfers/freeAgentColumns.js";
import { STATE_COPY } from "../table/viewState.js";
import { TransferFilterBar } from "./TransferFilterBar.js";

const FREE = "free-agents";

/** The Free Agents table leaf: an explicit variant of the generic table panel
 *  that owns the Free Agents key, columns, copy, and row handling, and reads
 *  the shared Market/Free-Agents selection from the transfers context. */
export const FreeAgentsTable = () => {
  const { state, actions, meta } = useTransfers();
  const { free, freeFiltered, freeAgentRows, refreshState, selected } = state;
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
      <h2 className="text-lg font-semibold">Free Agents</h2>
      <TablePanel
        tableId={FREE}
        screen="transfers"
        region="freeAgentTable"
        label="Free Agents"
        columns={freeAgentColumns()}
        rows={freeFiltered}
        unfilteredRowCount={freeAgentRows.length}
        sort={free.sort}
        onSortChange={onSortChangeFor(FREE)}
        filters={free.filters}
        onSetFilters={(next) => {
          setFiltersFor(FREE, next);
          speak(FREE, "filter-set", `${next.length === 0 ? "Cleared the Free Agents filters." : "Filters updated."}`);
        }}
        filterArea={
          <TransferFilterBar
            label="Free Agents"
            filters={free.filters}
            onSetFilters={(next) => {
              setFiltersFor(FREE, next);
              speak(FREE, "filter-set", `${next.length === 0 ? "Cleared the Free Agents filters." : "Filters updated."}`);
            }}
          />
        }
        activeId={free.active}
        onActiveChange={onActiveChangeFor(FREE)}
        onBookmarkChange={onBookmarkChangeFor(FREE)}
        selectedId={selected !== null && selected.tableId === FREE ? selected.player.id : null}
        onToggleSelection={onToggleSelectionFor(FREE)}
        onRowPrimary={onRowPrimaryFor(FREE)}
        busy={refreshState._tag === "Refreshing"}
        announcement={free.announcement?.message ?? ""}
        copy={STATE_COPY["free-agents"]}
        loadError={null}
      />
    </section>
  );
};
