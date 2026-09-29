/**
 * The tactics editor's Team Selection: the eleven starter slots as reui's data grid with column
 * icons (`@reui/c-data-grid-10`), vendored under `components/reui/data-grid`. Rows stay in slot
 * order — slot 1 is always the goalkeeper — so no column sorts.
 */
import { useMemo } from "react";
import { useTable } from "@tanstack/react-table";
import { CrosshairIcon, GaugeIcon, HashIcon, ShirtIcon, UserIcon } from "lucide-react";
import {
  PlayerId,
  type SquadPlayerView,
  type Tactic,
  type TacticSlot,
} from "@cm-clone/contracts";
import { POSITIONS, roleRating, type PlayerAttributes } from "@cm-clone/shared";
import { dispatchAction } from "../actions/dispatch.js";
import {
  DataGrid,
  DataGridContainer,
  dataGridFeatures,
} from "../components/reui/data-grid/data-grid.js";
import { DataGridColumnHeader } from "../components/reui/data-grid/data-grid-column-header.js";
import { DataGridScrollArea } from "../components/reui/data-grid/data-grid-scroll-area.js";
import { DataGridTable } from "../components/reui/data-grid/data-grid-table.js";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select.js";
import { NumberChip } from "./NumberChip.js";

interface SelectionRow {
  readonly id: string;
  readonly index: number;
  readonly slot: TacticSlot;
  readonly player: SquadPlayerView | undefined;
  /** Squad players this slot's picker offers: everyone not already starting in another slot. */
  readonly candidates: ReadonlyArray<SquadPlayerView>;
  /** Carried on the row, not read from a closure: the grid memoises rows on their data, so a
   *  column closure's change alone never reaches the cell. */
  readonly pickerOpen: boolean;
}

/** Every Position an outfield slot may move to: all but the GK, which stays alone in slot 0. */
const OUTFIELD_POSITIONS = POSITIONS.filter((position) => position !== "GK");
const positionItems = OUTFIELD_POSITIONS.map((position) => ({ label: position, value: position }));

const rowsOf = (
  tactic: Tactic,
  squad: ReadonlyArray<SquadPlayerView>,
  openSlot: number | null,
): SelectionRow[] => {
  const squadById = new Map(squad.map((player) => [player.id, player]));
  return tactic.slots.map((slot, index) => {
    const taken = new Set(
      tactic.slots.filter((_, other) => other !== index).map((other) => other.playerId),
    );
    return {
      id: String(index),
      index,
      slot,
      player: squadById.get(slot.playerId),
      candidates: squad.filter(
        (candidate) => !taken.has(candidate.id) || candidate.id === slot.playerId,
      ),
      pickerOpen: openSlot === index,
    };
  });
};

export const TeamSelectionGrid = ({
  tactic,
  squad,
  openSlot,
  onOpenSlotChange,
}: {
  readonly tactic: Tactic;
  readonly squad: ReadonlyArray<SquadPlayerView>;
  /** The slot whose player picker is open; the pitch markers open it from outside the grid. */
  readonly openSlot: number | null;
  readonly onOpenSlotChange: (slot: number | null) => void;
}) => {
  const data = useMemo(() => rowsOf(tactic, squad, openSlot), [tactic, squad, openSlot]);
  // The trigger's label source: without `items`, Base UI's `SelectValue` renders the raw player id.
  const pickerItems = useMemo(
    () => [
      { label: "Unassigned", value: "" },
      ...squad.map((player) => ({
        label: `${player.firstName} ${player.lastName}`,
        value: player.id as string,
      })),
    ],
    [squad],
  );

  const columns = useMemo<ColumnDef<typeof dataGridFeatures, SelectionRow>[]>(
    () => [
      {
        id: "number",
        header: ({ column }) => (
          <DataGridColumnHeader title="No" icon={<HashIcon />} column={column} />
        ),
        cell: ({ row }) => <NumberChip label={String(row.original.index + 1)} starter />,
        size: 64,
      },
      {
        id: "player",
        header: ({ column }) => (
          <DataGridColumnHeader title="Player" icon={<UserIcon />} column={column} />
        ),
        cell: ({ row }) => {
          const { index, slot, candidates, pickerOpen } = row.original;
          return (
            <Select
              value={slot.playerId}
              items={pickerItems}
              open={pickerOpen}
              onOpenChange={(open) => onOpenSlotChange(open ? index : null)}
              onValueChange={(value) => {
                if (value !== null) {
                  void dispatchAction("assign-slot-player", {
                    index,
                    playerId: PlayerId.make(value),
                  });
                }
              }}
            >
              <SelectTrigger
                data-action-id="assign-slot-player"
                aria-label={`Slot ${index + 1} player`}
              >
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {candidates.map((candidate) => (
                  <SelectItem key={candidate.id} value={candidate.id}>
                    {candidate.firstName} {candidate.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        },
        size: 240,
      },
      {
        id: "position",
        header: ({ column }) => (
          <DataGridColumnHeader title="Pos" icon={<CrosshairIcon />} column={column} />
        ),
        cell: ({ row }) => {
          const { index, slot } = row.original;
          return slot.position === "GK" ? (
            // Padded like the selects below it, so the column's codes line up.
            <span className="border border-transparent px-1.5 font-semibold">{slot.position}</span>
          ) : (
            <Select
              value={slot.position}
              items={positionItems}
              onValueChange={(value) => {
                if (value !== null) {
                  void dispatchAction("set-slot-position", { index, position: value });
                }
              }}
            >
              <SelectTrigger
                data-action-id="set-slot-position"
                aria-label={`Slot ${index + 1} position`}
                className="h-7 w-16 gap-1 px-1.5 font-semibold"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OUTFIELD_POSITIONS.map((position) => (
                  <SelectItem key={position} value={position}>
                    {position}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        },
        size: 96,
      },
      {
        id: "role",
        header: ({ column }) => (
          <DataGridColumnHeader title="Role" icon={<ShirtIcon />} column={column} />
        ),
        cell: ({ row }) => <span className="text-text-soft">{row.original.slot.role}</span>,
        size: 140,
      },
      {
        id: "rating",
        header: ({ column }) => (
          <DataGridColumnHeader title="Rating" icon={<GaugeIcon />} column={column} />
        ),
        cell: ({ row }) => {
          const { player, slot } = row.original;
          return (
            <span className="font-semibold tabular-nums">
              {player ? roleRating(player.attributes as PlayerAttributes, slot.role) : "-"}
            </span>
          );
        },
        size: 88,
      },
    ],
    [pickerItems, onOpenSlotChange],
  );

  const table = useTable({
    features: dataGridFeatures,
    columns,
    data,
    getRowId: (row) => row.id,
    enableSorting: false,
    // `dataGridFeatures` registers pagination, which pages at ten rows: the eleventh slot would
    // vanish onto a second page.
    manualPagination: true,
  });

  return (
    <DataGrid table={table} recordCount={data.length} tableLayout={{ dense: true, width: "auto" }}>
      <DataGridContainer className="mt-2">
        <DataGridScrollArea>
          <DataGridTable />
        </DataGridScrollArea>
      </DataGridContainer>
    </DataGrid>
  );
};
