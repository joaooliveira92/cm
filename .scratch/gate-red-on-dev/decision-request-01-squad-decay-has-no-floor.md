# Decision Request: what stops the human club's squad decaying below eleven?

## Question

A season of contract expiries removes players from the human club and nothing puts any back. After
one rollover a minority of worlds leave the human club unable to field eleven; after two, most do.
At that point the club has no legal Tactic, the pre-match boundary cannot be crossed, and the career
is over with no in-game action that recovers it. What is the floor?

## Why this is blocking

Nothing today. It was found while fixing gate-red-on-dev ticket 05 and the ticket shipped without
it — the flake had a separate, real cause (unseeded test worlds) and that is fixed.

It is filed because it changes what the game *is*, not how it is built, and because the evidence is
cheap now and expensive to re-derive later. It is also why ticket 05 looked like a flake for two
sprints: the suite only ever plays into season 2, where the condition is rare enough to read as
timing.

## Evidence

Measured with a seed sweep over 400 worlds at the default career scope (one league and its cup),
driving `advanceThroughBoundary` exactly as the specs do:

| Played to | Worlds where the human club cannot field eleven |
|---|---|
| Season 2 (one rollover) | a small minority |
| Season 3 (two rollovers) | the majority |

The shape is always identical: squad 10, a Tactic still holding 11 slots, blocker
`tactic-names-departed-players`. Seeds 7, 46, 298 and 381 reproduce it at season 2 on the
`beginCareer` + first-club path; `contract-expiry.test.ts` pins one at season 2 on the `createSave`
path.

## What is already settled

- **Contract expiry → Free Agent** is the rule (ticket 16 / ADR-0005), implemented in
  `expireContractsForSeason`. Initial squads are spread over 1–3 contract years so expiry does not
  hit everyone at once — a smoothing measure, not a floor.
- **AI clubs already tolerate the state.** `matchday.ts` resolves a Fixture from two strength
  numbers when either side is short of eleven, and its comment names "a club left short by a season
  of contract expiries" explicitly. The asymmetry is deliberate: the human's Fixture is a boundary.
- **The boundary is the feature.** Match readiness is recomputed authoritatively in
  `match/start.ts`; a machine-picked fallback Tactic was deliberately deleted
  (`TacticMissingError`'s doc comment). Re-adding a silent fallback reopens a closed decision.
- **AI clubs get a squad-gap transfer routine** (ticket 17 / ADR-0005). The human gets none.

## Options

### Option A — the human's own transfer activity is the floor

- **What the player experiences**: the squad shrinks each season and they must sign free agents and
  buy to stay legal. Running out is a loss condition they earned.
- **What it costs to build**: a Free Agent pool worth signing from, and a board/objectives
  consequence. Much of the Sign flow exists.
- **What it forecloses**: nothing. It is the simulation answer.
- **Save compatibility**: no schema change.

### Option B — youth intake replenishes every club, human included

- **What the player experiences**: each rollover adds a handful of generated young players, so the
  squad has a natural floor without the player having to act.
- **What it costs to build**: a generator at rollover, reusing world generation's player draw.
- **What it forecloses**: makes squad size a weaker source of pressure.
- **Save compatibility**: no schema change; new rows only.

### Option C — AI-style renewal for the human club too

- **What the player experiences**: contracts quietly renew unless the player intervenes.
- **What it costs to build**: least of the three.
- **What it forecloses**: contract expiry stops being a thing the player manages, which is most of
  what ticket 16 built.
- **Save compatibility**: no schema change.

## Recommendation

**B, then A.** B alone gives the floor and is the smaller change; it stops a career ending to
attrition the player was never shown. A is the interesting half and should follow, but it depends on
a Free Agent pool that is currently whoever happened to expire.

C is the one to avoid: it deletes the mechanic rather than completing it.

Whichever is chosen, the condition deserves to be *visible* before it is fatal — the club approaching
eleven is exactly what the Continue readiness advisories are for.

## What is blocked, and what is not

- **Blocked**: any spec that plays a career past season 2. There is currently no such spec, and one
  written today would fail on most worlds.
- **Proceeding meanwhile**: everything. Ticket 05 shipped. `boundary-helpers.ts` now raises
  `HumanClubCannotFieldElevenError` naming the squad size, so a spec that wanders into this state
  says so instead of failing three modules away in `match/start.ts`.
