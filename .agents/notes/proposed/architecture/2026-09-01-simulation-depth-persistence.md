# Agent Note: What each Simulation Depth stores

Status: proposed

## Problem

`CONTEXT.md` defines three Simulation Depths — `full`, `standard`, `results-only` — entirely in terms
of what the player experiences, never in terms of what is on disk. The MVP world data model needs that
second definition: which tables exist for a club at each Depth, what a club without players is made
of, how its matches resolve, and what happens when it crosses the boundary.

The obvious justification for a reduced tier was storage, and it is false. A 400,000-player world is
~335 MB and ~22 seconds to generate, both linear. `results-only` cannot be defended on bytes, so it
had to be defended on some other recurring cost or dropped.

## Proposal

**`results-only` ships, justified solely on recurring per-matchday simulation cost. `full` and
`standard` are byte-identical on disk. A club without a squad carries no stored scalar: its Results
Strength is derived on read.**

Four decisions, in dependency order.

### The tier is a simulation valve, not a storage one

One full match simulation costs **~1.0 ms** (500 warm runs of `simulateMatch` over two generated 4-4-2
squads, ~19 events per match). `resolveMatchday` runs the full engine for every fixture on the
matchday, the human's and every AI fixture alike, synchronously inside the Continue request.

At ~25 players per club, a 400k-player world is ~16,000 clubs, so ~8,000 fixtures per matchday:
**~8 seconds of blocking JavaScript every time the player presses Continue**, and roughly five minutes
of simulation per background season. A results-only fixture resolves from two numbers in microseconds
instead. That recurring, player-facing cost is the entire reason the tier exists.

The two rejected justifications are recorded so they are not re-adopted later. Generation wall-clock is
one-time and small: at ~55 microseconds per player, making half a 400k world results-only saves ~11
seconds once, behind a progress bar. Read-path cost is real but belongs to the query-layer defects
already handed off; a schema tier cannot be justified by a bug.

The honest consequence: at small worlds the tier buys nothing measurable. `results-only` is a scale
valve, not a default, and a save with a few hundred clubs pays ~0.4 s per matchday with no tier at all.

### `full` and `standard` are the same shape

No table exists for a `full` club that a `standard` club lacks. Clubs, players, player positions,
contracts, fitness, tactics, and budgets are written identically at both Depths. The three tables that
do vary per club — staff, board objective, manager status — key off *human-managed*, not off Depth.

So on disk the three-value Depth collapses to two shapes: **has a squad**, or **does not**. Depth stays
a three-value column on `competitions`, because the setup screen and Simulation Mode both need all
three, but only the `results-only` boundary changes the table set. The `full`/`standard` boundary is
manageability, which is Simulation Mode's concern and costs nothing on disk.

The alternative — inventing some reduced representation to justify the third value — would create
stored values nothing reads, which the Manager Pillar discipline forbids.

### Results Strength: one number, 1-100, derived on read

A results-only club is a `clubs` row with no players, no contracts, no fitness, no tactics. What stands
in for its squad is **Results Strength**: a single integer on the 1-100 Position Rating scale,
representing how the club performs in a fixture nobody watches.

It is **one** number, not a triple mirroring Attack/Midfield/Defense, because a results-only
competition surfaces standings, fixtures, and results only — no goalscorers, no injuries, no
conditions. Nothing reads the phases separately, so two of three columns would be read by nothing.

It is **1-100** rather than the 1-20 Attributes scale because it is a club aggregate standing in for
Position Rating, and it must be directly comparable with a real squad's Phase Strengths, which are
themselves averages of Position Ratings.

It is **derived on read** from the world seed, the club's id, its Stature Tier, and the season number,
with the per-season step folded from season 1 so the club's fortunes walk continuously rather than
redrawing independently each year. It is not a stored column. Nothing would ever write to such a
column: results-only clubs have no transfers, no development, no staff, and no contracts, so the only
writer would be a deterministic function of data already on disk. Storing it would reintroduce, one
level up, exactly the persisted Current Ability scalar that
[player ratings are derived projections](2026-08-29-player-ratings-are-derived-projections.md)
refused at the player level. That note governs players and stays active; this decision extends its
rule to a club aggregate.

Its distribution is calibrated against measured squads. Collapsing real generated squads to the mean of
their three Phase Strengths, over 300 clubs per Stature Tier:

| Stature Tier | mean | p10-p90 | full range |
|---|---|---|---|
| `big` | 52.8 | 47.8-57.8 | 41.7-65.0 |
| `mid` | 40.8 | 36.4-45.6 | 30.8-52.1 |
| `small` | 31.7 | 27.9-36.0 | 22.7-41.6 |

The seeded scalar reproduces these bands, so a results-only club and a squad-bearing club of the same
Stature Tier are drawn from the same distribution. The tiers overlap heavily and deliberately: a strong
`small` club (36.0 at p90) outranks a weak `mid` one (36.4 at p10), which is what keeps a results-only
league from crowning its biggest club every season.

The name avoids a live collision. `CONTEXT.md` lists "team strength" and "team rating" on the Avoid
line for **Phase Strength**; **Results Strength** names both what it is for and what it is not.

### The boundary: collapse, and crossing it

Cups own no clubs and draw entrants from other loaded competitions, so a results-only division can feed
a `standard` national cup. That produces a tie between a club with a squad and a club without one,
which the match engine cannot resolve — one side has no players to fill a formation.

**Depth follows the club's league, and a mixed tie resolves at the shallower of the two sides.** The
squad-bearing club's Phase Strengths are collapsed by the **collapse function** — the mean of the three
phases, which lands on the same 1-100 scale — and compared against the other club's Results Strength.
Effective Depth is *derived* from participant rows joined to `competitions.depth`, never stored on
`clubs`, consistent with the ruling in
[the competition graph](2026-09-01-competition-graph-and-promotion.md) that a club's competition is
its participant row rather than a duplicated column.

The collapse discards real information: within-club phase spread averages 11 points and reaches 20 at
p90, so a club that is strong in attack and weak in defense meets a results-only opponent as a flat
average. This is confined to the boundary. Every match between two squad-bearing clubs runs the
untouched three-phase engine, so the lost texture only ever affects matches nobody watches.

**Crossing the boundary discards downward and conjures upward.** A club relegated into a results-only
tier has its player rows deleted. A club promoted into a `standard` tier has a squad generated from its
`clubs.generation_seed` and the current season number, calibrated so the new squad's collapsed strength
matches the Results Strength it carried the week before — otherwise its first fixture contradicts its
last one.

Player identity therefore does not survive a round trip: a club that spends a season in a results-only
tier loses those players permanently and returns with different ones. This is acceptable because
`results-only` is defined as having no persistent squads, so no human ever saw them. The alternative,
retaining a frozen squad, is free on disk but produces a team that neither ages nor transfers for
however many seasons it spends down there — a visible lie the moment it returns.

## Row-count budget

`results-only` writes no rows beyond what the club already needs. Per results-only club, against the
measured ~2.4 KB per club and ~450 bytes per player: the club row and its participant rows, and no
players, positions, contracts, fitness, or tactics — so ~2.4 KB instead of ~2.4 KB plus ~11 KB of
squad. Results Strength adds zero bytes, being derived.

The saving that matters is not those bytes. It is ~25 player rows never generated (~1.4 ms of insert
time each way) and, recurring every matchday for the life of the save, ~1.0 ms of match simulation per
fixture replaced by a scalar comparison.

## Acceptance criteria

- No table is written for a `full` club that is not written for a `standard` club.
- A results-only club has zero rows in players, player positions, contracts, fitness, and tactics.
- No column named for club strength exists in the schema; Results Strength is computed at read time and
  reproduces the measured per-Stature-Tier bands above.
- Two saves generated from the same world seed produce identical Results Strength for the same club in
  the same season, and identical conjured squads for a club promoted across the boundary.
- A results-only league does not return the same champion every season under a fixed seed.
- A cup tie between a squad-bearing club and a results-only club resolves without invoking the match
  engine, using the collapse function on the squad-bearing side.
- Effective Depth appears nowhere as a column on `clubs`.

## Alternatives considered

- **Drop `results-only` entirely.** With bytes off the table it briefly looked unjustifiable. Rejected
  on the measurement: ~8,000 fixtures per matchday at ~1.0 ms each is ~8 seconds per Continue, a
  recurring cost the player pays with every press of the only time-advancing command in the game.
- **A phase triple instead of one number.** Would let the existing engine consume a results-only club
  directly. Rejected because a results-only competition never surfaces anything a phase split feeds:
  two of the three values would be stored, derived, and read by nothing.
- **Storing Results Strength as a mutable column.** Rejected because no system would ever write it. It
  is a pure function of the world seed, the club, and the season, and persisting such a value is the
  Current Ability scalar the project already refused.
- **The 1-20 Attributes scale.** Rejected because Results Strength substitutes for Phase Strength in
  comparisons, and Phase Strength is an average of 1-100 Position Ratings. Two scales meeting at the
  boundary would need a conversion that buys nothing.
- **Effective Depth as the deepest competition a club participates in.** Correct by derivation, but a
  cup-eligible lower division would be dragged to `standard` wholesale the moment it qualifies,
  destroying the simulation saving the tier exists for.
- **Excluding results-only competitions from cup entry.** Uniform resolver, no mixed ties, no collapse
  function. Rejected because the giant-killing round is the part of a domestic cup anyone cares about,
  and this trades that gameplay for implementation tidiness on top of the closed-world flattening the
  competition graph already accepted.
- **Retaining squads through a relegation into results-only.** Free on disk. Rejected because a squad
  that neither ages nor develops for several seasons is wrong in a way that becomes visible on
  promotion, whereas a conjured squad is always age-correct and strength-calibrated.

## Risks

- **The calibration is only as good as the collapse.** If the seeded Results Strength distribution
  drifts away from what real squads collapse to — because squad generation changes, or Position Weights
  are retuned — mixed cup ties become absurd in one direction or the other. The measured bands above are
  the regression target, and they are a snapshot of today's generator.
- **Continuity across the boundary is approximate.** A promoted club's conjured squad matches its prior
  Results Strength on average, not exactly, because a squad is 11 players against one number.
- **Losing player identity on relegation is irreversible per save.** If a later effort makes
  results-only clubs partially visible — a scouted player, a transfer target, a news item naming a
  scorer — the deletion becomes user-visible data loss and this decision must be reopened rather than
  patched.
- **The tier's value is unproven below world scale.** Nothing in MVP forces a save large enough to feel
  the 8-second matchday. If real saves stay small, `results-only` is complexity carried for a scale that
  never arrives, and the honest response then is to delete the tier, not to find new work for it.
