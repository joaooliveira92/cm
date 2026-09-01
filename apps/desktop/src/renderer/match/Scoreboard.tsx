/**
 * The match-day scoreboard — the one match-only element in the renderer.
 *
 * A neutral chrome-band with white score boxes: the two club names flanking the
 * score. It renders from club name and score alone, because that is all the
 * domain exposes (`ClubSummary` carries no colours or crests), so the neutral
 * archetype is the match-day picture and needs no club data.
 *
 * Its token family (`--color-scoreboard-*` in `index.css`) is deliberate: the
 * only match-only tokens, so a future club-colour upgrade is a token change,
 * not a redesign. Everything else on the surface is shared.
 */
export interface ScoreboardProps {
  readonly homeClubName: string;
  readonly homeScore: number;
  readonly awayScore: number;
  readonly awayClubName: string;
}

export const Scoreboard = ({
  homeClubName,
  homeScore,
  awayScore,
  awayClubName,
}: ScoreboardProps) => (
  <section
    aria-label="Match score"
    className="chrome-gradient flex items-center justify-center gap-3 rounded-panel border border-panel-border-dark px-4 py-3 shadow-chrome"
  >
    <span className="truncate text-sm font-semibold text-text-bright">{homeClubName}</span>
    <div className="flex items-center gap-2">
      <span className="flex h-10 w-12 items-center justify-center rounded-control bg-scoreboard-box text-lg font-bold text-scoreboard-box-text shadow-inner">
        {homeScore}
      </span>
      <span className="text-sm font-semibold text-text-bright">–</span>
      <span className="flex h-10 w-12 items-center justify-center rounded-control bg-scoreboard-box text-lg font-bold text-scoreboard-box-text shadow-inner">
        {awayScore}
      </span>
    </div>
    <span className="truncate text-sm font-semibold text-text-bright">{awayClubName}</span>
  </section>
);