export const STATURE_TIERS = ["big", "mid", "small"] as const;

export type StatureTier = (typeof STATURE_TIERS)[number];

/**
 * The one generated League's name. Fully fictional content, the same replaceable class as
 * `LEAGUE_CLUBS` beside it — the two move together, which is why the name lives here rather than
 * in the renderer that displays it. It names the world generation actually materializes, never the
 * scope a `LeagueSelectionSnapshot` recorded as intent.
 */
export const LEAGUE_NAME = "Meridian Premier League";

/** Fully fictional 20-club League and each club's permanent Stature Tier assignment (4 big / 8 mid / 8 small). */
export const LEAGUE_CLUBS: ReadonlyArray<{ readonly name: string; readonly statureTier: StatureTier }> = [
  { name: "Castlemere United", statureTier: "big" },
  { name: "Northgate Athletic", statureTier: "big" },
  { name: "Vantage Rovers", statureTier: "big" },
  { name: "Ashford Wanderers", statureTier: "big" },
  { name: "Brackenfield Town", statureTier: "mid" },
  { name: "Duncaster City", statureTier: "mid" },
  { name: "Elmsworth FC", statureTier: "mid" },
  { name: "Fenwick Albion", statureTier: "mid" },
  { name: "Greymoor United", statureTier: "mid" },
  { name: "Harrowgate Villa", statureTier: "mid" },
  { name: "Ironbridge Rangers", statureTier: "mid" },
  { name: "Kestrel Park", statureTier: "mid" },
  { name: "Lowmoor Athletic", statureTier: "small" },
  { name: "Millbrook Town", statureTier: "small" },
  { name: "Norwood Forest", statureTier: "small" },
  { name: "Oakfield United", statureTier: "small" },
  { name: "Pinehaven Rovers", statureTier: "small" },
  { name: "Quayside FC", statureTier: "small" },
  { name: "Ridgeway Town", statureTier: "small" },
  { name: "Southmere Albion", statureTier: "small" },
];
