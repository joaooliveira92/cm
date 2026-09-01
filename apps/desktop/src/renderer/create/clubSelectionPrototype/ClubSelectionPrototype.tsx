/**
 * PROTOTYPE — throwaway host. Owns the state every variant shares (which club is
 * selected, which league, the `Pick a team for me` roll) so the variants only
 * disagree about layout. Selection resets on variant change, so each variant's
 * own answer to "is anything selected on arrival?" is what you actually see.
 */
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ClubCardList, type ClubLoadState } from "../../ClubSelectionScreen.js";
import { Spinner } from "../../components/ui/spinner.js";
import { PrototypeSwitcher, type VariantEntry } from "./PrototypeSwitcher.js";
import { LEAGUE_OPTIONS, type VariantProps } from "./shared.js";
import { VariantA } from "./VariantA.js";
import { VariantB } from "./VariantB.js";
import { VariantC } from "./VariantC.js";
import { VariantD } from "./VariantD.js";

/** Variant 0: the shipped single scrolling column, kept as the baseline. */
const Variant0 = ({ state }: VariantProps) => {
  if (state.kind === "error") return <p className="p-8 text-destructive">{state.message}</p>;
  if (state.kind === "loading") {
    return (
      <div className="py-12 text-center">
        <p className="inline-flex items-center gap-2 text-text-secondary">
          <Spinner /> Loading clubs&hellip;
        </p>
      </div>
    );
  }
  return <ClubCardList clubs={state.clubs} />;
};

/**
 * `Component`, not a render function that the host calls. The variants disagree
 * about hooks — A and C auto-select through a `useEffect`, B and D do not — so
 * calling them inline would splice their hooks into this component's own list
 * and blow up on every switch between the two groups. As an element type each
 * variant gets its own fiber, and `key` below makes a switch a remount.
 */
const VARIANTS: ReadonlyArray<
  VariantEntry & { readonly Component: (props: VariantProps) => ReactNode }
> = [
  { key: "0", name: "Today — single scrolling column", Component: Variant0 },
  { key: "A", name: "Dense rail, dossier right", Component: VariantA },
  { key: "B", name: "Three-fact rows, empty until chosen", Component: VariantB },
  { key: "C", name: "Name-only rail, grouped by stature", Component: VariantC },
  { key: "D", name: "Quality meters, league-summary fallback", Component: VariantD },
];

export const ClubSelectionPrototype = ({ state }: { readonly state: ClubLoadState }) => {
  const [variant, setVariant] = useState("A");
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [leagueId, setLeagueId] = useState<string>(LEAGUE_OPTIONS[0].id);

  useEffect(() => {
    setSelectedClubId(null);
  }, [variant]);

  const onSelect = useCallback((clubId: string) => {
    setSelectedClubId(clubId);
  }, []);

  const onPickForMe = useCallback(() => {
    if (state.kind !== "ready" || state.clubs.length === 0) return;
    const index = Math.floor(Math.random() * state.clubs.length);
    setSelectedClubId(state.clubs[index]!.clubId);
  }, [state]);

  const active = VARIANTS.find((entry) => entry.key === variant) ?? VARIANTS[0]!;
  const Active = active.Component;

  return (
    <>
      <Active
        key={active.key}
        state={state}
        selectedClubId={selectedClubId}
        onSelect={onSelect}
        onPickForMe={onPickForMe}
        leagueId={leagueId}
        onLeagueChange={setLeagueId}
      />

      <PrototypeSwitcher variants={VARIANTS} current={variant} onChange={setVariant} />

      {/* Rule 5: surface the state the variants disagree about. */}
      <p className="fixed bottom-2 left-2 z-50 rounded-control bg-black/80 px-2 py-1 text-2xs text-text-secondary">
        load: {state.kind} · clubs: {state.kind === "ready" ? state.clubs.length : 0} · selected:{" "}
        {selectedClubId ?? "none"} · league: {leagueId}
      </p>
    </>
  );
};
