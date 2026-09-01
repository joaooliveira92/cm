/**
 * PROTOTYPE — variant A: "Dense rail, dossier right".
 *
 * Row carries three facts (name, stature tier, transfer budget). Everything else
 * is detail-panel only. Auto-selects the first club, so the panel is never blank.
 * Rail and panel load independently: the rail shows skeleton rows while the panel
 * shows its own placeholder.
 * Selection reads as a filled row plus a left accent bar; focus reads as the ring.
 */
import { useEffect } from "react";
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
  SkeletonRows,
  TIER_LABEL,
  WORKSPACE,
  type VariantProps,
} from "./shared.js";

export const VariantA = ({
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
    <div className={`${WORKSPACE} ${BREAKOUT} flex gap-0 overflow-hidden rounded-panel border border-border-subtle`}>
      <RailShell width="w-72">
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
                      className={`${FOCUS} flex w-full cursor-pointer items-center gap-2 border-l-2 px-3 py-1.5 text-left hover:bg-row-hover ${
                        isSelected
                          ? "border-text-highlight bg-row-selected"
                          : "border-transparent"
                      }`}
                      onClick={() => {
                        onSelect(club.clubId);
                      }}
                    >
                      <span className="min-w-0 flex-1 truncate text-sm text-text-primary">
                        {club.clubName}
                      </span>
                      <Badge variant="outline">{club.statureTier}</Badge>
                      <span className="w-14 text-right text-2xs tabular-nums text-text-secondary">
                        {money(club.transferBudget)}
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

      <section className="min-w-0 flex-1 overflow-y-auto bg-panel-bg p-6">
        {selected === null ? (
          <p className="inline-flex items-center gap-2 text-sm text-text-secondary">
            <Spinner /> Loading club&hellip;
          </p>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-text-bright">{selected.clubName}</h2>
              <Badge variant="outline">{TIER_LABEL[selected.statureTier]}</Badge>
            </div>

            <dl className="mt-6 grid max-w-xl grid-cols-2 gap-x-8 gap-y-3 text-sm">
              {[
                ["Board objective", `Finish ${objective(selected)}`],
                ["Squad quality", selected.squadQualityBand],
                ["Transfer budget", money(selected.transferBudget)],
                ["Wage budget", `${money(selected.wageBudget)} / wk`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between border-b border-border-subtle pb-1">
                  <dt className="text-text-muted">{label}</dt>
                  <dd className="tabular-nums text-text-body">{value}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </section>
    </div>
  );
};
