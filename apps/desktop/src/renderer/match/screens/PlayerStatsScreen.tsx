import { useCallback, useMemo, useState } from "react";
import type { MatchPlayerStatsView, SaveId } from "@cm-clone/contracts";
import { Alert } from "../../components/ui/alert.js";
import { Button } from "../../components/ui/button.js";
import { Table } from "../../components/ui/table.js";
import { FOCUS_RING } from "../../focus.js";
import { DataTable, type TableDensity } from "../../table/DataTable.js";
import { useDataTable, visibleRowIds } from "../../table/useDataTable.js";
import type { TableFocusBookmark } from "../../table/focusBookmark.js";
import type { SortState } from "../../table/types.js";
import { getMatchPlayerStats } from "../../rpc.js";
import { describeRpcError, type RpcClientError } from "../../rpc/errors.js";
import { useBoundMatchRead, type MatchBinding } from "../useBoundMatchRead.js";
import { playerLineColumns, playerLineRowOf, type PlayerLineRow } from "../playerLineColumns.js";

export type PlayerStatsSide = "home" | "away";

const read = (binding: MatchBinding) => getMatchPlayerStats(binding);
const describe = (error: RpcClientError<"getMatchPlayerStats">) => describeRpcError(error);

/** The Home/Away Stats table: the matchday squad in slot then bench order, the shared dense grid. */
const PlayerStatsTable = ({
  rows,
  showSaves,
  label,
  screen,
}: {
  readonly rows: ReadonlyArray<PlayerLineRow>;
  readonly showSaves: boolean;
  readonly label: string;
  readonly screen: string;
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortState | null>(null);
  const columns = useMemo(() => playerLineColumns(showSaves), [showSaves]);
  const table = useDataTable<PlayerLineRow>({
    columns,
    data: rows,
    sort,
    onSortChange: setSort,
    pinnedColumnIds: ["name"],
  });
  const orderedIds = visibleRowIds(table);
  const tableRows = table.getRowModel().rows;
  const onActiveChange = useCallback((id: string) => setActiveId(id), []);
  const onBookmarkChange = useCallback((_bookmark: TableFocusBookmark) => {}, []);
  const density: TableDensity = "compact";

  return (
    <DataTable
      tableId="match-player-stats"
      screen={screen}
      region="playerStats"
      table={table}
      orderedIds={orderedIds}
      identityColumnId="name"
      activeId={activeId}
      onActiveChange={onActiveChange}
      onBookmarkChange={onBookmarkChange}
      selectedId={null}
      onToggleSelection={() => {}}
      onSortChange={setSort}
      ariaLabel={label}
      announcement=""
      density={density}
      denseGrid
    >
      {tableRows.length > 0 && (
        <Table className="min-w-full text-left">
          <DataTable.Header table={table} />
          <DataTable.Body rows={tableRows} />
        </Table>
      )}
    </DataTable>
  );
};

/**
 * Home Stats / Away Stats (map ticket 12): each matchday-squad member's Match Player Line, live
 * (cut at the revealed position) and after the match. One screen serves both sides through `side`;
 * the tab label stays fixed and the heading names the club. It renders a view the main process
 * folded, and states once that only what the match records is shown.
 */
export const MatchPlayerStatsScreen = ({
  saveId,
  side,
}: {
  readonly saveId: SaveId;
  readonly side: PlayerStatsSide;
}) => {
  const { state, reload } = useBoundMatchRead<MatchPlayerStatsView, RpcClientError<"getMatchPlayerStats">>(
    saveId,
    read,
    describe,
  );

  return (
    <main
      tabIndex={-1}
      data-focus-id={side === "home" ? "matchHomeStats" : "matchAwayStats"}
      aria-label={side === "home" ? "Home Stats" : "Away Stats"}
      className={`p-8 text-foreground ${FOCUS_RING.join(" ")}`}
    >
      {state._tag === "loading" && <p className="text-text-secondary italic">Loading player stats...</p>}
      {state._tag === "failed" && (
        <Alert variant="destructive">
          <p>{state.message}</p>
          <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={reload}>
            Retry
          </Button>
        </Alert>
      )}
      {state._tag === "ready" && state.view === null && (
        <p className="text-text-secondary italic">No match played yet.</p>
      )}
      {state._tag === "ready" && state.view !== null && <PlayerStats view={state.view} side={side} />}
    </main>
  );
};

const PlayerStats = ({ view, side }: { readonly view: MatchPlayerStatsView; readonly side: PlayerStatsSide }) => {
  const team = side === "home" ? view.home : view.away;
  const rows = team.rows.map(playerLineRowOf);
  return (
    <section className="space-y-3 text-body">
      <h1 className="text-title">{team.clubName} Stats</h1>
      <p className="text-text-secondary">
        {view.throughMinute === null ? "Full match" : `Up to ${view.throughMinute}'`}
      </p>
      <PlayerStatsTable
        rows={rows}
        showSaves={team.showSaves}
        label={`${team.clubName} player stats`}
        screen={side === "home" ? "matchHomeStats" : "matchAwayStats"}
      />
      <p className="text-data text-text-muted">Only what the match records is shown.</p>
    </section>
  );
};

/** The two flat routes over one screen, each naming its side. */
export const MatchHomeStatsScreen = ({ saveId }: { readonly saveId: SaveId }) => (
  <MatchPlayerStatsScreen saveId={saveId} side="home" />
);

export const MatchAwayStatsScreen = ({ saveId }: { readonly saveId: SaveId }) => (
  <MatchPlayerStatsScreen saveId={saveId} side="away" />
);
