# Player attribute model & data schema

Type: grilling
Status: resolved

## Question

What is the player attribute model for the match engine and transfer market to consume? CM03/04 used
~20 attributes per player (pace, tackling, passing, shooting, stamina, etc.), grouped by category,
each on a numeric scale, varying by position relevance. Decide: the attribute list, their scale/range,
how they vary by position, how a player's overall "value" or "ability" is derived from them for
display and for the transfer market, and how this data shape is represented in the SQLite schema
(the read-model side of the event-sourced projection). Consult `domain-modeling` to fix vocabulary
before locking the schema.

## Answer

Resolved via a grilling + domain-modeling session. Canonical vocabulary recorded in
[CONTEXT.md](../../../CONTEXT.md); the derived-values architecture recorded in
[ADR-0001](../../../docs/adr/0001-derived-player-ratings-and-value.md).

**Attributes**: 1–20 scale, four Categories:

- Technical (8): Passing, Shooting, Tackling, Dribbling, Heading, Crossing, Finishing, First Touch
- Mental (6): Positioning, Decisions, Composure, Determination, Teamwork, Flair
- Physical (5): Pace, Acceleration, Stamina, Strength, Agility
- Goalkeeping (5, keepers only, NULL for outfield): Handling, Reflexes, Aerial Reach, Command of Area, Kicking

**Positions**: 10 fixed slots — GK, DC, DL, DR, DM, MC, ML, MR, AMC, ST. Each player has one or more
playable Positions, each with a Familiarity Tier (Natural / Competent / Unfamiliar), in a separate
`player_positions` table (variable-length, not fixed columns).

**Potential Ability**: one hidden scalar, 1–100, never shown in UI. Attributes grow toward the
age-appropriate ceiling it implies for ages 16–23, plateau 24–29, then Physical attributes decline
1–2 points/season from 30+. Applied by the event-sourced projector on season-advance events (event
vocabulary itself is ticket 07's concern) — `players` is the materialized read model, updated in
place.

**Overall Rating / Position Rating**: no stored Current Ability. A Position Rating (1–100) is a
weighted average of a player's Attributes against that Position's `position_weights` (a code-defined
constant in `packages/shared`, not a SQL table — see ADR-0001), computed on read. Overall Rating is
simply a player's Position Rating at their strongest Natural-tier Position — not a separate stored
concept.

**Transfer Value**: derived (not stored) from Overall Rating (exponential base curve) × age modifier
× Potential-Ability-gap premium, as an integer currency amount (unit itself owned by ticket 05).

**Generation**: draw Potential Ability from a right-skewed distribution (rare high-PA wonderkids),
derive an age-appropriate effective ceiling below it, generate each Attribute around that ceiling
with `position_weights`-driven skew + noise.

**Schema** (SQLite, read-model side of the projection):

```sql
CREATE TABLE players (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth TEXT NOT NULL, -- ISO date; age and the aging-curve band are derived from this
  potential_ability INTEGER NOT NULL CHECK (potential_ability BETWEEN 1 AND 100),

  -- Technical
  passing INTEGER NOT NULL CHECK (passing BETWEEN 1 AND 20),
  shooting INTEGER NOT NULL CHECK (shooting BETWEEN 1 AND 20),
  tackling INTEGER NOT NULL CHECK (tackling BETWEEN 1 AND 20),
  dribbling INTEGER NOT NULL CHECK (dribbling BETWEEN 1 AND 20),
  heading INTEGER NOT NULL CHECK (heading BETWEEN 1 AND 20),
  crossing INTEGER NOT NULL CHECK (crossing BETWEEN 1 AND 20),
  finishing INTEGER NOT NULL CHECK (finishing BETWEEN 1 AND 20),
  first_touch INTEGER NOT NULL CHECK (first_touch BETWEEN 1 AND 20),

  -- Mental
  positioning INTEGER NOT NULL CHECK (positioning BETWEEN 1 AND 20),
  decisions INTEGER NOT NULL CHECK (decisions BETWEEN 1 AND 20),
  composure INTEGER NOT NULL CHECK (composure BETWEEN 1 AND 20),
  determination INTEGER NOT NULL CHECK (determination BETWEEN 1 AND 20),
  teamwork INTEGER NOT NULL CHECK (teamwork BETWEEN 1 AND 20),
  flair INTEGER NOT NULL CHECK (flair BETWEEN 1 AND 20),

  -- Physical
  pace INTEGER NOT NULL CHECK (pace BETWEEN 1 AND 20),
  acceleration INTEGER NOT NULL CHECK (acceleration BETWEEN 1 AND 20),
  stamina INTEGER NOT NULL CHECK (stamina BETWEEN 1 AND 20),
  strength INTEGER NOT NULL CHECK (strength BETWEEN 1 AND 20),
  agility INTEGER NOT NULL CHECK (agility BETWEEN 1 AND 20),

  -- Goalkeeping: NULL for outfield players. App-level invariant (not a CHECK, SQLite can't do the
  -- cross-table lookup): non-NULL iff this player has a `player_positions` row for 'GK'.
  gk_handling INTEGER CHECK (gk_handling IS NULL OR gk_handling BETWEEN 1 AND 20),
  gk_reflexes INTEGER CHECK (gk_reflexes IS NULL OR gk_reflexes BETWEEN 1 AND 20),
  gk_aerial_reach INTEGER CHECK (gk_aerial_reach IS NULL OR gk_aerial_reach BETWEEN 1 AND 20),
  gk_command_of_area INTEGER CHECK (gk_command_of_area IS NULL OR gk_command_of_area BETWEEN 1 AND 20),
  gk_kicking INTEGER CHECK (gk_kicking IS NULL OR gk_kicking BETWEEN 1 AND 20)
);

CREATE TABLE player_positions (
  player_id TEXT NOT NULL REFERENCES players(id),
  position TEXT NOT NULL CHECK (position IN ('GK','DC','DL','DR','DM','MC','ML','MR','AMC','ST')),
  familiarity TEXT NOT NULL CHECK (familiarity IN ('natural','competent','unfamiliar')),
  PRIMARY KEY (player_id, position)
);
```

`position_weights: Record<Position, Partial<Record<Attribute, number>>>` lives as a TypeScript
constant in `packages/shared`, consumed by the Position Rating / Overall Rating / Transfer Value
formula functions — not a SQL table (ADR-0001).

Out of scope for this ticket, left to later tickets: club/contract/wage columns (ticket 05), the
season-advance event names that drive the aging projector (ticket 07), and squad/roster tables.


