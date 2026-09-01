/**
 * PROTOTYPE — variant D: "Quality meters, league-summary fallback".
 *
 * Row carries name, stature tier and a squad-quality meter — the one fact a
 * narrow row can show comparatively rather than numerically. Nothing is
 * auto-selected, but the panel is never blank either: before a club is chosen it
 * shows a league summary, which is true without pretending a selection exists.
 * Rail loads independently; a rail error is inline, not whole-screen.
 * Selection reads three ways at once — filled row, accent bar, and a SELECTED
 * badge — so it survives being read without colour. Focus stays the ring.
 */
import type { ClubSelectionRow } from "@cm-clone/contracts";
import { Badge } from "../../components/ui/badge.js";
import { Button } from "../../components/ui/button.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select.js";
import {
  BREAKOUT,
  FOCUS,
  LEAGUE_OPTIONS,
  money,
  objective,
  QUALITY_RANK,
  RailShell,
  SkeletonRows,
  TIER_LABEL,
  WORKSPACE,
  type VariantProps,
} from "./shared.js";

const QualityMeter = ({ band }: { readonly band: string }) => {
  const rank = QUALITY_RANK[band] ?? 0;
  return (
    <span className="flex gap-0.5" aria-label={`Squad quality ${band}`}>
      {Array.from({ length: 6 }, (_, index) => (
        <span
          key={index}
          aria-hidden="true"
          className={`h-1.5 w-3 rounded-xs ${index < rank ? "bg-text-highlight" : "bg-surface-raised"}`}
        />
      ))}
    </span>
  );
};

const LeagueSummary = ({ clubs }: { readonly clubs: ReadonlyArray<ClubSelectionRow> }) => {
  const counts = clubs.reduce<Record<string, number>>((totals, club) => {
    totals[club.statureTier] = (totals[club.statureTier] ?? 0) + 1;
    return totals;
  }, {});

  return (
    <div className="m-auto max-w-md text-center">
      <h2 className="text-lg font-semibold text-text-primary">Premier Division</h2>
      <p className="mt-2 text-sm text-text-secondary">
        {clubs.length} clubs available. Pick one on the left to see its objective, squad and
        budgets — or let the game choose.
      </p>
      <dl className="mt-6 flex justify-center gap-8 text-sm">
        {(["big", "mid", "small"] as const).map((tier) => (
          <div key={tier}>
            <dt className="text-2xs uppercase tracking-wide text-text-muted">{TIER_LABEL[tier]}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-text-bright">
              {counts[tier] ?? 0}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

export const VariantD = ({
  state,
  selectedClubId,
  onSelect,
  onPickForMe,
  leagueId,
  onLeagueChange,
}: VariantProps) => {
  const clubs = state.kind === "ready" ? state.clubs : [];
  const selected = clubs.find((club) => club.clubId === selectedClubId) ?? null;

  return (
    <div className={`${WORKSPACE} ${BREAKOUT} flex overflow-hidden rounded-panel border border-border-subtle`}>
      <RailShell width="w-80">
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
          {state.kind === "loading" && <SkeletonRows count={10} />}
          {state.kind === "error" && (
            <p className="p-3 text-sm text-destructive">{state.message}</p>
          )}
          {state.kind === "ready" && (
            <ul>
              {clubs.map((club) => {
                const isSelected = club.clubId === selectedClubId;
                return (
                  <li key={club.clubId}>
                    <button
                      type="button"
                      aria-selected={isSelected}
                      className={`${FOCUS} block w-full cursor-pointer border-l-2 px-3 py-2 text-left hover:bg-row-hover ${
                        isSelected
                          ? "border-text-highlight bg-row-selected"
                          : "border-transparent"
                      }`}
                      onClick={() => {
                        onSelect(club.clubId);
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-sm text-text-primary">
                          {club.clubName}
                        </span>
                        {isSelected ? (
                          <Badge>Selected</Badge>
                        ) : (
                          <Badge variant="outline">{club.statureTier}</Badge>
                        )}
                      </span>
                      <span className="mt-1 flex items-center gap-2">
                        <QualityMeter band={club.squadQualityBand} />
                        <span className="text-2xs text-text-muted">{club.squadQualityBand}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
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

      <section className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-panel-bg p-6">
        {selected === null ? (
          <LeagueSummary clubs={clubs} />
        ) : (
          <>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-text-bright">{selected.clubName}</h2>
              <Badge variant="outline">{TIER_LABEL[selected.statureTier]}</Badge>
            </div>

            <dl className="mt-6 grid max-w-2xl grid-cols-[10rem_1fr] gap-x-6 gap-y-2 text-sm">
              {[
                ["Board objective", `Finish ${objective(selected)}`],
                ["Squad quality", selected.squadQualityBand],
                ["Transfer budget", money(selected.transferBudget)],
                ["Wage budget", `${money(selected.wageBudget)} / wk`],
              ].map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-text-muted">{label}</dt>
                  <dd className="tabular-nums text-text-body">{value}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-6 max-w-2xl text-sm text-text-secondary">
              {clubs.filter((club) => club.transferBudget > selected.transferBudget).length} of{" "}
              {clubs.length} clubs in this league have a larger transfer budget.
            </p>
          </>
        )}
      </section>
    </div>
  );
};
