# Championship Manager clone

A local, single-player Football-management sim (Championship Manager 2003/04-style). Game state is
event-sourced; this context covers the domain model for players, their skills, and their market
worth.

## Language

**Attribute**:
A single named skill dimension for a player (e.g. Passing, Pace, Reflexes), scored 1–20. Belongs to
exactly one Category.
_Avoid_: Stat, skill

**Category**:
One of the four groups an Attribute belongs to: Technical, Mental, Physical, Goalkeeping. Goalkeeping
Attributes are only meaningful for players who play Goalkeeper; they're absent (not zero) for outfield
players.

**Potential Ability**:
A hidden ceiling, on a 1–100 scale, that a player's Position Ratings develop toward as they age. Never
shown to the player. Distinct from Overall Rating, which is the *current*, visible expression of a
player's Attributes.
_Avoid_: PA (fine as shorthand in code/comments, not in player-facing text), Current Ability, CA

**Position**:
One of the ten fixed slots a player can occupy on the pitch: GK, DC, DL, DR, DM, MC, ML, MR, AMC, ST.
Distinct from a tactical Role (owned by the tactics ticket), which further specializes how a player
behaves *within* a Position.
_Avoid_: Role (reserved for tactics), slot

**Familiarity Tier**:
How well a player performs in one of their playable Positions: Natural, Competent, or Unfamiliar. A
player may hold this tier for more than one Position.
_Avoid_: Proficiency, suitability

**Position Weight**:
A fixed, code-defined importance value for one (Position, Attribute) pair, used to compute that
Position's Rating for a player. Game-design data, not player data — never persisted as event-sourced
state.

**Position Rating**:
A derived score, 1–100, for how well a specific player would perform in a specific Position — a
weighted average of that player's Attributes against that Position's Position Weights. Always computed
on read, never stored.

**Overall Rating**:
A player's Position Rating at their strongest Natural-tier Position. Not a separately stored or
computed concept — it's a specific reading of Position Rating, sharpened here because "overall" was
otherwise ambiguous between "a generic context-free score" and "best Position Rating."
_Avoid_: Current Ability, CA, general rating

**Transfer Value**:
A derived, integer currency amount for a player, computed from their Overall Rating, age, and the gap
between their Overall Rating and Potential Ability. Never stored — recomputed whenever the market or a
listing needs it, so it always reflects the player's current state.
_Avoid_: Price, worth, market value (the currency unit itself is a separate concern owned by the
transfers ticket)

### Match engine

**Phase Strength**:
One of a team's three derived numbers for a given match — Attack, Midfield, or Defense — computed
from the Position Ratings of the players occupying that phase's Positions (Defense: GK/DC/DL/DR;
Midfield: DM/MC/ML/MR; Attack: AMC/ST), before Tactical Modifiers or Home Advantage are applied.
_Avoid_: Team strength, team rating

**Tactical Modifiers**:
A flat struct of numeric multipliers and biases — one each for attack, midfield, defense, tempo, and
pressing-aggression — that a team's tactics (formation, roles, instructions; vocabulary owned by the
tactics ticket) resolve into. The match engine consumes only this struct: it has no knowledge of
formations, roles, or instructions themselves.
_Avoid_: Tactics (the source concept, owned by the tactics ticket; Tactical Modifiers is what the
match engine actually reads)

**Minute-Slice**:
One discrete step of match resolution, covering one simulated minute of the 90, in which a Midfield
battle decides that slice's possession winner and the winner's Attack is rolled against the loser's
Defense to decide whether a notable event occurs.
_Avoid_: Tick, phase roll (roll is fine as an informal verb, not as the noun for the slice itself)

**Stoppage Slice**:
A single Minute-Slice-like step appended to the end of each half, standing in for injury time. Its
simulated length (1–5 minutes) is randomized, biased upward by how many stoppage-causing events
(Goal, Yellow Card, Red Card, Injury, Substitution) occurred during that half.
_Avoid_: Injury time, added time (fine as in-fiction commentary language, not as the engine's internal
term)

**Match Event**:
One entry in a match's emitted timeline: `MatchStarted`, `Goal`, `ShotOnTarget`, `ShotMissed`,
`BigChance`, `YellowCard`, `RedCard`, `Injury`, `Substitution`, `HalfTimeReached`, or
`FullTimeWhistle`. These are what the event-sourced game-engine persists and what commentary narrates
from — not a separate commentary-only representation.

**Injury** (match event):
A low-probability Match Event that forces an immediate Substitution, with no effect beyond the match
it occurs in. Distinct from the season-long fitness/injury system (not yet specified), which tracks
injury-proneness and recovery across matches.

### Match commentary

**Commentary Line**:
One entry in the Match day screen's scrolling text feed, generated from a single Match Event. Only
Match Events produce a Commentary Line — a quiet Minute-Slice with no Match Event produces nothing, so
the feed's density mirrors the timeline's event density exactly.
_Avoid_: Commentary (fine as the general feed/feature name; Commentary Line is one entry in it)

**Commentary Template**:
One fixed phrasing in the pool defined for a Match Event type (e.g. one of several ways to phrase a
`Goal`), code-defined game-design data living in `packages/shared` alongside Position Weights and Role
Weights. A Commentary Line is a Commentary Template with its slots (player name, team name, scoreline)
filled from the source Match Event's payload; the match engine and game-engine package never assemble
a Commentary Line themselves — this is display data, not simulation state.
_Avoid_: Generator, script (there is no generation/composition step in v1 — see
[ADR-0008](docs/adr/0008-templated-match-commentary.md))

### Tactics

**Formation**:
One of five fixed v1 shapes (4-4-2, 4-3-3, 4-5-1, 3-5-2, 5-3-2), each a fixed multiset of 10 outfield
Position slots plus an implicit GK — no vocabulary beyond the existing Position taxonomy. Purely
structural: it determines which Positions are filled, and therefore which players' Position Ratings
feed each Phase Strength. Carries no multiplier of its own.

**Role**:
A tactical sub-choice within one Position slot of a Formation (e.g. Poacher within ST), chosen per
slot when a Tactic is set — not a property saved on the player. One v1 Role per Position (Goalkeeper,
Ball-Playing Defender, Wing-Back, Anchorman, Playmaker, Winger, Attacking Midfielder, Poacher).
_Avoid_: Position (a Role specializes a Position, it doesn't replace it)

**Role Weights**:
A fixed, code-defined importance value for one (Role, Attribute) pair, used to compute Role Rating.
Parallel construct to Position Weight, at the same tier: game-design data, never persisted as
event-sourced state.

**Role Rating**:
A derived score, 1–100, for how well a specific player suits their assigned Role — a weighted average
of that player's Attributes against that Role's Role Weights. Computed at tactic-resolution time
(before the match engine runs), not inside the match engine itself, and used only to bias Tactical
Modifiers — never substitutes for Position Rating in Phase Strength.
_Avoid_: Position Rating (a different derived score, computed against Position Weight, and the one
Phase Strength actually reads)

**Team Instructions**:
The three v1 sliders a manager sets per Tactic — Mentality (defensive/balanced/attacking), Tempo
(slow/normal/fast), Pressing (low/medium/high) — each a three-state choice that feeds Tactical
Modifiers.

**Tactic**:
The full value a manager sets for a team: a Formation, a Role and player assigned to each of its 11
slots, and the three Team Instructions. The payload of the `ChangeTactics` command, both pre-match and
mid-match.

### Season & calendar

**League**:
The single fixed set of 20 clubs a career is played within. Membership never changes — no promotion,
relegation, or multi-league structure.
_Avoid_: Division, competition (competition is reserved for a cup-style bracket, not in v1 scope)

**Season**:
One full cycle of the League: a freshly-generated Fixture list played to completion, followed by a
close-of-season transition into the next Season. Fixtures are reshuffled each Season with no seeding
by prior standings — there is no promotion/relegation or qualification bracket to seed against.

**Fixture**:
One scheduled match between two League clubs, home and away assignment fixed at generation time. A
Season is a double round-robin: 38 Fixtures per club (19 opponents, home and away).
_Avoid_: Match (Match is the live/resolved event a Fixture becomes; Fixture is the scheduled slot)

**Matchday**:
The League-wide round number (1–38) a Fixture belongs to. The unit the calendar advances by and the
unit Transfer Window boundaries are defined against — never a calendar date.

**Calendar**:
The career's sense of time, advanced only by jumping to the next scheduled event (a Matchday's
Fixtures or a Transfer Window open/close), never by a day-by-day clock. v1 has no training, scouting,
or press content to occupy a day with no Fixture, so a finer-grained clock would have nothing to
display.
_Avoid_: Schedule (Schedule is the generated list of Fixtures; Calendar is the mechanism for moving
through it)

**Transfer Window**:
One of two spans per Season during which transfer commands are legal: the pre-season window (open
until Matchday 1) and the mid-season window (opens immediately after Matchday 19, closes when Matchday
20 is due). Transfer commands raised outside an open window are rejected. No deadline-day mechanic.
_Avoid_: Transfer period (Window is the term used in commands/events)

**League Table**:
The standings derived from all resolved Fixtures in the current Season, ordered by points, then goal
difference, then goals scored. Head-to-head is deliberately not a tie-break.

### Transfers & contracts

**Credits**:
The single in-game currency unit for transfer fees, wages, and budgets. Fictional, with no real-world
currency tie — consistent with the fully fictional League/clubs/players (see map's Out of scope).

**Stature Tier**:
A club's fixed rank among the League's 20 clubs (e.g. big/mid/small), set once and permanent for the
life of a career in v1 — nothing in v1 moves a club between tiers. The single shared input both
Transfer Budget/Wage Budget (below) and Board Objective (see "Board & objectives") derive from
independently; deriving one from the other was considered and rejected (see
[ADR-0006](docs/adr/0006-board-objectives-and-manager-sacking.md)).

**Transfer Budget**:
A per-club, per-Season pool of Credits available to spend on transfer fees, derived at Season start
from the club's Stature Tier. Spending in the pre-season Transfer Window reduces what's available in
the mid-season Transfer Window — it does not replenish between the two.
_Avoid_: Budget (ambiguous with Wage Budget)

**Wage Budget**:
A per-club running cap, in Credits, on the sum of a club's active Contracts' wages — not a spend-down
pool like Transfer Budget. A signing is only legal if it keeps the club under this cap.

**Contract**:
The terms binding a player to a club: a wage (Credits/season, formula-derived — see Transfer Value)
and a length of 1–5 years, set identically at first signing or at renewal. Never renegotiated mid-term.

**Free Agent**:
A player whose Contract has expired (start of the Season following its last contracted year). Signable
by any club for a Credits 0 fee via the same signing flow as a normal transfer, with no Bid or
negotiation step.

**Listed**:
A cosmetic flag a club may set on one of its players to signal willingness to sell. Any player can
receive a Bid regardless of this flag — Listed does not gate bid legality, a direct consequence of
full-information Transfer Value making an explicit "for sale" signal largely decorative.

**Bid**:
A transfer offer from one club to another for a player under Contract. Single-round: the receiving
club accepts, rejects, or makes exactly one counter-offer, which the bidding club then accepts or
withdraws from.
_Avoid_: Offer (fine as an informal synonym in prose, not as the event/command noun — Bid is)

### Board & objectives

**Board Objective**:
A League-position band (`{ lowerBound, upperBound }`) set for the player's club at the start of each
Season, derived from its Stature Tier via a fixed `packages/shared` tier→band table (exact bands are
tuning data, not decided here). Only the player's club receives one — AI clubs are never judged.
_Avoid_: Target, expectation

**Verdict**:
The judgment of a Season against its Board Objective, decided once at Season end by comparing final
League Table position to the band: `Exceeded`, `Met`, or `Missed`.

**Consecutive-Miss Counter**:
A per-club counter tracking unbroken `Missed` Verdicts. Any `Exceeded` or `Met` Verdict resets it to
zero. Reaching 1 triggers a warning; reaching 2 ends the career (see Manager Sacked).
_Avoid_: Warning count, strikes

**Season Concluded** (event):
Fires once a Season's final Matchday's Fixtures have all resolved, carrying the final League Table.
The trigger for Board Objective judgment and every other season-boundary reaction.

**Board Objective Judged** (event):
Fires immediately after Season Concluded, for the player's club only; carries the Board Objective, the
club's actual finishing position, and the Verdict.

**Manager Warned** (event):
Fires when Board Objective Judged is `Missed` and the Consecutive-Miss Counter moves 0→1. No mechanical
effect beyond recording the warning — the career continues.

**Manager Sacked** (event):
Fires when Board Objective Judged is `Missed` and the Consecutive-Miss Counter moves 1→2. Ends the
career: the save becomes archived and read-only (viewable, no further commands accepted). There is no
explicit win state symmetric to this — a career that is never sacked simply continues indefinitely.
_Avoid_: Game over (fine as player-facing copy, not as the event name)

### Technical contract

**Decider**:
The event-sourced write-side boundary that accepts Commands and folds a single stream of Events into
its own consistency invariants (e.g. Wage Budget never exceeded). v1 has three: the **Club Decider**
(one stream per club, ×20 per save — Contracts, Transfer Budget, Wage Budget, Board Objective,
Consecutive-Miss Counter), the **Match Decider** (one stream per Fixture — Match Events plus mid-match
`ChangeTactics`/`MakeSubstitution`), and the **Season/Calendar Decider** (one stream per save —
Matchday counter, Fixture generation, Transfer Window state). League Table is deliberately *not* a
Decider — nothing commands it into a new state, so it's a projection, not an aggregate.
_Avoid_: Aggregate (fine as the general event-sourcing term; Decider is this project's concrete unit)

**RpcGroup**:
The `@effect/rpc` contract, defined in `packages/contracts`, that is the only channel between the
Electron renderer and main process. Every player-invokable Command and every read-side query gets its
own typed method on the RpcGroup (e.g. `bidForPlayer`, `getSquad`) — there is no generic envelope
method. Internal-only Commands (AI clubs acting on their own behalf, batch AI-fixture resolution,
cross-Decider reactions) never go through the RpcGroup at all; they're invoked directly, in-process,
since only the renderer needs the IPC boundary.
_Avoid_: API, endpoint (Rpc method is the term; there is no HTTP layer)

**Read model**:
The persisted, projector-maintained tables the RpcGroup's queries actually serve (`squad_view`,
`league_table`, `transfer_inbox`, `match_day_timeline`, `season_summary`). Not every field in a read
model is stored: derived values that ADR-0001 already fixed as computed-on-read (Position Rating,
Overall Rating, Transfer Value) are still computed at query time from stored primitives, not persisted
a second time.
_Avoid_: Projection table (fine informally; "read model" is the term used across tickets)
