/**
 * PROTOTYPE — throwaway. Answers `.scratch/club-selection/issues/01-two-column-workspace-shape.md`.
 *
 * Five variants of the Club Selection workspace, switchable via `?variant=` on the
 * existing `/create/step-2` route, rendered against real `getClubSelection` data.
 * Delete this whole directory once a variant wins; the winner gets rewritten
 * properly into `ClubSelectionScreen.tsx`.
 *
 * Known shell constraint this prototype had to work around, and which the real
 * implementation must fix rather than work around: `CreateFlowLayout`'s `<main>`
 * is a `max-w-5xl` centred, `overflow-y-auto` column, and `RouteView`'s wrapper
 * div passes no height through. A two-column workspace wants the full band width
 * and a definite height. `WORKSPACE` below fakes that with a viewport calc so the
 * variants can be judged; shipping means making the shell a flex-height column.
 */
import type { ReactNode } from "react";
import type { ClubSelectionRow } from "@cm-clone/contracts";
import { FOCUS_RING } from "../../focus.js";
import type { ClubLoadState } from "../../ClubSelectionScreen.js";

/** Header band + footer bar + `<main>`'s p-8, subtracted from the viewport. */
export const WORKSPACE = "h-[calc(100dvh-10rem)] min-h-[28rem] w-full";

/** The prototype breaks out of `<main>`'s max-w-5xl so the rail has real room. */
export const BREAKOUT = "mx-[calc(50%-50vw)] w-screen px-8";

export const FOCUS = FOCUS_RING.join(" ");

/**
 * The degenerate league selector, per the map's standing decision: correct in
 * shape, one option today. The world database has no league dimension, so the
 * only real source is the `LeagueSelectionSnapshot` on the creation session —
 * not plumbed here, hardcoded to keep the prototype about layout.
 */
export const LEAGUE_OPTIONS = [
  { id: "league-1", label: "Premier Division · 20 clubs" },
] as const;

export interface VariantProps {
  readonly state: ClubLoadState;
  readonly selectedClubId: string | null;
  readonly onSelect: (clubId: string) => void;
  readonly onPickForMe: () => void;
  readonly leagueId: string;
  readonly onLeagueChange: (leagueId: string) => void;
}

export const money = (value: number): string =>
  value >= 1_000_000
    ? `$${(value / 1_000_000).toFixed(1)}M`
    : value >= 1_000
      ? `$${Math.round(value / 1_000)}k`
      : `$${Math.round(value)}`;

export const objective = (club: ClubSelectionRow): string =>
  `${club.boardObjectiveMin}–${club.boardObjectiveMax}`;

export const TIER_LABEL: Readonly<Record<string, string>> = {
  big: "Big club",
  mid: "Mid table",
  small: "Small club",
};

/** Squad Quality as an ordinal 1–6, for the meter in variant D. */
export const QUALITY_RANK: Readonly<Record<string, number>> = {
  "Very Weak": 1,
  Weak: 2,
  Competitive: 3,
  Strong: 4,
  "Very Strong": 5,
  Elite: 6,
};

export const SkeletonRows = ({ count }: { readonly count: number }) => (
  <ul className="space-y-1 p-2">
    {Array.from({ length: count }, (_, index) => (
      <li
        key={index}
        className="h-9 animate-pulse rounded-control bg-surface-raised motion-reduce:animate-none"
      />
    ))}
  </ul>
);

export const RailShell = ({
  width,
  children,
}: {
  readonly width: string;
  readonly children: ReactNode;
}) => (
  <div className={`flex ${width} shrink-0 flex-col border-r border-border-subtle bg-bg-raised`}>
    {children}
  </div>
);
