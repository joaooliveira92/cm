/**
 * The CM 03/04-style Team Selection list: a simple HTML table showing all 11 starters, 7 substitutes,
 * and reserves. Columns: shirt number, name (with Capt badge), compact position label, slot label,
 * fit tier (an icon naming its tier on hover), condition. Click to select a slot — the selected player highlights on the pitch — then
 * click a substitute or a reserve to bring him into it; an empty slot fills the same way.
 *
 * The list narrows before the pitch beside it does, so it drops columns as its panel (an `@container`)
 * gets narrower: Condition first, then the position label, then the fit icon, which the pitch
 * markers also show.
 */
import { useMemo, type KeyboardEvent } from "react";
import type { PlayerId, SquadPlayerView, Tactic } from "@cm-clone/contracts";
import { familiarityOf, slotLabel, STARTER_COUNT, type FamiliarityTier } from "@cm-clone/shared";
import { CircleAlert, CircleCheck, CircleMinus, type LucideIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../components/ui/tooltip.js";
import { NumberChip } from "./NumberChip.js";

interface SelectionRow {
  readonly kind: "starter" | "substitute" | "reserve";
  readonly slotIndex: number | null;
  readonly player: SquadPlayerView | undefined;
  readonly playerId: PlayerId;
  readonly cellLabel: string;
  readonly fitTier: FamiliarityTier | null;
  readonly condition: number | null;
  readonly isCaptain: boolean;
  readonly id: string;
}

/** Enter or Space on a focused row does what a click does. */
const activateOnKey = (activate: () => void) => (event: KeyboardEvent) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  activate();
};

/** Which optional columns the View menu shows. */
export interface TeamSelectionColumns {
  readonly pos: boolean;
  readonly fit: boolean;
  readonly condition: boolean;
}

/** A column the View menu hides is gone; a shown one still drops out once the panel is too narrow. */
const columnClass = (shown: boolean, narrowest: string): string => (shown ? narrowest : "hidden");

const FIT_ICON: Readonly<Record<FamiliarityTier, { icon: LucideIcon; label: string; tone: string }>> = {
  natural: { icon: CircleCheck, label: "Natural", tone: "text-text-highlight" },
  competent: { icon: CircleMinus, label: "Competent", tone: "text-text-secondary" },
  unfamiliar: { icon: CircleAlert, label: "Unfamiliar", tone: "text-text-warning" },
};

/** The tier as an icon; its shape differs per tier, so it never rests on colour alone. */
const FitIcon = ({ tier }: { readonly tier: FamiliarityTier }) => {
  const { icon: Icon, label, tone } = FIT_ICON[tier];
  return (
    <Tooltip>
      <TooltipTrigger
        render={<span role="img" aria-label={label} className={`inline-flex align-middle ${tone}`} />}
      >
        <Icon className="size-4" aria-hidden />
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
};

const emptySuitabilityRecord: Record<string, number> = {};

const rowData = (
  playerId: string,
  slotIndex: number | null,
  cellLabelValue: string,
  squadPlayer: SquadPlayerView | undefined,
  captainIds: ReadonlyArray<string>,
): SelectionRow => {
  const suitability = squadPlayer?.suitability ?? emptySuitabilityRecord;
  const suit = suitability[cellLabelValue] ?? 1;
  const fitTier = familiarityOf(suit);
  return {
    kind: slotIndex !== null ? "starter" : "reserve",
    slotIndex,
    player: squadPlayer,
    playerId: playerId as PlayerId,
    cellLabel: cellLabelValue,
    fitTier: squadPlayer ? fitTier : null,
    condition: squadPlayer?.condition ?? null,
    isCaptain: captainIds.some((id) => id === playerId),
    id: `${slotIndex ?? "ns"}-${playerId}`,
  };
};

export const TeamSelectionGrid = ({
  tactic,
  squad,
  selectedSlot,
  onSelectSlot,
  onSwap,
  onAssign,
  columns,
}: {
  readonly tactic: Tactic;
  readonly squad: ReadonlyArray<SquadPlayerView>;
  readonly selectedSlot: number | null;
  readonly onSelectSlot: (slotIndex: number | null) => void;
  /** Swap two lineup orders (0-10 starters, 11-17 bench); the first must name a player. */
  readonly onSwap: (from: number, to: number) => void;
  /** Put a reserve into a starter slot; whoever stood there drops to the reserves. */
  readonly onAssign: (slotIndex: number, playerId: PlayerId) => void;
  readonly columns: TeamSelectionColumns;
}) => {
  const COND_COLUMN = columnClass(columns.condition, "@max-[32rem]:hidden");
  const POS_COLUMN = columnClass(columns.pos, "@max-[27rem]:hidden");
  const FIT_COLUMN = columnClass(columns.fit, "@max-[22rem]:hidden");

  const squadById = useMemo(
    () => new Map(squad.map((player) => [player.id, player])),
    [squad],
  );

  // The captains list is an order of succession; only its head wears the armband
  const captainIds = tactic.takers.captain.slice(0, 1);
  const startersSet = new Set(tactic.assignments.filter((id) => id !== ""));

  const starters: ReadonlyArray<SelectionRow> = useMemo(
    () =>
      tactic.slots.map((slot, index) => {
        const playerId = tactic.assignments[index]!;
        const player = playerId ? squadById.get(playerId) : undefined;
        return rowData(
          String(playerId),
          index,
          slotLabel(slot.cell),
          player,
          captainIds,
        );
      }),
    [tactic.slots, tactic.assignments, squadById, captainIds],
  );

  // Bench players: the 7 bench slots
  const bench: ReadonlyArray<SelectionRow> = useMemo(
    () =>
      tactic.bench.map((playerId, index) => {
        const pid = playerId ?? "";
        const player = pid ? squadById.get(pid) : undefined;
        return {
          kind: "substitute" as const,
          slotIndex: null,
          player,
          playerId: pid as PlayerId,
          cellLabel: `SB${index + 1}`,
          fitTier: null,
          condition: player?.condition ?? null,
          isCaptain: captainIds.some((id) => id === pid),
          id: `sb-${index}`,
        };
      }),
    [tactic.bench, squadById, captainIds],
  );

  // Reserves: everyone not a starter and not on the bench
  const reserves: ReadonlyArray<SelectionRow> = useMemo(() => {
    const benchSet = new Set(
      tactic.bench.filter((id): id is NonNullable<typeof id> => id !== null).map((id) => String(id)),
    );
    return squad
      .filter((player) => !startersSet.has(player.id) && !benchSet.has(player.id))
      .map((player) => ({
        kind: "reserve" as const,
        slotIndex: null,
        player,
        playerId: player.id,
        cellLabel: "-",
        fitTier: null,
        condition: player.condition,
        isCaptain: captainIds.some((id) => id === player.id),
        id: `res-${player.id}`,
      }));
  }, [squad, startersSet, tactic.bench, captainIds]);

  /** A substitute or reserve clicked while a starter slot is selected comes into that slot. */
  const bringIn = (row: SelectionRow) => {
    if (selectedSlot === null || row.player === undefined) return;
    if (row.kind === "substitute") onSwap(STARTER_COUNT + bench.indexOf(row), selectedSlot);
    else onAssign(selectedSlot, row.player.id);
  };

  return (
    <table data-testid="team-selection-grid" className="w-full text-left" role="grid" aria-label="Team Selection">
      <thead>
        <tr className="sticky top-0 z-10 h-9 border-b border-panel-border bg-panel-bg-strong text-overline uppercase text-text-secondary">
          <th className="px-2 w-10 font-semibold">No</th>
          <th className="px-2 font-semibold">Player</th>
          <th className={`px-2 w-12 font-semibold ${POS_COLUMN}`}>Pos</th>
          <th className="px-2 w-12 font-semibold">Slot</th>
          <th className={`px-2 w-10 font-semibold ${FIT_COLUMN}`}>Fit</th>
          <th className={`px-2 w-14 text-right font-semibold ${COND_COLUMN}`}>Cond</th>
        </tr>
      </thead>
      <tbody>
        {/* Starters */}
        {starters.map((row) => {
          const isSelected = selectedSlot === row.slotIndex;
          return (
            <tr
              key={row.id}
              data-player-id={row.playerId}
              data-kind={row.kind}
              data-selected={isSelected || undefined}
              onClick={() => onSelectSlot(row.slotIndex)}
              onKeyDown={activateOnKey(() => onSelectSlot(row.slotIndex))}
              className={`cursor-pointer border-b border-white/5 transition-colors even:bg-white/[0.04] ${
                isSelected ? "bg-text-highlight/20!" : "hover:bg-white/10"
              }`}
              tabIndex={0}
              role="row"
              aria-label={`${row.player?.firstName ?? "Empty"} ${row.player?.lastName ?? ""}`}
            >
              <td className="px-2 py-0.5">
                <NumberChip label={String(row.slotIndex! + 1)} starter />
              </td>
              <td className="px-2 py-0.5 text-body">
                {row.player ? (
                  <>
                    <span className="font-semibold">{row.player.lastName}</span>
                    <span className="text-text-secondary">, {row.player.firstName}</span>
                    {row.isCaptain && (
                      <span className="ml-1.5 rounded-sm bg-fuchsia-700 px-1 text-caption font-bold text-white">
                        Capt
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-text-muted">—</span>
                )}
              </td>
              <td className={`whitespace-nowrap px-2 py-0.5 text-data text-text-secondary ${POS_COLUMN}`}>
                {row.player ? row.player.positionLabel : "-"}
              </td>
              <td className="whitespace-nowrap px-2 py-0.5 text-data">{row.cellLabel}</td>
              <td className={`px-2 py-0.5 ${FIT_COLUMN}`}>
                {row.fitTier !== null && <FitIcon tier={row.fitTier} />}
              </td>
              <td className={`px-2 py-0.5 text-right text-data tabular-nums ${COND_COLUMN}`}>
                {row.condition !== null ? `${row.condition}%` : "-"}
              </td>
            </tr>
          );
        })}

        {/* Substitutes header, under CM's dashed line closing the eleven */}
        <tr className="border-t-2 border-dashed border-white/40">
          <td colSpan={6} className="px-2 pt-1.5 pb-0.5 text-label font-semibold text-cm-title">
            Substitutes
          </td>
        </tr>
        {bench.map((row) => (
          <tr
            key={row.id}
            data-player-id={row.playerId}
            data-kind={row.kind}
            onClick={() => bringIn(row)}
            onKeyDown={activateOnKey(() => bringIn(row))}
            className={`cursor-pointer border-b border-white/5 transition-colors even:bg-white/[0.04] hover:bg-white/10 ${
              selectedSlot !== null ? "text-text-primary" : "text-text-secondary"
            }`}
            tabIndex={0}
            role="row"
          >
            <td className="px-2 py-0.5">
              <NumberChip label={`SB${bench.indexOf(row) + 1}`} starter={false} />
            </td>
            <td className="px-2 py-0.5 text-body">
              {row.player ? (
                <>
                  <span className="font-semibold">{row.player.lastName}</span>
                  <span className="text-text-secondary">, {row.player.firstName}</span>
                  {row.isCaptain && (
                    <span className="ml-1.5 rounded-sm bg-fuchsia-700 px-1 text-caption font-bold text-white">
                      Capt
                    </span>
                  )}
                </>
              ) : (
                <span className="text-text-muted">—</span>
              )}
            </td>
            <td className={`whitespace-nowrap px-2 py-0.5 text-data text-text-secondary ${POS_COLUMN}`}>
              {row.player ? row.player.positionLabel : "-"}
            </td>
            <td className="whitespace-nowrap px-2 py-0.5 text-data text-text-muted">{row.cellLabel}</td>
            <td className={`px-2 py-0.5 ${FIT_COLUMN}`} />
            <td className={`px-2 py-0.5 text-right text-data tabular-nums ${COND_COLUMN}`}>
              {row.condition !== null ? `${row.condition}%` : "-"}
            </td>
          </tr>
        ))}

        {/* Reserves header */}
        <tr className="border-t border-white/20">
          <td colSpan={6} className="px-2 pt-1.5 pb-0.5 text-label font-semibold text-cm-title">
            Reserves
          </td>
        </tr>
        {reserves.map((row) => (
          <tr
            key={row.id}
            data-player-id={row.playerId}
            data-kind={row.kind}
            onClick={() => bringIn(row)}
            onKeyDown={activateOnKey(() => bringIn(row))}
            className={`border-b border-white/5 transition-colors even:bg-white/[0.04] ${
              selectedSlot !== null ? "cursor-pointer text-text-primary hover:bg-white/10" : "text-text-muted"
            }`}
            tabIndex={0}
            role="row"
          >
            <td className="px-2 py-0.5">
              <NumberChip label="-" starter={false} />
            </td>
            <td className="px-2 py-0.5 text-body">
              {row.player ? (
                <>
                  <span>{row.player.lastName}</span>
                  <span className="text-text-muted">, {row.player.firstName}</span>
                  {row.isCaptain && (
                    <span className="ml-1.5 rounded-sm bg-fuchsia-700 px-1 text-caption font-bold text-white">
                      Capt
                    </span>
                  )}
                </>
              ) : (
                <span className="text-text-muted">—</span>
              )}
            </td>
            <td className={`whitespace-nowrap px-2 py-0.5 text-data text-text-muted ${POS_COLUMN}`}>
              {row.player ? row.player.positionLabel : "-"}
            </td>
            <td className="whitespace-nowrap px-2 py-0.5 text-data text-text-muted">{row.cellLabel}</td>
            <td className={`px-2 py-0.5 ${FIT_COLUMN}`} />
            <td className={`px-2 py-0.5 text-right text-data tabular-nums ${COND_COLUMN}`}>
              {row.condition !== null ? `${row.condition}%` : "-"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};