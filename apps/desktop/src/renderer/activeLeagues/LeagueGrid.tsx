import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { useMemo } from "react";
import { GitBranch, Layers, Minus, Package, Sparkles, X } from "lucide-react";
import type {
  SimulationDepth,
  RecommendationIcon,
} from "@cm-clone/shared";
import { Button } from "../components/ui/button.js";
import { FOCUS_RING } from "../focus.js";
import type { GridRowView } from "./atoms.js";

/**
 * The Active Leagues league table — the dense workspace control of the reworked step 1.
 *
 * TanStack Table supplies the row model and column definitions, and row identity is keyed by the
 * **league id** — never the array index — so reorders keep identities stable and an edit can
 * never silently jump rows (spec "TanStack Table for identity and rendering, not state
 * ownership"). The body renders on plain CSS Grid, one dense row per active league; future
 * sorting and grouping remain available without a refactor. The authoritative configuration
 * never enters this component — it stays in the setup state model.
 *
 * Presentational only: the depth selector and the remove action emit typed intents through the
 * callbacks; this component never touches IPC or the state atoms. Column definitions carry the
 * cells (identity, depth, recommendation, remove) so the layout lives in one place.
 */

/** The CSS-Grid column template, declared once so the header and every body row align by
 *  construction and the grid definition is a single extracted value (spec density: repeated
 *  grid definitions are extracted, never restated as arbitrary values). */
export const LEAGUE_GRID_TEMPLATE =
  "[grid-template-columns:2rem_minmax(0,1fr)_9.5rem_minmax(0,1fr)_2rem]";

/** 30–34px rows per the density contract — a repeated compact structure, never spacious cards. */
export const LEAGUE_ROW_HEIGHT = "h-[32px]";

const DEPTH_LABELS: Readonly<Record<SimulationDepth, string>> = {
  full: "Full",
  standard: "Standard",
  "results-only": "Results only",
};

const DEPTH_ORDER: readonly SimulationDepth[] = ["full", "standard", "results-only"];

/** The visible depth tiers a row can express. A dependency row has none — it is read-only at its
 *  effective (capped `standard`) depth per the spec's capped-dependency rule. `full` is offered
 *  only where some scope option of the Nation can actually carry the league playable. */
export const depthOptionsForRow = (row: GridRowView): readonly SimulationDepth[] => {
  if (row.isDependency || row.editableDepth === undefined) return [];
  return DEPTH_ORDER.filter((depth) => depth !== "full" || row.fullReachable);
};

const ICON_BY_REASON: Readonly<Record<RecommendationIcon, typeof Sparkles>> = {
  preset: Sparkles,
  recruitment: GitBranch,
  dependency: Package,
  structure: Layers,
  neutral: Minus,
};

/** The depth control's accessible name is anchored to the league, so a screen-reader user lands
 *  on "Simulation depth for English First Division", never on an anonymous select. */
const depthAriaLabel = (row: GridRowView): string => `Simulation depth for ${row.leagueName}`;

const removeAriaLabel = (row: GridRowView): string => `Remove ${row.leagueName}`;

/** The native select the grid uses — same decision as the League & Nation browser: a native
 *  select is already keyboard-complete, so no vendored listbox is needed here. */
const SELECT_CLASS = `h-6 min-w-0 rounded-control border border-border-subtle bg-field-bg px-1 text-xs ${FOCUS_RING.join(" ")}`;

export interface LeagueGridProps {
  readonly rows: readonly GridRowView[];
  readonly onChangeDepth: (leagueId: string, depth: SimulationDepth) => void;
  readonly onRemove: (leagueId: string) => void;
  readonly ariaLabel?: string;
}

export const LeagueGrid = ({
  rows,
  onChangeDepth,
  onRemove,
  ariaLabel = "Active leagues",
}: LeagueGridProps) => {
  const columns = useMemo<ReadonlyArray<ColumnDef<GridRowView, unknown>>>(
    () => [
      {
        id: "emblem",
        header: "",
        cell: ({ row }) => <EmblemCell row={row.original} />,
      },
      {
        id: "league",
        header: "League",
        cell: ({ row }) => <LeagueCell row={row.original} />,
      },
      {
        id: "depth",
        header: "Simulation depth",
        cell: ({ row }) => (
          <DepthCell
            row={row.original}
            onChange={(depth) => onChangeDepth(row.original.leagueId, depth)}
          />
        ),
      },
      {
        id: "recommendation",
        header: "Recommendation",
        cell: ({ row }) => <RecommendationCell row={row.original} />,
      },
      {
        id: "remove",
        header: "",
        cell: ({ row }) => <RemoveCell row={row.original} onRemove={onRemove} />,
      },
    ],
    [onChangeDepth, onRemove],
  );

  const table = useReactTable<GridRowView>({
    data: rows as GridRowView[],
    columns: columns as ColumnDef<GridRowView, unknown>[],
    getRowId: (row) => row.leagueId,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
  });

  const rowModel = table.getRowModel().rows;
  const headerGroup = table.getHeaderGroups()[0];
  if (headerGroup === undefined) return null;

  return (
    <div role="table" aria-label={ariaLabel}>
      {rowModel.length === 0 ? (
        <p className="px-1 py-2 text-xs text-text-muted">No active leagues yet.</p>
      ) : (
        <div className="overflow-hidden rounded-panel border border-panel-border bg-panel-bg">
          <div
            role="row"
            className={`grid items-center gap-x-2 border-b border-panel-border bg-surface-raised px-2 text-2xs font-semibold uppercase tracking-wider text-text-secondary ${LEAGUE_ROW_HEIGHT} ${LEAGUE_GRID_TEMPLATE}`}
          >
            {headerGroup.headers.map((header) => (
              <div key={header.id} role="columnheader" className="min-w-0 truncate">
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
              </div>
            ))}
          </div>
          <div role="rowgroup">
            {rowModel.map((row) => (
              <div
                key={row.id}
                role="row"
                data-league-row={row.id}
                className={`grid items-center gap-x-2 border-t border-panel-border px-2 ${LEAGUE_ROW_HEIGHT} ${LEAGUE_GRID_TEMPLATE}`}
              >
                {row.getVisibleCells().map((cell) => (
                  <div key={cell.id} role="cell" className="min-w-0">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/** The identifier: emblem badge, league name, and the scope description that names the Nation's
 *  scope option (the row's "scope description" from the projection). */
const LeagueCell = ({ row }: { readonly row: GridRowView }) => (
  <div className="flex min-w-0 flex-col">
    <span className="truncate font-medium text-text-primary" title={row.leagueName}>
      {row.leagueName}
    </span>
    <span className="truncate text-2xs text-text-muted" title={row.scopeDescription}>
      {row.scopeDescription}
    </span>
  </div>
);

/** The emblem is a compact nation-code shield: the catalogue's stable ISO 3166-1 alpha-3 code
 *  rendered as a badge. No licensed club/competition mark exists at this grain, and inventing
 *  one would be cosmetic rather than data-native. */
const EmblemCell = ({ row }: { readonly row: GridRowView }) => (
  <span
    aria-hidden="true"
    title={`${row.nationName} (${row.nationCode})`}
    className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-surface-raised text-2xs font-semibold text-text-secondary"
  >
    {row.nationCode.slice(0, 3)}
  </span>
);

/** The depth control: a native select exposing the tiers the row can express. A dependency row
 *  shows its effective, capped value as static text — the grid never fabricates an override. */
const DepthCell = ({
  row,
  onChange,
}: {
  readonly row: GridRowView;
  readonly onChange: (depth: SimulationDepth) => void;
}) => {
  const options = depthOptionsForRow(row);
  if (options.length === 0) {
    return (
      <span className="text-xs text-text-muted" title={`Required competition — simulated at ${DEPTH_LABELS[row.depth].toLowerCase()} depth`}>
        {DEPTH_LABELS[row.depth]}
      </span>
    );
  }
  return (
    <select
      aria-label={depthAriaLabel(row)}
      className={SELECT_CLASS}
      value={row.depth}
      onChange={(event) => onChange(event.target.value as SimulationDepth)}
    >
      {options.map((depth) => (
        <option key={depth} value={depth}>
          {DEPTH_LABELS[depth]}
        </option>
      ))}
    </select>
  );
};

/** The recommendation cell: icon and visible text — icon alone is banned, so the reason is
 *  always readable alongside the glyph. */
const RecommendationCell = ({ row }: { readonly row: GridRowView }) => {
  const Icon = ICON_BY_REASON[row.recommendation.icon] ?? Minus;
  return (
    <div className="flex min-w-0 items-center gap-1.5 text-text-secondary">
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      <span className="truncate" title={row.recommendation.text}>
        {row.recommendation.text}
      </span>
    </div>
  );
};

/** The remove action. Icon-only but accessibly named with the league identity (spec: "an
 *  icon-only button that names the league" — colour is never the only signal, and the target is
 *  the stable league id, never an array index). The hit target is never smaller than 30×30px. */
const RemoveCell = ({
  row,
  onRemove,
}: {
  readonly row: GridRowView;
  readonly onRemove: (leagueId: string) => void;
}) => (
  <Button
    type="button"
    variant="ghost"
    size="icon"
    aria-label={removeAriaLabel(row)}
    title={removeAriaLabel(row)}
    onClick={() => onRemove(row.leagueId)}
    className="size-[30px]"
  >
    <X aria-hidden="true" />
  </Button>
);