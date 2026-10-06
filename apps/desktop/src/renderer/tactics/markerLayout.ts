import type { SquadPlayerView } from "@cm-clone/contracts";
import { familiarityOf, slotLabel, type Slot } from "@cm-clone/shared";

/** A marker's width: 6rem, or under a fifth of a narrow pitch, the gap between its five columns, so
 *  neighbours' captions truncate rather than run into each other. Units read the pitch `@container`. */
const MARKER_WIDTH = "min(6rem, 19cqw)";

/** How far a marker's caption hangs below its disc, so the disc's centre lands on the slot's spot
 *  rather than the whole marker's bottom edge. */
const CAPTION_LIFT = "0.875rem";

/**
 * How far a caption centred on `x` has to move to stay on the pitch, where `half` is the caption's
 *  half-width: past the left touchline it moves right by the overhang, past the right one left by it,
 *  and otherwise not. Both are in the percent-of-width units `x` is given.
 */
export const captionShiftIn = (x: number, half: number): number =>
  Math.max(half - x, Math.min(0, 100 - x - half));

/** `captionShiftIn` as the browser resolves it. A marker's width follows the pitch through a
 *  container query, which JS cannot read, so the same clamp is spelled out as `max`/`min` over `cqw`
 *  and the browser re-evaluates it whenever the pitch resizes. */
export const captionShift = (x: number): string => {
  const half = `(${MARKER_WIDTH} / 2)`;
  return `translateX(max(calc(${half} - ${x}cqw), min(0px, calc(${100 - x}cqw - ${half}))))`;
};

/** A marker's box at `x`/`y`, in percent of the pitch: the disc on the spot, the caption under it. */
export const markerBox = (
  x: number,
  y: number,
): { readonly left: string; readonly top: string; readonly width: string } => ({
  left: `${x}%`,
  top: `calc(${y}% - ${CAPTION_LIFT})`,
  width: MARKER_WIDTH,
});

/** "Gilardino, A" — the marker caption; the full name is in the Team Selection list beside it. */
export const markerName = (player: SquadPlayerView): string =>
  `${player.lastName}, ${player.firstName.slice(0, 1)}`;

/** The fit tier word for a player in their slot. */
export const fitTierWord = (player: SquadPlayerView, cell: Slot): string => {
  const t = familiarityOf(player.suitability[slotLabel(cell)] ?? 1);
  return t === "natural" ? "Natural" : t === "competent" ? "Competent" : "Unfamiliar";
};

const pct = (n: number): string => `${n}%`;

export interface PitchView {
  readonly position: boolean;
  readonly fit: boolean;
  readonly condition: boolean;
}

const DEFAULT_PITCH_VIEW: PitchView = { position: false, fit: true, condition: false };

/** The info line shown below the player name on the pitch, based on view selection. */
export const pitchInfoLine = (player: SquadPlayerView, cell: Slot, view?: PitchView): string | null => {
  const v = view ?? DEFAULT_PITCH_VIEW;
  if (v.fit) return fitTierWord(player, cell);
  if (v.position) return player.positionLabel;
  if (v.condition) return pct(player.condition);
  return null;
};
