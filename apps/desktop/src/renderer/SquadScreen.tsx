import { useEffect, useRef, useState } from "react";
import { type SaveId } from "@cm-clone/contracts";
import {
  GOALKEEPING_ATTRIBUTES,
  MENTAL_ATTRIBUTES,
  PHYSICAL_ATTRIBUTES,
  TECHNICAL_ATTRIBUTES,
} from "@cm-clone/shared";
import { describeRpcError, squadAtom, typedError, useAtomValue } from "./rpc.js";
import {
  focusIdOf,
  restoreCollectionFocus,
  rovingTabIndex,
  setBusy,
  type CollectionFocusBookmark,
} from "./focus.js";

const ATTRIBUTE_GROUPS = [
  { label: "Technical", keys: TECHNICAL_ATTRIBUTES },
  { label: "Mental", keys: MENTAL_ATTRIBUTES },
  { label: "Physical", keys: PHYSICAL_ATTRIBUTES },
  { label: "Goalkeeping", keys: GOALKEEPING_ATTRIBUTES },
] as const;

const ALL_DISPLAYED_ATTRIBUTES = ATTRIBUTE_GROUPS.flatMap((group) => group.keys);

const REGION = "squadTable";

export const SquadScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const squadResult = useAtomValue(squadAtom(saveId));
  const [activeId, setActiveId] = useState<string | null>(null);
  const bookmarkRef = useRef<CollectionFocusBookmark | undefined>(undefined);
  const busyRef = useRef<HTMLTableSectionElement | null>(null);

  const players = squadResult._tag === "Success" ? squadResult.value.players : [];
  const presentIds = players.map((player) => String(player.id));

  // Mark the region busy during a refetch so the initiating control stays put.
  useEffect(() => {
    setBusy(busyRef.current, squadResult.waiting);
    return () => setBusy(busyRef.current, false);
  }, [squadResult.waiting]);

  // Identity-based async restoration (AC-21): after a refetch, focus the resolved
  // survivor — same item, else old next neighbour, else old previous, else first,
  // else the caller keeps focus. Never `document.body`.
  useEffect(() => {
    if (squadResult.waiting) return;
    const stillPresent = activeId !== null && presentIds.includes(activeId);
    if (stillPresent) return;
    restoreCollectionFocus(bookmarkRef.current, presentIds, (id) => focusIdOf("squad", REGION, id));
  }, [presentIds, squadResult.waiting]);

  const error = typedError(squadResult);
  if (error) return <p className="p-8 text-red-400">{describeRpcError(error)}</p>;
  if (squadResult._tag === "Initial") return <p className="p-8 text-slate-400">Loading squad...</p>;
  if (squadResult._tag === "Failure") return <p className="p-8 text-red-400">Failed to load squad</p>;

  const squad = squadResult.value;

  const focusRow = (id: string): void => {
    (document.querySelector(
      `[data-focus-id="${focusIdOf("squad", REGION, id)}"]`,
    ) as HTMLElement | null)?.focus();
  };

  const moveFocus = (direction: 1 | -1): void => {
    if (presentIds.length === 0) return;
    const idx = presentIds.indexOf(activeId ?? "");
    const base = idx === -1 ? 0 : (idx + direction + presentIds.length) % presentIds.length;
    const next = presentIds[base]!;
    const bookmark: CollectionFocusBookmark = {
      item: next,
      next: presentIds[base + 1],
      prev: presentIds[base - 1],
    };
    bookmarkRef.current = bookmark;
    setActiveId(next);
    focusRow(next);
  };

  const onRowKeyDown = (event: React.KeyboardEvent): void => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        moveFocus(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        moveFocus(-1);
        break;
      case "Home":
        event.preventDefault();
        if (presentIds[0]) {
          bookmarkRef.current = { item: presentIds[0], next: presentIds[1] };
          setActiveId(presentIds[0]);
          focusRow(presentIds[0]);
        }
        break;
      case "End":
        event.preventDefault();
        const last = presentIds[presentIds.length - 1];
        if (last) {
          bookmarkRef.current = { item: last, prev: presentIds[presentIds.length - 2] };
          setActiveId(last);
          focusRow(last);
        }
        break;
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <h1 className="text-2xl font-bold">{squad.club.name}</h1>
      <p className="mt-1 text-sm text-slate-400">
        Stature Tier: {squad.club.statureTier} &middot; {players.length} players
        {squadResult.waiting && <span className="ml-2 text-slate-500">Refreshing…</span>}
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400">
              <th className="py-1 pr-4">Name</th>
              <th className="py-1 pr-4">Age</th>
              <th className="py-1 pr-4">Positions</th>
              <th className="py-1 pr-4">OVR</th>
              {ALL_DISPLAYED_ATTRIBUTES.map((key) => (
                <th key={key} className="py-1 pr-2 text-xs">
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody ref={busyRef} onKeyDown={onRowKeyDown}>
            {players.map((player) => {
              const attributes: Record<string, number | undefined> = player.attributes;
              const positionRatings: Record<string, number> = player.positionRatings;
              // Roving tabindex: one active tab stop. When no row is focused yet,
              // the first row is the active stop so Tab enters the sequence.
              const effectiveActive = activeId ?? presentIds[0] ?? null;

              return (
                <tr
                  key={player.id}
                  data-focus-id={focusIdOf("squad", REGION, String(player.id))}
                  tabIndex={rovingTabIndex(effectiveActive, String(player.id))}
                  onFocus={() => setActiveId(String(player.id))}                  className="border-b border-slate-800 outline-none focus-visible:bg-slate-800/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300"
                >
                  <td className="py-1 pr-4 whitespace-nowrap">
                    {player.firstName} {player.lastName}
                  </td>
                  <td className="py-1 pr-4">{player.age}</td>
                  <td className="py-1 pr-4 whitespace-nowrap">
                    {player.positions
                      .map((p) => `${p.position} (${p.familiarity}, ${positionRatings[p.position]})`)
                      .join(", ")}
                  </td>
                  <td className="py-1 pr-4 font-semibold">{player.overallRating}</td>
                  {ALL_DISPLAYED_ATTRIBUTES.map((key) => (
                    <td key={key} className="py-1 pr-2 text-center text-xs">
                      {attributes[key] ?? "-"}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
};
