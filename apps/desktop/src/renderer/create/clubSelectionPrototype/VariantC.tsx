/**
 * PROTOTYPE — variant C: "Name-only rail, grouped by stature".
 *
 * The row carries exactly one fact — the club name — with the stature tier
 * promoted to a sticky group heading, so the tier is readable without repeating
 * it twenty times. Every other fact is detail-panel only, rendered as large
 * figures. Auto-selects the first club. Rail and panel load independently.
 * Selection reads as a filled row with highlight-coloured text; focus is the ring.
 */
import { useEffect } from "react";
import type { ClubSelectionRow } from "@cm-clone/contracts";
import { Button } from "../../components/ui/button.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select.js";
import { Spinner } from "../../components/ui/spinner.js";
import {
  BREAKOUT,
  FOCUS,
  LEAGUE_OPTIONS,
  money,
  objective,
  RailShell,
  SkeletonRows,
  TIER_LABEL,
  WORKSPACE,
  type VariantProps,
} from "./shared.js";

const TIER_ORDER = ["big", "mid", "small"] as const;

const groupByTier = (
  clubs: ReadonlyArray<ClubSelectionRow>,
): ReadonlyArray<readonly [string, ReadonlyArray<ClubSelectionRow>]> =>
  TIER_ORDER.map(
    (tier) => [tier, clubs.filter((club) => club.statureTier === tier)] as const,
  ).filter(([, members]) => members.length > 0);

export const VariantC = ({
  state,
  selectedClubId,
  onSelect,
  onPickForMe,
  leagueId,
  onLeagueChange,
}: VariantProps) => {
  const clubs = state.kind === "ready" ? state.clubs : [];
  const selected = clubs.find((club) => club.clubId === selectedClubId) ?? null;

  useEffect(() => {
    if (selectedClubId === null && clubs.length > 0) onSelect(clubs[0]!.clubId);
  }, [clubs, onSelect, selectedClubId]);

  return (
    <div className={`${WORKSPACE} ${BREAKOUT} flex overflow-hidden rounded-panel border border-border-subtle`}>
      <RailShell width="w-56">
        <div className="border-b border-border-subtle p-2">
          <Select value={leagueId} onValueChange={onLeagueChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="League" />
            </SelectTrigger>
            <SelectContent>
              {LEAGUE_OPTIONS.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {state.kind === "loading" && <SkeletonRows count={12} />}
          {state.kind === "error" && (
            <p className="p-3 text-sm text-destructive">{state.message}</p>
          )}
          {state.kind === "ready" &&
            groupByTier(clubs).map(([tier, members]) => (
              <section key={tier}>
                <h3 className="sticky top-0 bg-surface px-3 py-1 text-2xs font-semibold uppercase tracking-wide text-text-muted">
                  {TIER_LABEL[tier]}
                </h3>
                <ul>
                  {members.map((club) => {
                    const isSelected = club.clubId === selectedClubId;
                    return (
                      <li key={club.clubId}>
                        <button
                          type="button"
                          aria-selected={isSelected}
                          className={`${FOCUS} block w-full cursor-pointer truncate px-3 py-1.5 text-left text-sm hover:bg-row-hover ${
                            isSelected
                              ? "bg-row-selected font-semibold text-text-highlight"
                              : "text-text-primary"
                          }`}
                          onClick={() => {
                            onSelect(club.clubId);
                          }}
                        >
                          {club.clubName}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
        </div>

        <div className="border-t border-border-subtle p-2">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={clubs.length === 0}
            onClick={onPickForMe}
          >
            Pick a team for me
          </Button>
        </div>
      </RailShell>

      <section className="min-w-0 flex-1 overflow-y-auto bg-panel-bg p-8">
        {selected === null ? (
          <p className="inline-flex items-center gap-2 text-sm text-text-secondary">
            <Spinner /> Loading club&hellip;
          </p>
        ) : (
          <>
            <p className="text-2xs uppercase tracking-wide text-text-muted">
              {TIER_LABEL[selected.statureTier]}
            </p>
            <h2 className="mt-1 text-3xl font-bold text-text-bright">{selected.clubName}</h2>

            <div className="mt-8 flex flex-wrap gap-10">
              {[
                ["Board objective", `Finish ${objective(selected)}`],
                ["Squad quality", selected.squadQualityBand],
                ["Transfer budget", money(selected.transferBudget)],
                ["Wage budget / wk", money(selected.wageBudget)],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-2xs uppercase tracking-wide text-text-muted">{label}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-text-bright">{value}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
};
