# 10: Club & player generation, Squad screen

**What to build:** Starting a new career generates the fixed 20-club League, each club assigned a
permanent Stature Tier, each populated with a generated squad of fictional players (Potential Ability
drawn from a right-skewed distribution, Attributes generated around an age-appropriate ceiling with
Position Weight-driven skew, one or more playable Positions with Familiarity Tiers). The Squad screen
lists the player's club's squad, showing every Attribute plus each player's Position Rating and
Overall Rating — both computed on read, never stored.

**Blocked by:** 09

**Status:** resolved

- [x] New-save creation generates 20 clubs with a fixed, permanent Stature Tier each
- [x] Each club's squad is generated with realistic depth (enough players to fill every Position plus
      backups)
- [x] Player generation follows the Potential Ability → age-appropriate ceiling → Attribute
      generation pipeline, with `position_weights`-driven skew and noise
- [x] `players` and `player_positions` tables match the locked schema (ADR-0001); Goalkeeping
      attributes are NULL for outfield players
- [x] Squad screen displays every Attribute, Position Rating, and Overall Rating for each player in
      the player's club, all computed on read
- [x] Potential Ability is never exposed in any UI
