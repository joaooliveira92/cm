/**
 * PROTOTYPE — variant B: "Three-fact rows, empty until chosen".
 *
 * Row carries name, stature tier and board objective on two lines. Nothing is
 * auto-selected; the right panel is an explicit empty state, and `Pick a team for
 * me` lives *in that panel* as its primary affordance rather than in the rail.
 * Loading and error stay whole-workspace, exactly as the screen behaves today.
 * Selection reads as a filled chrome-gradient row; focus reads as the ring.
 */
import { Badge } from "../../components/ui/badge.js";
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
  TIER_LABEL,
  WORKSPACE,
  type VariantProps,
} from "./shared.js";

export const VariantB = ({
  state,
  selectedClubId,
  onSelect,
  onPickForMe,
  leagueId,
  onLeagueChange,
}: VariantProps) => {
  if (state.kind === "error") {
    return <p className="p-8 text-destructive">{state.message}</p>;
  }

  if (state.kind === "loading") {
    return (
      <div className="py-12 text-center">
        <p className="inline-flex items-center gap-2 text-text-secondary">
          <Spinner /> Loading clubs&hellip;
        </p>
      </div>
    );
  }

  const selected = state.clubs.find((club) => club.clubId === selectedClubId) ?? null;

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

        <ul className="min-h-0 flex-1 overflow-y-auto">
          {state.clubs.map((club) => {
            const isSelected = club.clubId === selectedClubId;
            return (
              <li key={club.clubId}>
                <button
                  type="button"
                  aria-selected={isSelected}
                  className={`${FOCUS} block w-full cursor-pointer px-3 py-2 text-left ${
                    isSelected ? "chrome-gradient" : "hover:bg-row-hover"
                  }`}
                  onClick={() => {
                    onSelect(club.clubId);
                  }}
                >
                  <span
                    className={`block truncate text-sm ${
                      isSelected ? "font-semibold text-text-bright" : "text-text-primary"
                    }`}
                  >
                    {club.clubName}
                  </span>
                  <span
                    className={`block text-2xs ${
                      isSelected ? "text-text-primary" : "text-text-muted"
                    }`}
                  >
                    {TIER_LABEL[club.statureTier]} · finish {objective(club)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </RailShell>

      <section className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-panel-bg p-6">
        {selected === null ? (
          <div className="m-auto max-w-sm text-center">
            <h2 className="text-lg font-semibold text-text-primary">No club selected</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Choose a club from the list to see its board objective, squad quality and budgets.
            </p>
            <Button type="button" className="mt-6" onClick={onPickForMe}>
              Pick a team for me
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-text-bright">{selected.clubName}</h2>
              <Badge variant="outline">{TIER_LABEL[selected.statureTier]}</Badge>
            </div>

            <div className="mt-6 grid max-w-2xl grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                ["Objective", `Finish ${objective(selected)}`],
                ["Squad", selected.squadQualityBand],
                ["Transfers", money(selected.transferBudget)],
                ["Wages / wk", money(selected.wageBudget)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-panel border border-panel-border bg-panel-bg-strong px-3 py-2">
                  <p className="text-2xs uppercase tracking-wide text-text-muted">{label}</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-text-bright">{value}</p>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="secondary"
              className="mt-6 self-start"
              onClick={onPickForMe}
            >
              Pick a team for me instead
            </Button>
          </>
        )}
      </section>
    </div>
  );
};
