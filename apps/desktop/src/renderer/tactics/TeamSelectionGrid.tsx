/**
 * The CM 03/04-style Team Selection list: a simple HTML table showing all 11 starters, 7 substitutes,
 * and reserves. Columns: shirt number, name (with Capt badge), compact position label, slot label and
 * fit tier, condition. Click to select a slot — the selected player highlights on the pitch.
 */
import { useMemo } from "react";
import type { PlayerId, SquadPlayerView, Tactic } from "@cm-clone/contracts";
import { familiarityOf, slotLabel, STARTER_COUNT } from "@cm-clone/shared";
import { FOCUS_RING } from "../focus.js";

interface SelectionRow {
  readonly kind: "starter" | "substitute" | "reserve";
  readonly slotIndex: number | null;
  readonly player: SquadPlayerView | undefined;
  readonly playerId: PlayerId;
  readonly cellLabel: string;
  readonly fitWord: string | null;
  readonly condition: number | null;
  readonly isCaptain: boolean;
  readonly id: string;
}

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
  const fitWord = fitTier === "natural" ? "Natural" : fitTier === "competent" ? "Competent" : "Unfamiliar";
  return {
    kind: slotIndex !== null ? "starter" : "reserve",
    slotIndex,
    player: squadPlayer,
    playerId: playerId as PlayerId,
    cellLabel: cellLabelValue,
    fitWord: squadPlayer ? fitWord : null,
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
}: {
  readonly tactic: Tactic;
  readonly squad: ReadonlyArray<SquadPlayerView>;
  readonly selectedSlot: number | null;
  readonly onSelectSlot: (slotIndex: number | null) => void;
}) => {
  const squadById = useMemo(
    () => new Map(squad.map((player) => [player.id, player])),
    [squad],
  );

  const captainIds = tactic.takers.captain;
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
          fitWord: null,
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
        fitWord: null,
        condition: player.condition,
        isCaptain: captainIds.some((id) => id === player.id),
        id: `res-${player.id}`,
      }));
  }, [squad, startersSet, tactic.bench, captainIds]);

  const allRows = useMemo(() => [...starters, ...bench, ...reserves], [starters, bench, reserves]);

  const colorClass = "text-text-highlight";

  const CMD = "text-body text-text-secondary";
  const CTR = "px-2 py-1 text-left text-body truncate";

  return (
    <table data-testid="team-selection-grid" className="w-full text-left" role="grid" aria-label="Team Selection">
      <thead>
        <tr className="border-b border-border-subtle text-label text-text-muted">
          <th className="px-2 py-1 w-10">No</th>
          <th className="px-2 py-1">Player</th>
          <th className="px-2 py-1 w-12">Pos</th>
          <th className="px-2 py-1">Slot · Fit</th>
          <th className="px-2 py-1 w-14 text-right">Cond</th>
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
              data-selected={isSelected || undefined}
              onClick={() => onSelectSlot(row.slotIndex)}
              className={`cursor-pointer border-b border-border-subtle transition-colors ${
                isSelected ? "bg-text-highlight/15" : "hover:bg-row-hover"
              }`}
              tabIndex={0}
              role="row"
              aria-label={`${row.player?.firstName ?? "Empty"} ${row.player?.lastName ?? ""}`}
            >
              <td className="px-2 py-1">
                <span className="inline-flex h-5 min-w-9 items-center justify-center rounded-control bg-pitch-marker-gk px-1 text-caption font-bold tabular-nums text-text-bright">
                  {row.slotIndex! + 1}
                </span>
              </td>
              <td className="px-2 py-1 text-body">
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
              <td className="px-2 py-1 text-data text-text-secondary">
                {row.player ? row.player.positionLabel : "-"}
              </td>
              <td className="px-2 py-1 text-data">
                {row.cellLabel}
                {row.fitWord !== null && (
                  <>
                    <span className="mx-1 text-text-muted">·</span>
                    <span className={row.fitWord === "Natural" ? "font-semibold text-text-highlight" : row.fitWord === "Unfamiliar" ? "font-semibold text-text-warning" : "text-text-secondary"}>
                      {row.fitWord}
                    </span>
                  </>
                )}
              </td>
              <td className="px-2 py-1 text-right text-data tabular-nums">
                {row.condition !== null ? `${row.condition}%` : "-"}
              </td>
            </tr>
          );
        })}

        {/* Substitutes header */}
        <tr className="border-b border-border-subtle">
          <td colSpan={5} className="px-2 pt-3 pb-1 text-label font-semibold text-text-secondary">
            Substitutes
          </td>
        </tr>
        {bench.map((row) => (
          <tr
            key={row.id}
            data-player-id={row.playerId}
            onClick={() => {
              if (row.player && selectedSlot !== null) {
                // Swap selected starter with this substitute
                const from = selectedSlot;
                const slotPlayer = tactic.assignments[from];
                if (slotPlayer && row.player) {
                  window.dispatchEvent(
                    new CustomEvent("cm-tactic-swap", {
                      detail: { from: from, to: STARTER_COUNT + bench.indexOf(row) },
                    }),
                  );
                }
              }
            }}
            className={`cursor-pointer border-b border-border-subtle transition-colors hover:bg-row-hover ${
              selectedSlot !== null ? "text-text-primary" : "text-text-secondary"
            }`}
            tabIndex={0}
            role="row"
          >
            <td className="px-2 py-1">
              <span className="inline-flex h-5 min-w-9 items-center justify-center rounded-control bg-chrome-mid px-1 text-caption font-bold tabular-nums text-text-bright">
                SB{bench.indexOf(row) + 1}
              </span>
            </td>
            <td className="px-2 py-1 text-body">
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
            <td className="px-2 py-1 text-data text-text-secondary">
              {row.player ? row.player.positionLabel : "-"}
            </td>
            <td className="px-2 py-1 text-data text-text-muted">{row.cellLabel}</td>
            <td className="px-2 py-1 text-right text-data tabular-nums">
              {row.condition !== null ? `${row.condition}%` : "-"}
            </td>
          </tr>
        ))}

        {/* Reserves header */}
        <tr className="border-b border-border-subtle">
          <td colSpan={5} className="px-2 pt-3 pb-1 text-label font-semibold text-text-secondary">
            Reserves
          </td>
        </tr>
        {reserves.map((row) => (
          <tr
            key={row.id}
            data-player-id={row.playerId}
            className="border-b border-border-subtle text-text-muted"
            role="row"
          >
            <td className="px-2 py-1">
              <span className="inline-flex h-5 min-w-9 items-center justify-center rounded-control bg-chrome-mid px-1 text-caption font-bold tabular-nums text-text-bright">
                -
              </span>
            </td>
            <td className="px-2 py-1 text-body">
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
            <td className="px-2 py-1 text-data text-text-muted">
              {row.player ? row.player.positionLabel : "-"}
            </td>
            <td className="px-2 py-1 text-data text-text-muted">{row.cellLabel}</td>
            <td className="px-2 py-1 text-right text-data tabular-nums">
              {row.condition !== null ? `${row.condition}%` : "-"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};