/**
 * Competitions (World section): every competition in the save, each opening its Overview.
 *
 * **This is the way into the competition branch.** Screens 161–164 all shipped before this existed
 * and were reachable only by typing a URL — the same defect group-c ticket 02 fixed for
 * Club → Staff, and the reason group-l ticket 10 existed.
 *
 * A browse list and nothing more. No standings, no form, no honours: every screen that would source
 * such a column — statistics, records, history, awards — is `deferred` in the
 * [Group L ledger](../../../../docs/specs/group_l_competitions_nations_and_world_information/RECONCILIATION.md),
 * and a browse list is exactly where one would look harmless.
 */
import { type CompetitionListItemView, type SaveId } from "@cm-clone/contracts";
import { useMemo, type ReactNode } from "react";
import { useTable, type ColumnDef } from "@tanstack/react-table";
import { FlagIcon, LayersIcon, ShapesIcon, TrophyIcon, UsersIcon } from "lucide-react";
import {
  DataGrid,
  DataGridContainer,
  dataGridFeatures,
} from "../components/reui/data-grid/data-grid.js";
import { DataGridColumnHeader } from "../components/reui/data-grid/data-grid-column-header.js";
import { DataGridScrollArea } from "../components/reui/data-grid/data-grid-scroll-area.js";
import { DataGridTable } from "../components/reui/data-grid/data-grid-table.js";
import { nationFlagUrl } from "../activeLeagues/nationFlags.js";
import { Alert } from "../components/ui/alert.js";
import { FOCUS_RING } from "../focus.js";
import { intentOfClick, navigateCareer } from "../navigation/adapter.js";
import { competitionsAtom, describeRpcError, typedError, useAtomValue } from "../rpc.js";

const PAGE_CLASS = `p-8 text-foreground ${FOCUS_RING.join(" ")}`;

/** The kind in the player's words; the wire carries the schema's check-constraint values. */
const KIND_LABELS: Readonly<Record<string, string>> = {
  league: "League",
  cup: "Cup",
  reserve: "Reserve",
  continental: "Continental",
};

const CompetitionsMain = ({ children }: { readonly children: ReactNode }) => (
  <main tabIndex={-1} data-focus-id="competitions" aria-label="Competitions" className={PAGE_CLASS}>
    {children}
  </main>
);

/** An em dash, not a blank: a cross-border tournament has no nation, and an empty cell reads as
 *  missing data rather than as an answer. Same for tier and clubs, which are null for a kind that
 *  does not sit on the ladder. */
const orDash = (value: string | number | null) => value ?? "—";

/** The nation beside its flag. The flag is decorative, since the name says the same thing in
 *  text; a nation with no shipped flag (Andorra) shows its name alone. */
const NationCell = ({ competition }: { readonly competition: CompetitionListItemView }) => {
  const flagUrl = competition.nationCode === null ? undefined : nationFlagUrl(competition.nationCode);
  return (
    <span className="flex items-center gap-2 whitespace-nowrap">
      {flagUrl !== undefined && (
        <img
          src={flagUrl}
          alt=""
          aria-hidden="true"
          className="h-3.5 w-5 shrink-0 rounded-[2px] border border-border-subtle object-cover"
        />
      )}
      {orDash(competition.nationName)}
    </span>
  );
};

/** reui's data grid with column icons (`@reui/c-data-grid-10`), as Team Selection uses it. */
const CompetitionsGrid = ({
  saveId,
  competitions,
}: {
  readonly saveId: SaveId;
  readonly competitions: ReadonlyArray<CompetitionListItemView>;
}) => {
  const data = useMemo(() => [...competitions], [competitions]);

  const columns = useMemo<ColumnDef<typeof dataGridFeatures, CompetitionListItemView>[]>(
    () => [
      {
        id: "competition",
        accessorFn: (competition) => competition.competitionName,
        header: ({ column }) => (
          <DataGridColumnHeader title="Competition" icon={<TrophyIcon />} column={column} />
        ),
        cell: ({ row }) => {
          const competition = row.original;
          return (
            // The row's own control, named for its competition — "Open" repeated down twenty
            // rows tells a screen-reader user nothing about which.
            <button
              type="button"
              className="underline-offset-2 hover:underline focus-visible:underline"
              aria-label={`${competition.competitionName} — overview`}
              onClick={(event) =>
                navigateCareer(
                  {
                    type: "competitionOverview",
                    saveId,
                    competitionId: competition.competitionId,
                  },
                  intentOfClick(event),
                )
              }
            >
              {competition.competitionName}
            </button>
          );
        },
        size: 260,
      },
      {
        id: "nation",
        accessorFn: (competition) => competition.nationName ?? undefined,
        sortUndefined: "last",
        header: ({ column }) => (
          <DataGridColumnHeader title="Nation" icon={<FlagIcon />} column={column} />
        ),
        cell: ({ row }) => <NationCell competition={row.original} />,
        size: 160,
      },
      {
        id: "kind",
        accessorFn: (competition) => KIND_LABELS[competition.kind] ?? competition.kind,
        header: ({ column }) => (
          <DataGridColumnHeader title="Kind" icon={<ShapesIcon />} column={column} />
        ),
        cell: ({ getValue }) => getValue<string>(),
        size: 120,
      },
      {
        id: "tier",
        accessorFn: (competition) => competition.tier ?? undefined,
        sortUndefined: "last",
        header: ({ column }) => (
          <DataGridColumnHeader title="Tier" icon={<LayersIcon />} column={column} />
        ),
        cell: ({ row }) => <span className="tabular-nums">{orDash(row.original.tier)}</span>,
        size: 88,
      },
      {
        id: "clubs",
        accessorFn: (competition) => competition.clubCount ?? undefined,
        sortUndefined: "last",
        header: ({ column }) => (
          <DataGridColumnHeader title="Clubs" icon={<UsersIcon />} column={column} />
        ),
        cell: ({ row }) => <span className="tabular-nums">{orDash(row.original.clubCount)}</span>,
        size: 88,
      },
    ],
    [saveId],
  );

  const table = useTable({
    features: dataGridFeatures,
    columns,
    data,
    getRowId: (row) => row.competitionId,
    // `dataGridFeatures` registers pagination, which pages at ten rows; a browse list shows them all.
    manualPagination: true,
  });

  return (
    <DataGrid table={table} recordCount={data.length} tableLayout={{ dense: true, width: "auto" }}>
      <DataGridContainer className="mt-6">
        <DataGridScrollArea>
          <DataGridTable />
        </DataGridScrollArea>
      </DataGridContainer>
    </DataGrid>
  );
};

export const CompetitionsScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const result = useAtomValue(competitionsAtom(saveId));
  const error = typedError(result);

  if (error)
    return (
      <CompetitionsMain>
        <Alert variant="destructive">
          <p>{describeRpcError(error)}</p>
        </Alert>
      </CompetitionsMain>
    );
  if (result._tag === "Initial")
    return (
      <CompetitionsMain>
        <p className="p-8 text-text-secondary">Loading competitions...</p>
      </CompetitionsMain>
    );
  if (result._tag === "Failure")
    return (
      <CompetitionsMain>
        <Alert variant="destructive">
          <p>Failed to load competitions</p>
        </Alert>
      </CompetitionsMain>
    );

  const { competitions } = result.value;

  return (
    <CompetitionsMain>
      <h1 className="text-title">Competitions</h1>
      <p className="mt-1 text-body text-text-secondary">
        {competitions.length} in this world &middot; open one for its table, fixtures and results
      </p>

      <CompetitionsGrid saveId={saveId} competitions={competitions} />
    </CompetitionsMain>
  );
};
