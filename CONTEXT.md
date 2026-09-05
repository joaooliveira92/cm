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
A hidden, persisted player-specific ceiling, on a 1–100 scale, that a player's Attributes develop
toward via Player Development. Never shown to the player. Unlike Position Rating, Overall Rating,
and Transfer Value — which are read-time projections — Potential Ability is authoritative database
state written once per player and consumed by Player Development and Transfer Value formulas.
Distinct from Overall Rating, which is the *current*, visible expression of a player's Attributes.
_Avoid_: PA (fine as shorthand in code/comments, not in player-facing text), Current Ability, CA

**Current Ability**:
Not modeled as a persisted player scalar. Current player quality is represented by individual
Attributes (1-20 each) and derived rating projections (Position Rating, Overall Rating). This
project explicitly rejects the classic Championship Manager pattern of a hidden Current Ability
aggregate that must be synchronized with Attributes. Potential Ability is the only hidden persisted
input, and it is an input to Player Development, not a rating cache.
_Avoid_: CA (use "Overall Rating" if you mean the visible derived summary)

**Player Development** (per-season):
The per-season step where a player's Attributes move toward their age-appropriate Potential Ability
ceiling, shaped by age — rising during youth, plateauing through the prime, and (for Physical
Attributes only) declining past decline age. Runs once per `SeasonConcluded`, independently per player,
deterministically (no seed). Distinct from Training Focus, which biases how much of a season's Player
Development one Category receives for one player.
_Avoid_: Growth, aging (fine informally in prose; Player Development is the mechanism's name)

**Training Focus**:
A per-player, per-Category assignment a manager sets, biasing how much of that season's Player
Development a player's Attributes in that Category receive relative to an unfocused player. Every
player on a human-managed club carries one, and **None** is a first-class value among them - the
generated default, a legal standing choice, and never an unfilled slot; AI clubs' players always use
unmodified Player Development. A Category is only offerable for a player whose Attributes it actually
contains, so Goalkeeping is not a Training Focus for a player with no goalkeeping Attributes. Player
Development reads the standing Focus once, at Season conclusion: no duration, history or partial
credit accrues. Distinct from Condition and Natural Fitness, which govern in-match/between-match
physical state, not long-run Attribute growth.
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
otherwise ambiguous between "a generic context-free score" and "best Position Rating." This project
deliberately has no persisted Current Ability scalar: Overall Rating is a read-time projection from
individual Attributes, not a stored aggregate.
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

**Nationality**:
The single Nation a player is drawn from at generation, and the thing that selects their Name Pool. One
per player, never several: work permits and national teams do not exist, so nothing in MVP reads a
second one. Distinct from the nation of the club the player plays for — a player whose Nationality
differs from their club's nation was drawn through a migration link.
_Avoid_: citizenship, eligibility (neither is modelled)

**Name Pool**:
The per-Nation lists of given names and surnames a generated person's name is drawn from. Factual
linguistic data held in code beside the Nation Profiles, never content-pack data and never in the save,
on the same reasoning that keeps city names out of the pack. Feeds players and Staff alike. A generated
name is stored directly as text: it is an attribute of a person, not an identifier, so the canonical-id
rule does not reach it. See
[player provenance](.agents/notes/implemented/architecture/2026-09-01-player-provenance-and-nationality.md).
_Avoid_: name list, name bank

**Results Strength**:
A single derived score, 1-100, standing in for a club that has no players — the clubs of a
`results-only` Competition. Computed on read from the world seed, the club's Stature Tier, its
Competition's tier and Nation strength prior, and the season number, never stored, so it walks continuously across seasons without any system writing to it.
Calibrated to the distribution real squads produce when their three Phase Strengths are averaged, which
is how a squad-bearing club is compared against one without a squad in a mixed cup tie. See
[what each Simulation Depth stores](.agents/notes/proposed/architecture/2026-09-01-simulation-depth-persistence.md).
_Avoid_: club strength, team strength (the latter is already reserved against Phase Strength)

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
[contact duel modeling](.agents/notes/implemented/feature/2026-08-27-contact-duel-modeling.md)), risk =
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
[templated match commentary](.agents/notes/implemented/architecture/2026-08-27-templated-match-commentary.md))

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
A single Competition within a Nation's Pyramid: an ordered set of clubs that play each other on a
Fixture list. A career is played within the Leagues its League Selection Snapshot made playable.
_Avoid_: Division (a League's depth in its Nation's Pyramid is its Tier, below)

**Tier**:
A League's depth in its Nation's Pyramid, 1 being the highest. Cups, reserve, and continental
Competitions have no Tier. A Tier is a label, never a structure: several Leagues may share one Tier
as parallel regional divisions, so nothing may derive which League sits above another by comparing
Tier numbers. That is what Exchange Links are for.
_Avoid_: Level, division number

**Pyramid**:
A Nation's Leagues, ordered by Tier and joined by Exchange Links. Not necessarily a single vertical
chain — a Tier may hold several parallel regional Leagues feeding one above them.

**Exchange Link**:
One pairing of a higher and a lower Competition, and the number of clubs that swap between them at
the end of each Season. Promotion and relegation are the same Exchange Link read in two directions,
which is what guarantees a League never changes size. A Link exists only when both Competitions are
loaded in the save, so the lowest loaded League never relegates and the highest never promotes.
_Avoid_: Promotion slot (a count with no destination, which parallel regional Leagues make ambiguous)

**Nation**:
The unit a player selects a career's scope by: a real country owning a pyramid of Leagues, its
domestic cups, and any reserve Competitions. Identified canonically by its ISO 3166-1 alpha-3 code,
and carrying a **Nation Profile** of gameplay priors that shape generation. A Nation may be
*unavailable* (present in the setup catalogue's metadata, absent from its content) or have no
playable League at all, and in both cases it stays visible with the reason rather than being hidden.

Nations and Cities are the real-world foundation the simulation depends on, and the only real-world
data it carries. Clubs, players, staff, and stadiums are generated; club and competition display names
are replaceable Content Pack entries. See
[real geography with replaceable identities](.agents/notes/implemented/architecture/2026-09-01-real-geography-with-replaceable-identities.md)
and [the world catalogue](.agents/notes/implemented/architecture/2026-09-01-world-catalogue-and-canonical-ids.md).
_Avoid_: Country (fine informally; Nation is the term the catalogue and the screen use)

**City**:
A real settlement within a Nation, giving a Club its hometown and a Player their birthplace. Factual
and licence-free like the Nation above it, so its name is carried directly rather than resolved
through a Content Pack. Carries a coarse **population band** — a plausibility input to generation —
never a population figure, and no coordinates: distance and travel are not modelled.

**Nation Profile**:
A Nation's data-driven football character — youth production, coaching quality, economic power,
export tendency, tactical leaning, and its recruitment links to other Nations. Every value is a
**gameplay prior on a 0-1 scale, never a factual claim** about a country or its people. A prior
shifts the distribution a generated player is drawn from; it never sets a value, and individual
variation between two players of the same Nation is always larger than the gap between their
Nations' profiles.
_Avoid_: National modifier (the values are inputs to a distribution, not a modifier applied to a result)

**Content Pack**:
The replaceable layer mapping a canonical id (`club_esp_01`) to a display name, per locale. Exists
so club and competition identities — which are licensed commercial assets — never reach the
simulation core, and so the same generated world can run with fictional, licensed, localized, or
test names. A canonical id is never a display name, and nothing downstream of generation keys
behaviour off one. The pack is a code asset rather than part of a save — a save records which pack it
was generated against, so the same world can be reopened under a different one — and every display name
is resolved at read time, never written into a row.

**Region**:
A grouping of Nations used for browsing and filtering during career setup. Carries no simulation
meaning — it exists so a catalogue of many Nations is navigable.

**Competition**:
Anything a club can take part in: a League, a domestic cup, a reserve competition, or a cross-border
tournament. Competitions carry **dependency edges** — a second division requires the first division
above it, a top division requires its national cup, a continental tournament requires the top
divisions that qualify into it — and selecting one activates everything it requires.

**Simulation Mode**:
How much of a Competition the career carries: `playable` (clubs are manageable, full detail),
`background` (simulated at reduced detail, promotions and qualification still occur, no club is
manageable), `view_only` (standings, fixtures, and results with no persistent squads), or
`not_loaded`. A Competition activated only because another selection requires it is capped at
`background` — a parent division is *simulated*, never managed.

**Simulation Depth**:
The per-competition detail tier the Active Leagues screen is built around: `full` (as
`playable`), `standard` (as `background`), or `results-only` (as `view_only`). Distinct from
Simulation Mode, which is the per-Nation selection grain: a Nation is selected at a Mode, and
each Competition it activates then reads at the Depth that Mode implies. A Competition pulled in
as a dependency is capped at `standard` and is not depth-editable. The two readings are both
glossary terms so the distinction outlives the screen they were coined for. On disk the three values
collapse to two shapes: `full` and `standard` clubs are stored identically, and only `results-only`
changes the table set, replacing a squad with a derived Results Strength. Depth governs how a Fixture
resolves, never whether one exists: every loaded Competition has a full Fixture list.
_Avoid_: Simulation Mode (the per-Nation grain, a different concept), detail level

**Advanced Options**:
The setup-screen settings that tune shipped systems, from the Active Leagues Setup spec's
"advanced options ship only where a real system exists" decision. Four categories land in v1 —
match-simulation detail, transfer-market activity, roster-generation detail, and information
visibility — each feeding the processing-cost/entity estimate or a real information policy, so a
checkbox can never change nothing. Each category owns a small legal value set, and the four
combine under checked incompatibility rules (a full roster conflicts with quick match
simulation; an active transfer market conflicts with ranged information visibility).
Editor/developer capabilities carry no such system in v1 and stay recorded as a future slot, not a
modeled option. Staff generation is no longer among them — Staff ship, but they are derived from a
club's Stature Tier rather than tuned, so they are still not an Advanced Option.
_Avoid_: reference-game option labels (the brief's checklist is a vocabulary to translate, not
to copy; see [the implementation brief](.scratch/active-leagues-setup/brief.md))

**League Scope Option**:
A supported scope for one Nation, named by the setup catalogue — "Top division only", "National
pyramid", "National and regional pyramid". The player picks one of these rather than assembling a
competition graph by hand, which is what lets pyramids that are not a single vertical chain
(parallel regional divisions, split leagues, franchise competitions) be expressed without letting
the interface construct an invalid one.

**Selection Intent**:
What the player asked for: one record per Nation carrying a Simulation Mode and, when playable, a
League Scope Option. Deliberately distinct from the Effective Selection, so the interface can always
say which parts of the scope were chosen and which were required.

**Effective Selection**:
What the Selection Intents resolve to once dependency closure runs — every active Competition, its
mode, and which selections require it. Every figure in the setup summary counts this, not the
intents, so an automatically included Competition is visible in the totals.

**League Selection Snapshot**:
The single immutable record `Continue` produces on the League and Nation Selection screen: the
intents, the Effective Selection, the cost estimate, and the setup catalogue's fingerprint.
Creating it does **not** create the world — it is the scope the later setup stages and world
generation are handed.

**Setup Catalogue**:
The validated index a career's scope is chosen from: its Regions, Nations, Competitions, League
Scope Options, and dependency edges, identified by a **fingerprint**. Every persisted setup draft
and preset carries that fingerprint, and one captured against a different catalogue is refused
rather than migrated by guessing at renamed Competitions.

> **Generation boundary, as of 2026-09-03.** World generation is handed a snapshot's identifier and
> **re-resolves its Selection Intents** against the Setup Catalogue, refusing a fingerprint mismatch
> rather than trusting the Effective Selection the snapshot recorded — the snapshot's recorded
> selection is display and audit data, never a generation input. It then materialises what that
> re-resolution produced: every Competition in the Effective Selection, and one Club per slot of
> each Competition's club count. The screen's job still ends at producing the snapshot. See
> [League and Nation Selection](.agents/notes/implemented/feature/2026-08-31-league-and-nation-selection.md)
> and [generation reads the snapshot](.agents/notes/proposed/architecture/2026-09-02-generation-reads-the-snapshot.md).

**Season**:
One full cycle of every loaded Competition: a freshly-generated Fixture list played to completion,
followed by a close-of-season transition into the next Season. Every Nation runs the same
August-to-May Season, on real dates; Nations whose real-world calendar runs spring-to-autumn ship on
the wrong cycle in MVP. Fixtures are reshuffled each Season with no seeding by prior standings. The
close-of-season transition applies each Exchange Link, promoting and relegating clubs between Leagues.

**Fixture**:
One scheduled match between two clubs, home and away assignment fixed at generation time. A Fixture
carries a real date and the Round it belongs to within its own Competition. A club never holds two
Fixtures on one date. A 20-club League Season is a double round-robin: 38 Fixtures per club (19
opponents, home and away); other Competitions have other lengths.
_Avoid_: Match (Match is the live/resolved event a Fixture becomes; Fixture is the scheduled slot)

**Cup Tie**:
A Fixture in a knockout Competition, which must produce a winner. Single leg only: a Tie level after
90 minutes goes straight to a Penalty Shootout, with no extra time and no replay. A Tie's two clubs
are not known until the previous Round resolves, so its Fixture comes into existence then, on the date
its Round would always have had.
_Avoid_: Leg (there are no second legs in MVP), Replay

**Bye**:
A pass into Round 2 held by a club in a cup whose entrant count is not a power of two. Byes go to
clubs from the highest-tier source Competitions, ties broken by canonical id.

**Penalty Shootout**:
How a level Cup Tie is settled. Resolved outside the match's minute-by-minute simulation, so it
produces no match events and appears only as the Tie's penalty score.

**Matchday**:
A date on which Fixtures are played anywhere in the world. **This term was redefined**: it previously
meant the League-wide round number 1–38, which no longer identifies a point in time once Competitions
of different lengths run concurrently. That sense is now Round.
_Avoid_: using Matchday for a round number, in copy or in a column name

**Round**:
The number a Fixture holds within its own Competition, counted from 1. Scoped to that Competition and
meaningless across Competitions — a cup's Round 3 and a League's Round 3 are unrelated. In a knockout
Competition it is the bracket depth, so it survives byes and replays.
_Avoid_: Matchday (see above), Gameweek, Leg (a Leg is one match of a two-legged tie)

**Calendar**:
The career's sense of time, carried as a real date and advanced only by jumping to the next scheduled
event (a Matchday, or a Transfer Window opening or closing), never by a day-by-day clock. There is no
training or press content to occupy a date with no Fixture, so a finer-grained clock would have
nothing to display. Advancing to a date resolves every unplayed Fixture in the world dated on or
before it, and stops at the first Matchday carrying a Fixture in a playable Competition — Fixtures in
background Competitions resolve without stopping the career.
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
One of two date ranges per Season during which transfer commands are legal: the pre-season window,
open from the date the career starts until the season's first Round, and the mid-season window. One
pair of dates serves every Nation, following from the single Season shape. Transfer commands raised
outside an open window are rejected. No deadline-day mechanic.
_Avoid_: Transfer period (Window is the term used in commands/events)

**League Table**:
The standings derived from all resolved Fixtures of one League in the current Season, ordered by points, then goal
difference, then goals scored. Head-to-head is deliberately not a tie-break.

### Transfers & contracts

**Credits**:
The single in-game currency unit for transfer fees, wages, and budgets. Fictional, with no real-world
currency tie. Nations carry a real `currencyCode`, but it is descriptive metadata: no exchange rate,
conversion, or per-Nation wage unit is modelled, and clubs and players remain fully generated.

**Stature Tier**:
A club's fixed rank among the clubs of its **own Competition** (e.g. big/mid/small), set once and
permanent for the life of a career — nothing moves a club between tiers. It is deliberately *relative*,
not a world-wide scale: a big club in a fourth division is big among its peers, not comparable to a big
club in a first division. The vertical term is the Competition's tier and its Nation's strength prior,
which is what squad quality and Results Strength read alongside it. See
[generation reads the snapshot](.agents/notes/proposed/architecture/2026-09-02-generation-reads-the-snapshot.md).
The single shared input both
Transfer Budget/Wage Budget (below) and Board Objective (see "Board & objectives") derive from
independently; deriving one from the other was considered and rejected (see
[board objectives and manager sacking](.agents/notes/implemented/feature/2026-08-27-board-objectives-and-manager-sacking.md)).

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
Bids this club has made. Distinct from the News Inbox, which is a career record and never a queue of
decisions; the two share a word and nothing else.
_Avoid_: Inbox unqualified (the word alone is now ambiguous — say which one)

### Staff

**Staff**:
A named non-playing employee of a club, on a 1-20 **quality** scale, in one of exactly two roles —
Coach or Scout. Every Staff member exists to carry a mechanical binding; everything else about them is
presence. Quality is static: Staff neither develop nor age. Staff rows exist **only** for a club that
is or has been human-managed, at any Simulation Depth, because no shipped system reads an AI club's
Staff. Fixed at generation, derived from the club's Stature Tier with seeded variance: there are no
Staff wages, no hiring, and no firing, so Staff never touch Contract or Wage Budget. See
[the staff entity and its two bindings](.agents/notes/proposed/feature/2026-09-01-staff-entity-and-bindings.md).
_Avoid_: backroom, coaching staff (fine informally; Staff is the modelled noun)

**Coach**:
The single Staff member of role `coach` a human-managed club holds. Scales the passive baseline every
player receives from Player Development — never the focused Category, which Technical Coaching owns —
so a Coach lifts the whole squad including players the manager never sets a Training Focus for. The
Coach's effect never falls below neutral at any quality, so a weak Coach is felt as an absence rather
than a penalty. Distinct from the human manager, who has Manager Pillars rather than a quality.
_Avoid_: Head Coach, Manager (the human is the Manager)

### Scouting

**Scout**:
A Staff member of role `scout`, assigned by the manager to observe a specific Player, and the
mechanism by which Scouting Progress advances. A club holds exactly as many Scouts as its Stature Tier
grants, and each holds at most one assignment at a time, so the Scouts *are* the assignment slots.
A Scout's quality sets the accrual rate of the assignment they hold, never how many assignments the
club can run. Distinct from the human manager themself — a Scout is a named person the manager
directs, not the player-facing role.
_Avoid_: scout slot (Scouts stopped being fungible slots when they became Staff)

**Scouting Assignment**:
The act of assigning a Scout to a Player, started and ended by explicit manager action. Determines
which Player accrues Scouting Progress while active. Only a Player is a valid target: a Club carries
no hidden value for Attribute Range to narrow.
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

**Manager Profile**:
The set of identity data describing the human manager, chosen once at creation and immutable for the life of the save: manager name, Archetype origin (or Custom Manager), and the four Pillar values. Persisted in the `manager_profile` table. Distinct from `ManagerOutcome` and the `manager_status` projection, which track sacking tenure and are owned by Season Summary. The name of Screen 19 in the Group A reconciliation.
_Avoid_: Manager Status (retired term; collides with the `manager_status` technical table and the imported spec's multiplayer screen)

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
point in an unbuilt system are all explicitly not Bindings. A Binding is **player-reachable** only
when every player-controlled input it reads can be inspected and changed through the shipped
renderer; a Binding on a system whose input has no player-facing surface exists mechanically but
does not satisfy the creation contract, because the creation choice it prices cannot be exercised. Distinct arithmetic insertion points that
serve one coherent managerial contribution are one Binding, not several.
_Avoid_: Effect, Modifier, Hook

**Tactical Acumen**:
The Manager Pillar governing the manager's tactical preparation and the effectiveness with which a
chosen Tactic is executed. In v1 it modifies the magnitude of resolved tactical instruction effects,
deterministically. It has no Scouting binding: Scouting's two numeric terms are the accrual rate,
owned by a Scout's quality, and the noise band, which the Pillar cannot scale without varying one
Scout's output by who employs them. A binding returns only if a surface ships that separates what a
Scout observed from what the manager concludes from it, and it must then affect only information
quality and never replace a Scout's own evaluation capability. Opponent analysis is cut from v1: no opponent-scouting or
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
development, never the passive baseline every player receives (which the club's Coach owns instead) -
so a manager who sets no Training Focus draws no benefit from it. Youth integration and youth promotion are cut from v1: no youth or
reserve squad exists. Always qualified as a Manager Pillar to keep it distinct from Technical, the
Attribute Category.

### Board & objectives

**Board Objective**:
A League-position band (`{ lowerBound, upperBound }`) set for the player's club at the start of each
Season, derived from its Stature Tier via a fixed `packages/shared` tier→band table (exact bands are
tuning data, not decided here). Only the player's club receives one — AI clubs are never judged. It
names the Competition it judges, which is always the club's League: a cup run is never judged.
_Avoid_: Target, expectation

**Verdict**:
The judgment of a Season against its Board Objective, decided once at Season end by comparing final
League Table position to the band: `Exceeded`, `Met`, or `Missed`.

**Consecutive-Miss Counter**:
A per-club counter tracking unbroken `Missed` Verdicts. Any `Exceeded` or `Met` Verdict resets it to
zero. Reaching 1 triggers a warning; reaching 2 ends the career (see Manager Sacked).
_Avoid_: Warning count, strikes

**Season Concluded** (event):
Fires once no unplayed Fixture remains for the Season in any loaded Competition — cup finals included,
so it may fall after the last League Round — carrying the final League Table.
The trigger for Board Objective judgment and every other season-boundary reaction.

**Board Objective Judged** (event):
Fires immediately after Season Concluded, for the player's club only; carries the Board Objective, the
club's actual finishing position, and the Verdict.

**Manager Warned** (event):
Fires when Board Objective Judged is `Missed` and the Consecutive-Miss Counter moves 0→1. No mechanical
effect beyond recording the warning — the career continues.

**Manager Sacked** (event):
Fires when Board Objective Judged is `Missed` and the Consecutive-Miss Counter moves 1→2. Ends the
career by archiving the save (see Archived Save). There is no explicit win state symmetric to this — a
career that is never sacked simply continues indefinitely.
_Avoid_: Game over (fine as player-facing copy, not as the event name)

**Manager Retired** (event):
Fires when the player deliberately ends their own career from the Manager Profile screen. Archives the
save exactly as Manager Sacked does, differing only in cause and in the messaging shown afterwards. It
never touches the Consecutive-Miss Counter or the last Verdict, so an archived save still records how
close to the sack the career was when it ended.
_Avoid_: Resignation (leaving a club for the job market, which this game has no referent for)

**Archived Save**:
A save that accepts no further commands: viewable, read-only, permanent. Two causes archive a save —
Manager Sacked and Manager Retired — and only player-facing copy distinguishes them; every guard and
every badge keys off the archived state alone.
_Avoid_: Sacked save (one of two causes, not the state), Deleted save (a save file removed from disk,
which is a different and unrelated action)

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
The write-side boundary that accepts Commands and upholds one set of consistency invariants (e.g. Wage
Budget never exceeded). There are three, and only one of them enforces its invariants by folding a
Stream. The **Match Decider** owns one Stream per Fixture, keyed on that Fixture's id, holding the
match seed plus mid-match `ChangeTactics`/`MakeSubstitution`; the timeline is folded from it on every
read and never stored. The **Club Decider** owns Contracts, Transfer Budget, Wage Budget, Board
Objective, and the Consecutive-Miss Counter, all of which are enforced against their own tables; its
Stream is a ledger, exists only for the human's club, and records only what no table holds. The
**Season/Calendar Decider** owns one Stream per Save — the current date, Fixture generation, and
Transfer Window state — and is likewise a ledger. League Table is deliberately *not* a Decider —
nothing commands it into a new state, so it's a projection, not an aggregate.
_Avoid_: Aggregate (fine as the general event-sourcing term; Decider is this project's concrete unit)

**Stream**:
One append-only sequence of Events, addressed by a stream type and a stream id. A **folded** Stream is
the sole record of state that no table holds, so reading that state means replaying it — the Match
Decider's is the only one. A **ledger** Stream is written in the same transaction as the authoritative
rows it describes and is never read back; it exists as a record of what happened, not as a source of
truth. An Event is appended only where it is the sole record of a fact, which is why a Ledger stream
never restates a column.
_Avoid_: Log (fine for the `events` table as a whole; a Stream is one keyed sequence within it)

**RpcGroup**:
The `@effect/rpc` contract, defined in `packages/contracts`, that is the only channel between the
Electron renderer and main process. Every player-invokable Command and every read-side query gets its
own typed method on the RpcGroup (e.g. `bidForPlayer`, `getSquad`) — there is no generic envelope
method. Internal-only Commands (AI clubs acting on their own behalf, batch AI-fixture resolution,
cross-Decider reactions) never go through the RpcGroup at all; they're invoked directly, in-process,
since only the renderer needs the IPC boundary.
_Avoid_: API, endpoint (Rpc method is the term; there is no HTTP layer)

**News Message**:
One career event read as a message: a subject, a body, a Category, and a priority, derived on read
from a single row of the `events` log. Never stored — the message *is* the event, and its identity is
that event's coordinates (`"<stream_type>:<stream_id>:<seq>"`), so a message id can never name
something that does not exist. Only whether the manager has read, flagged, or archived it is
persisted, because that is a fact about the person rather than about the world.
_Avoid_: Notification (nothing is pushed and nothing interrupts), Alert, Message unqualified

**News Inbox**:
The screen listing every News Message newest-first, with filters, whole-inbox counts, and a message
pane. A Read model in this glossary's sense — a query shape over the Season stream and the human
club's stream, not a table. It is a career record, not a work queue: nothing in it waits on the
manager, because every AI action still resolves inside the command that triggers it. Distinct from
the Transfer Inbox, which is the Bid queue on the Transfer market screen.
_Avoid_: News feed, Message centre, Notification centre

**Read model**:
A named query shape the RpcGroup's queries serve, computed from authoritative tables at read time
(`squad_view`, `league_table`, `transfer_inbox`, `match_day_timeline`, `season_summary`, and the
News Inbox). None of them
is a table, and derived values that ADR-0001 fixed as computed-on-read (Position Rating, Overall
Rating, Transfer Value) are computed at query time from stored primitives rather than persisted a
second time. A read model is materialised into a table only when its query stays O(world) after the
indexes it needs exist *and* its inputs change less often than it is read; no read model meets both
conditions today.
_Avoid_: Projection table (fine informally; "read model" is the term used across tickets)

### Application shell

**Save**:
One career, stored as one SQLite file and addressed by a branded `SaveId`. It is the unit the player
creates, loads, deletes, and quits. There is exactly one human manager per Save. A Save is durable at
commit — every Command that succeeds has already been written — so a Save is never "unsaved" and there
is no save action for the player to invoke.
_Avoid_: Career (used loosely in routes and types like `CareerDestination`, but the noun is Save),
game, slot

**Main Menu**:
The application's entry point, at `/`: product identity over a vertical menu of five commands — Start
New Career, Load Career, Preferences, Credits, Exit — above a footer carrying the application version
and the database edition. It emits commands and holds no career state; it lists no Saves. This is
where quitting a Save returns to.
_Avoid_: Save List, boot screen, title screen (the Save List was the entry point until 2026-09-01,
when the browser moved to Load Career; see the Group A reconciliation ledger)

**Load Career**:
The saved-game browser at `/load`, reached from the Main Menu's Load Career command. It lists
existing Saves, marks archived ones, offers Start New Career when there are none, and returns to the
Main Menu with Back. It is the only surface that enumerates Saves.
_Avoid_: Save List, Load Game
