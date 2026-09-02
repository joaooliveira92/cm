# 07 - What each Simulation Depth actually stores

Type: grilling
Status: resolved
Blocked by: 02, 03, 04

## Question

`CONTEXT.md` defines three depths — `full`, `standard`, `results-only` — in terms of what the player
experiences, never in terms of what is on disk. Charting settled the shape of the answer: `standard`
carries full generated squads, `results-only` carries a club strength scalar and no player rows, and
there is no third reduced player representation. This ticket makes that precise, informed by the
measurements from ticket 04.

**Ticket 04 removed this ticket's assumed premise.** Storage is not the constraint: 400k players is
~335 MB and ~22 s, linear. `results-only` cannot be justified on bytes, so justify it on generation
wall-clock, per-matchday simulation cost, or read-path cost — or conclude it does not earn its place.

- What exists at each depth, table by table: clubs, players, contracts, fitness, tactics, staff,
  budgets. Which tables are simply absent for a `results-only` club?
- What the `results-only` strength scalar is, where it comes from (it cannot be derived from players
  that do not exist), and how it evolves across seasons so a results-only league does not produce the
  same champion forever.
- How a match between two `results-only` clubs resolves, given the match engine reads Phase Strengths
  computed from Position Ratings of real players.
- What happens when a club **changes depth** — a results-only club promoted into a standard division,
  or the player changing scope mid-career if that is even legal. Squads must be conjured or discarded;
  which, and is it reproducible from the seed?
- Whether depth is stored per competition, per club, or both, and what is authoritative when a club's
  competition is capped at `standard` by dependency closure.
- The row-count budget this implies, against ticket 04's numbers.

## Handoff from ticket 02

[02](02-competition-graph-and-promotion.md) placed Simulation Depth as a column on the `competitions`
row — one row per *activated* competition, none for those resolved to `not_loaded`. What each Depth
value implies on disk remains this ticket's subject; only where the value is written is settled.

## Answer

**`results-only` ships, justified solely on recurring per-matchday simulation cost (~1.0 ms per
fixture, measured); `full` and `standard` are byte-identical on disk; and Results Strength is one
1-100 number derived on read, never a stored column.** See
[Agent Note](../../../.agents/notes/proposed/architecture/2026-09-01-simulation-depth-persistence.md).
