"use client";

import type { ClubSelectionRow } from "@cm-clone/contracts";
import { useMemo } from "react";
import { Badge } from "../components/ui/badge.js";
import type { BadgeProps } from "../components/ui/badge.js";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.js";
import { ClubBadge } from "../components/shared/ClubBadge.js";
import { Separator } from "../components/ui/separator.js";
import { Progress } from "../components/ui/progress.js";
import { NumberTicker } from "../components/ui/number-ticker.js";
import { Tooltip, TooltipContent, TooltipTrigger } from "../components/ui/tooltip.js";
import { formatCredits } from "../format.js";
import { PANEL_STRONG } from "../theme.js";
import { expectationProse, type LeagueSummary } from "./model.js";

export interface ClubDetailPanelProps {
  readonly club: ClubSelectionRow | null;
  readonly summary: LeagueSummary;
  readonly announcement: string;
}

const QUALITY_LABEL: Record<string, { label: string; variant: string }> = {
  Champion: { label: "Elite", variant: "default" },
  Exceptional: { label: "Elite", variant: "default" },
  Excellent: { label: "Strong", variant: "success" },
  "Very Good": { label: "Strong", variant: "success" },
  Good: { label: "Solid", variant: "warning" },
  Acceptable: { label: "Solid", variant: "warning" },
  "Below Average": { label: "Modest", variant: "destructive" },
  Poor: { label: "Modest", variant: "destructive" },
};

const statureLabel = (tier: string): string =>
  tier === "big" ? "Major Club" : tier === "mid" ? "Established Club" : "Small Club";

const qualityPercentOf = (band: string): number => {
  const idx = ["Champion", "Exceptional", "Excellent", "Very Good", "Good", "Acceptable", "Below Average", "Poor"].indexOf(band);
  if (idx === -1) return 0;
  return ((idx + 1) / 8) * 100;
};

/**
 * The right-hand panel. Before a pick it shows the league summary — true before any decision
 * exists, where an auto-selected club would assert a choice nobody made and an empty state would
 * waste the larger half of the workspace at the moment the player knows least.
 *
 * After a pick it is a rich club profile built entirely from the payload the rail already
 * has: no second call, so no loading state of its own. Budgets are animated with
 * NumberTicker; the squad quality bar, colour-coded cards and tooltip-augmented player
 * rows give the panel visual depth without a second fetch.
 *
 * It carries the screen's single polite announcer, which speaks only when the shown club changes
 * — arrow-key roving moves focus, not the panel, and narrating per row would be a barrage.
 */
export const ClubDetailPanel = ({ club, summary, announcement }: ClubDetailPanelProps) => {
  const qualityInfo = useMemo(() => {
    if (!club) return null;
    return QUALITY_LABEL[club.squadQualityBand] ?? { label: club.squadQualityBand, variant: "outline" as BadgeProps["variant"] };
  }, [club]);

  const qualityPct = useMemo(() => (club ? qualityPercentOf(club.squadQualityBand) : 0), [club]);

  if (club === null) {
    return (
      <section aria-label="Club detail" className={`${PANEL_STRONG} flex min-h-0 flex-1 flex-col overflow-y-auto`}>
        <div role="status" aria-live="polite" className="sr-only">
          {announcement}
        </div>
        <div className="text-text-body">
          <h3 className="text-base font-semibold text-text-primary">The league</h3>
          <p className="mt-2 text-sm">
            {summary.clubCount} club{summary.clubCount === 1 ? "" : "s"} to choose from.
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {summary.tiers.map(({ tier, count }) => (
              <li key={tier} className="flex items-center gap-2">
                <Badge variant="outline">{tier}</Badge>
                <span>
                  {count} club{count === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-text-muted">Choose a club to see what the job looks like.</p>
        </div>
      </section>
    );
  }

  const pColour = club.clubColours.primary.background;
  const fColour = club.clubColours.primary.foreground;

  return (
    <section aria-label="Club detail" className={`${PANEL_STRONG} flex min-h-0 flex-1 flex-col overflow-y-auto`}>
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {/* Club-coloured hero band */}
      <div
        className="relative -mx-3 mb-4 px-3 py-3"
        style={{ backgroundColor: pColour, color: fColour }}
      >
        <div className="flex items-center gap-3">
          <ClubBadge badgeKey={club.badgeKey} colours={club.clubColours} clubName={club.clubName} size={40} />
          <div className="flex-1 min-w-0">
            <h2
              className="text-lg font-bold truncate leading-tight"
              style={{ color: fColour }}
            >
              {club.clubName}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-2xs">
                {statureLabel(club.statureTier)}
              </Badge>
              <Badge className="text-2xs">{club.squadQualityBand}</Badge>
            </div>
          </div>
        </div>
        {/* Subtle gradient overlay at the bottom of the band */}
        <div
          className="absolute bottom-0 left-0 right-0 h-4"
          style={{
            background: `linear-gradient(to top, ${pColour}, transparent)`,
          }}
        />
      </div>

      {/* Board objective */}
      <Card className="mb-3">
        <CardHeader className="pb-2 pt-2">
          <CardTitle className="text-xs font-semibold tracking-wide uppercase text-text-muted">
            Board Objective
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-2">
          <p className="text-sm font-medium text-text-primary">{expectationProse(club, summary.clubCount)}</p>
          <div className="mt-2 flex gap-2">
            <Badge variant="outline">{club.statureTier}</Badge>
            <Badge variant={qualityInfo?.variant as BadgeProps["variant"] ?? "outline"}>{qualityInfo?.label ?? club.squadQualityBand}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Squad Quality meter */}
      <Card className="mb-3">
        <CardHeader className="pb-2 pt-2">
          <CardTitle className="text-xs font-semibold tracking-wide uppercase text-text-muted">
            Squad Quality
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="flex items-center gap-3">
            <Progress value={qualityPct} className="h-2 flex-1" />
            <span className="text-xs font-semibold tabular-nums" style={{ color: pColour }}>
              {Math.round(qualityPct)}%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Budgets */}
      <Card className="mb-3">
        <CardHeader className="pb-2 pt-2">
          <CardTitle className="text-xs font-semibold tracking-wide uppercase text-text-muted">
            Finances
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-2 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">Transfer Budget</span>
            <Tooltip>
              <TooltipTrigger>
                <span className="text-sm font-semibold tabular-nums">
                  <NumberTicker value={club.transferBudget} locale suffix=" Cr" />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <span>{formatCredits(club.transferBudget)}</span>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">Wage Budget</span>
            <Tooltip>
              <TooltipTrigger>
                <span className="text-sm font-semibold tabular-nums">
                  <NumberTicker value={club.wageBudget} locale suffix=" Cr" />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <span>{formatCredits(club.wageBudget)}</span>
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">Wage / Season</span>
            <span className="text-xs text-text-muted">
              {formatCredits(club.wageBudget)} / season
            </span>
          </div>
        </CardContent>
      </Card>

      <Separator className="my-2" />

      {/* Top Players */}
      <Card className="mb-3 flex-1 min-h-0">
        <CardHeader className="pb-2 pt-2">
          <CardTitle className="text-xs font-semibold tracking-wide uppercase text-text-muted">
            Top Players
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-2 pt-0">
          <ul className="space-y-1">
            {club.detail.topPlayers.map((player) => (
              <li key={player.name}>
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-surface-raised transition-colors">
                      <span className="truncate text-sm font-medium text-text-primary">{player.name}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="outline" className="text-2xs">
                          {player.position}
                        </Badge>
                        <span className="text-xs font-semibold tabular-nums">{player.overallRating}</span>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold">{player.name}</span>
                      <span className="text-xs text-text-muted">
                        {player.position} · Overall {player.overallRating}
                      </span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Squad summary footer */}
      <div className="flex items-center justify-between text-xs text-text-muted px-1 py-1">
        <span>Squad of {club.detail.squadSize}</span>
        <span>Avg age {club.detail.averageAge}</span>
        <span>{club.detail.topPlayers.length} rated</span>
      </div>
    </section>
  );
};
