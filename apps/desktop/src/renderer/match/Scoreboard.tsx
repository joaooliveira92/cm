/**
 * The match-day scoreboard — the one match-only element in the renderer.
 *
 * A neutral chrome-band with white score boxes: the two club names flanking the
 * score. It renders from club name and score alone — the neutral archetype is
 * the match-day picture, and a scoreboard that took each side's colours would
 * have to solve two arbitrary palettes meeting in the middle, which is a design
 * question nobody has answered.
 *
 * `ClubSummary` does now carry colours (the career header paints itself in the
 * user club's primary pair), so this is a deliberate abstention rather than a
 * missing capability. Its token family (`--color-scoreboard-*` in `index.css`)
 * is what a later club-coloured treatment would override: a token change, not a
 * redesign. Everything else on the surface is shared.
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