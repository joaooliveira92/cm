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
A hidden ceiling, on a 1–100 scale, that a player's Position Ratings develop toward via Player
Development. Never shown to the player. Distinct from Overall Rating, which is the *current*, visible
expression of a player's Attributes.
_Avoid_: PA (fine as shorthand in code/comments, not in player-facing text), Current Ability, CA

**Player Development** (per-season):
The per-season step where a player's Attributes move toward their age-appropriate Potential Ability
ceiling, shaped by age — rising during youth, plateauing through the prime, and (for Physical
Attributes only) declining past decline age. Runs once per `SeasonConcluded`, independently per player,
deterministically (no seed). Distinct from Training Focus, which biases how much of a season's Player
Development one Category receives for one player.
_Avoid_: Growth, aging (fine informally in prose; Player Development is the mechanism's name)

**Training Focus**:
A per-player, per-Category assignment a manager sets, biasing how much of that season's Player
Development a player's Attributes in that Category receive relative to an unfocused player. Always set
(defaults to none/balanced) for every player on a human-managed club; AI clubs' players always use
unmodified Player Development. Distinct from Condition and Natural Fitness, which govern in-match/
between-match physical state, not long-run Attribute growth.
_Avoid_: Training (ambiguous with the feature/milestone name as a whole; Training Focus is the
specific per-player setting)

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
A Match Event carrying a trigger (`contact` | `non-contact`), a Severity (`light` | `medium` |
`severe`), a No-Subs Tier (`orange` | `red`), and a body-part Type. Light/Medium are Orange
(manager may leave the player on, crippled and at risk of escalation, or drag them off); Severe is
Red (forced off — substituted, or the team plays with 10 if no subs remain). Distinct from the
season-long fitness layer below.

**Condition**:
A per-player, in-match percentage (0-100, starting near 100) that decays each minute with a player's
Stamina and the team's Tempo. It replaces squad-average fatigue as the driver of late-match strength
decay and is the substrate both injury triggers read from. Below the ~75% threshold the non-contact
injury risk climbs as Condition falls.
_Avoid_: Fitness (see Natural Fitness), stamina (Stamina is the attribute; Condition is the live state)

**Natural Fitness**:
A visible Physical attribute (1-20) that governs how quickly a player's Condition recovers between
matches. Recovery is keyed to Natural Fitness and the most recent injury's Severity — a knock recovers
faster than a severe.

**Injury Proneness**:
A hidden attribute (1-20, never surfaced to any UI) that is the primary multiplier on both injury
trigger paths and nudges the Severity matrix toward worse outcomes.

**Contact Injury** (Path A):
An injury caused by a physical duel/collision (see
[ADR-0009](docs/adr/0009-contact-duel-modeling.md)), risk =
`BaseCollision × (defender Aggression / attacker Bravery) × attacker Injury Proneness`; leans
structural (broken toe, twisted ankle, dead leg).

**Non-Contact Injury** (Path B):
A fatigue/condition-driven injury, rolled each minute a player is below the Condition threshold with
risk = `(100 − Condition) × Injury Proneness × Match Intensity`; leans muscular/fatigue (hamstring,
calf, strain). A player playing on with an orange knock escalates to red via this path.

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

**Continue**:
The single player-facing control that advances the Calendar, and the name of the career's core rhythm:
inspect state, decide, Continue, read the consequence, inspect again. It belongs to the career rather
than to any one screen and stops at every boundary the advance can report. "Continue" is the affordance
the player sees; the command behind it is the Calendar advance.
_Avoid_: Advance Calendar, Simulate, Next Day, Proceed as player-facing names (Next Day additionally
implies a day-by-day clock the Calendar does not have); "continue" for resuming a saved career, which
is Load

**Match Readiness**:
Whether the manager's club has the setup a Fixture legally requires — at minimum a Tactic, which a
newly created career does not have. A derived state, true or false by inspection of the club at any
moment, never a notice that is delivered, acknowledged, or marked read: it is visible for exactly as
long as it is unmet. Distinct from a squad being *well* prepared, which is a judgment the game does not
make.
_Avoid_: Reminder, warning message, checklist (all imply something dismissible or completable
independently of the underlying state)

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

**Transfer Inbox**:
The Bid queue on the Transfer market screen: incoming Bids for this club's players and the status of
Bids this club has made. This is the only thing "inbox" means in the project. There is no news feed,
message screen, or notification centre, and onboarding ticket 05 decided there will not be one in v1.
What changed on each Calendar advance comes back on `AdvanceCalendarResult` and is surfaced by the
screen that owns the state.
_Avoid_: Inbox unqualified, News, Messages (the seed doc `docs/game-onboarding.md` uses "inbox" for a
news feed; that meaning is not this project's)

### Scouting

**Scout**:
A per-club resource the manager assigns to observe a specific Player or Club, the mechanism by which
Scouting Progress advances. Distinct from the human manager themself — a Scout is the assignable
unit, not the player-facing role.

**Scouting Assignment**:
The act of assigning a Scout to a Player or Club, started and ended by explicit manager action.
Determines which Player(s) accrue Scouting Progress while active.
_Avoid_: Scouting Report (implies a one-shot document; this is an ongoing state, not a delivered
artifact)

**Scouting Progress**:
A per-(Player, human club) percentage, starting at 0 (Unscouted) for every player outside the
manager's own club, that narrows Attribute uncertainty as it rises toward Fully Scouted. Own-squad
players are always full-info and never carry Scouting Progress; AI clubs never scout and always read
full information (see Training Focus's "AI clubs stay dumb" precedent).
_Avoid_: Scouting Level, Familiarity (Familiarity Tier is already taken by Position suitability)

**Attribute Range**:
The display form of a hidden Attribute, Potential Ability, Injury Proneness, or Transfer Value for a
player below Fully Scouted — a bounded estimate (not an exact number) that narrows monotonically as
Scouting Progress rises. Never widens or resets.
_Avoid_: Attribute Band (Familiarity Tier and Stature Tier already use "tier"/discrete-band language;
Range signals continuous narrowing, not a fixed bucket)

**Fully Scouted**:
The terminal state (Scouting Progress at 100) where a player's Attributes, Potential Ability, Injury
Proneness, and Transfer Value display as exact figures, identical to the manager's own-squad view.
Never regresses once reached.

### Manager

**Manager Pillar**:
One of four permanent 1-5 dimensions describing the human manager's own capability: Tactical Acumen,
Influence, Regimen, Technical Coaching. Chosen once at manager creation and immutable for the
life of the career in v1. Pillars modify the probability, magnitude, risk, cost, information quality,
and duration of managerial outcomes; they do not gate permission to use a system, so a Pillar of 1 is
a severe, campaign-defining weakness rather than a soft lock. A Pillar of 3 is normal professional
competence.
_Avoid_: Attribute (reserved for a player's 1-20 skill dimension), Stat, Skill

**Manager Archetype**:
One of four curated Pillar Distributions offered at manager creation - The Professor (5/1/2/4), The
Motivator (2/5/4/1), The Sergeant (1/2/5/4), The Academy Head (2/4/1/5), in Pillar order. Each is a
permutation of {5,4,2,1}, each owns a different Pillar at 5, and each has a different Pillar at 1. An
Archetype supplies a name, portrait, and flavour only: it is mechanically identical to a Custom
Manager with the same Pillar Distribution and never carries hidden bonuses, penalties, or distinct
board/AI reactions.
_Avoid_: Class, Preset (fine informally; Archetype is the term), Background

**Custom Manager**:
A manager created by distributing the 12 creation points across the four Manager Pillars by hand
rather than taking an Archetype. Any Pillar Distribution within the rules is legal, including a flat
3/3/3/3 and an extreme 5/5/1/1.

**Pillar Distribution**:
The ordered set of four Manager Pillar values held by a manager. Legal exactly when every Pillar is an
integer between 1 and 5 and the four sum to 12. The Pillar Distribution in force at kickoff is
recorded on the match itself, so replaying a historical match never reads the manager's current one.

**Manager Pillar Binding**:
A named place where a shipped system reads a Manager Pillar value and can produce a materially
different result because of it. A Pillar is only considered to exist mechanically if it has at least
one Binding: storing it, displaying it, describing it in flavour text, or reserving an integration
point in an unbuilt system are all explicitly not Bindings. Distinct arithmetic insertion points that
serve one coherent managerial contribution are one Binding, not several.
_Avoid_: Effect, Modifier, Hook

**Tactical Acumen**:
The Manager Pillar governing the manager's tactical preparation and the effectiveness with which a
chosen Tactic is executed. In v1 it modifies the magnitude of resolved tactical instruction effects,
deterministically. Its application to the interpretation of scouting reports is deferred to the
Scouting effort; when it lands there it must affect only information quality and must not replace a
Scout's own evaluation capability. Opponent analysis is cut from v1: no opponent-scouting or
pre-match report system exists.
_Avoid_: Tactical IQ (reads as a literal intelligence score)

**Influence**:
The Manager Pillar governing the manager's effectiveness at affecting decisions made by other
football actors. In v1 it modifies the selling club's response to a Bid during an open Transfer
Window, shifting the negotiation around that club's valuation without replacing it. It does not
govern player contracts, wage negotiation, promised playing time, dressing-room relationships, media
handling, or board relations - none of those systems ship in v1.
_Avoid_: Man-Management (the name this Pillar carried until its only shipped binding was found to be
club-to-club dealing, which man-management does not describe), Negotiation (too narrow for the
people-facing effects the Pillar is expected to gain), Charisma

**Regimen**:
The Manager Pillar governing the manager's ability to establish and sustain physical preparation and
workload standards. In v1 it modifies the Condition lifecycle - in-match Condition decay and
between-match Condition recovery - and separately modifies resolved injury severity. It has no
direct effect on whether an injury occurs; it reaches injury frequency only through Condition and the
existing non-contact risk threshold. Disciplinary authority is cut from v1: no discipline or fines
system exists. Distinct from Condition (a player's live physical state), from Training Focus (what a
player is working on), and from Match Intensity (the physical demand a match creates); Regimen is the
manager's capability to impose and sustain the associated workload.
_Avoid_: Training Intensity (collides with Training Focus and Match Intensity), Conditioning
(collides with Condition), Fitness (see Natural Fitness)

**Technical Coaching**:
The Manager Pillar governing the manager's contribution to player development. In v1 it modifies the
effectiveness of the manager's own Training Focus decision - it scales the focused Category's
development, never the passive baseline every player receives - so a manager who sets no Training
Focus draws no benefit from it. Youth integration and youth promotion are cut from v1: no youth or
reserve squad exists. Always qualified as a Manager Pillar to keep it distinct from Technical, the
Attribute Category.

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

### Contextual help

**Contextual Help**:
Any explanation the game offers about its own model, shown at the surface where the affected decision
is made or reviewed. Permitted only under Mechanical Provenance or as an Irreversibility Disclosure,
and permanently available — it carries no seen, dismissed, experience, or tutorial-completion state,
so it is identical in a first career and a fiftieth. Explains the simulation, never real-world
football, and never recommends or ranks a choice unless a shipped model produces that ranking.
_Avoid_: Tutorial (a scripted first-run sequence, out of scope), Tooltip (one possible presentation of
a Term Disclosure, not the concept), Onboarding hint

**Mechanical Provenance**:
The property that every mechanical claim a Contextual Help artifact makes traces to authoritative game
data, a derived-state predicate, or structured resolver output that the simulation itself reads.
Presentation may translate identifiers and values into readable language; it may not introduce
mechanics, strategy, or causality the model does not contain. A claim with no such source is not
permitted copy.

**Player-Facing Attribute**:
The subset of Attributes shown to the player: exactly those read by at least one shipped authoritative
mechanic, whether a rating table (Position Weight, Role Weight) or another resolver (collision risk,
injury resolution, Condition recovery). Membership follows mechanical consumption, not the schema, so
an Attribute that is persisted and generated but read by nothing is not player-facing until something
reads it.
_Avoid_: Visible Attribute (ambiguous with Hidden Attribute, which is about the injury model)

**Term Disclosure**:
The single affordance carrying Contextual Help for a domain term: a visible, focusable,
keyboard-operable control attached to the term that expands its grounded explanation in place. Used
uniformly across every screen. Never a modal, never hover-only. Carries *meaning*; the values that
drive the decision at hand (such as Role Rating in a tactic slot) stay inline rather than behind it.

**Irreversibility Disclosure**:
The one class of Contextual Help whose provenance is architectural rather than numerical: a statement,
made before commitment, that an action creates or freezes authoritative state which normal navigation
cannot reverse. Applies only where a player might reasonably expect reversibility and would otherwise
discover the rule by loss. Available at every applicable boundary, never suppressed once seen.

**Readiness Blocker**:
One typed reason the human's Fixture cannot start — the unresolved state, the actions it blocks, and
the screen that owns resolving it. Supplied as structured data by the backend and rendered into
player-facing language by the renderer, which never infers which action is blocked or who owns the
fix. Normal unresolved setup, not an error.

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
