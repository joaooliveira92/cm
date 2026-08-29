Status: ready-for-agent

# Training — Player Development & Training Focus

## Problem Statement

The Championship Manager clone's v1 spec (`.scratch/cm-clone/spec.md`) deliberately lists **Training**
as out of scope, but its [CONTEXT.md](../../CONTEXT.md) already defines the vocabulary for two systems
that the game has never actually implemented: **Player Development** — the per-season, age-shaped
Attribute growth toward a player's hidden Potential Ability — and **Training Focus** — a per-player,
per-Category assignment the manager sets that biases how much of a season's Player Development one
Category receives. Today the game is static in this respect: a player's Attributes are generated once
at career start and never change, so there is no sense of a player aging, improving toward their
ceiling, or declining past their prime, and the manager has no lever to shape how a prospect develops.
Players are indistinguishable over time regardless of age or potential.

## Solution

Implement Player Development and Training Focus as two deterministic, game-design-driven systems owned
by the Club Decider and triggered off the existing `SeasonConcluded` boundary, with the pure math in
`@cm-clone/shared` so it stays unit-testable without a database.

- **Player Development** runs once per `SeasonConcluded`, independently per player. Each Attribute
  moves a fixed fraction of the gap toward that player's age-appropriate ceiling (the same
  `attributeCeilingOn20Scale` the generation code already uses), deterministically with no RNG or
  seed, and self-clamps so it never overshoots. Attributes rise through youth, plateau through the
  prime, and — Physical only — decline past 30. Growth is uniform across all four Categories. Hidden
  attributes develop identically.
- **Training Focus** is a per-player, per-Category assignment (Technical / Mental / Physical /
  Goalkeeping) a manager sets on a player of a human-managed club, changeable at any time. Focusing a
  Category multiplies that Category's seasonal growth fraction by a fixed constant; it is purely
  additive, taking nothing from the other three Categories. No-focus is a real fourth state and the
  default. AI clubs' players always develop on unmodified Player Development.

The result: a manager sees young players climb toward their potential across seasons, veterans plateau
then (for Physical ability) decline, and can steer a prospect's development by concentrating a season
on one Category — without ever seeing the hidden Potential Ability number.

## User Stories

1. As a manager, I want each player's Attributes to grow toward their potential as they get younger,
   so that promising signings visibly improve over a season.
2. As a manager, I want a player's growth to slow and plateau through their prime, so that a mature
   player holds their level rather than improving forever.
3. As a manager, I want a player's Physical Attributes to decline once they pass their prime, so that
   aging players eventually lose a step, while their Technical/Mental level holds.
4. As a manager, I want Player Development to run automatically once per Season so that every player
   on every club advances in lockstep with the season ending, without me clicking per player.
5. As a manager, I want Player Development to be fully deterministic, so that the same player with the
   same history always ends the season the same way, with no random surprises in who improved.
6. As a manager, I want a player's Attributes never to overshoot their ceiling, so that growth cannot
   push a player past what their potential allows.
7. As a manager, I want a player's hidden attributes to develop by the same rules as visible ones, so
   that they do not silently diverge into a corner over a long career.
8. As a manager, I want to set a per-player Training Focus on one of the four Categories, so that I can
   steer where a player concentrates their development.
9. As a manager, I want a player who has no Training Focus set to develop with an unmodified,
   balanced, season, so that I am never forced to pick a focus for every squad member.
10. As a manager, I want focusing one Category to accelerate that Category's growth, so that a young
    prospect I focus on Physical work actually gets stronger faster.
11. As a manager, I want focusing one Category not to take growth away from the other three, so that
    concentrating development never punishes a player elsewhere.
12. As a manager, I want to change a player's Training Focus at any point during the season, so that I
    can react to a developing player or a need without waiting for a transfer window or season end.
13. As a manager, I want Training Focus to be a player-invokable command (`SetTrainingFocus`) exposed
    over the RpcGroup, so that it is a normal, typed, IPC-driven action like any other command.
14. As a manager, I want my club's AI-controlled players to develop on unmodified Player Development,
    so that opposing squads improve on the same underlying curve without my input or bias.
15. As a developer, I want a player with no persisted Training Focus read as the no-focus default, so
    that existing saves and freshly generated players need no migration or backfill.
16. As a developer, I want Player Development's math exposed as pure, DB-agnostic functions in
    `@cm-clone/shared`, so that I can unit-test the age-curve and the focus bias directly with no
    Electron or SQLite.

## Implementation Decisions

**Pure math lives in `@cm-clone/shared` (the dominant seam).**
- Export `attributeCeilingOn20Scale` (currently a private helper in generation.ts) so both generation
  and Player Development share one age-curve — a player is generated toward exactly the ceiling they
  grow toward each season. The curve: a linear 16→23 ramp toward PA (on the 1–20 scale), plateau
  24–29, and Physical-only decline (~1.5/season) past 30; Technical/Mental hold at PA.
- Add a named tuning constant `PLAYER_DEVELOPMENT_FRACTION` (default ~0.65): each Attribute moves this
  fixed fraction of the remaining gap to its current age-ceiling each season, then rounds. Because it
  is a fraction of the *remaining* gap, it self-clamps at the ceiling and never overshoots; decline is
  handled uniformly as a falling ceiling.
- Add a named tuning constant `TRAINING_FOCUS_MULTIPLIER` (default ~1.5): the focused Category's
  seasonal growth fraction is multiplied by this. The ceiling clamp already prevents overshoot, so the
  multiplier needs no separate cap.
- Add a pure function that, given a player's current Attribute set, age, potential ability, and
  (optional) focused Category, returns the next season's Attribute set — applying the gap-fraction
  step per Attribute, multiplying the step for Attributes in the focused Category, and leaving
  unmodified development identical to a no-focus pass.

### Event-sourcing & the Club Decider
- Player Development is owned by the Club Decider (the per-club stream already holds player-scoped
  state), triggered off `SeasonConcluded` via the existing cross-Decider reactor, exactly the way the
  other `SeasonConcluded` reactions (contract expiry, board judgment) already run in-process with no
  outbox. It runs per player, per club, and emits a new `PlayerDeveloped` event per club carrying the
  updated Attribute set.
- `PlayerDeveloped` is a *development-outcome* event (per Season, per club, carries the resulting
  Attributes). It does **not** carry a Training Focus payload — the Club Decider reads the player's
  currently persisted Training Focus when folding that season's development.
- Training Focus is a state change a manager makes *between* seasons, so it gets its own persisted
  event `TrainingFocusSet` on the Club Decider's stream, distinct from `PlayerDeveloped`. The
  `SetTrainingFocus` command targets the same Club Decider.

### Persistence & read model
- A missing Training Focus value reads as the no-focus default at read time; a write happens only when
  a manager sets a focus. No schema migration, no backfill, and freshly generated players need no
  focus row. Goalkeeping Attributes and hidden Attributes are covered by the same default (no focus /
  identical development) unless a focus names the Goalkeeping Category.
- New schemas/DDL: a small per-player Training Focus store (the player id and a focused Category or a
  null meaning no-focus), plus the `PlayerDeveloped` and `TrainingFocus` event payload schemas.
- Player Development writes only Attribute values, so ADR-0001's derived-on-read Position Rating /
  Overall Rating / Transfer Value stand untouched.

## Testing Decisions

- Good tests exercise external behavior at the point the math is folded: given a player's Attributes,
  age, potential, and optional focus, the resulting next-season Attributes are a pure function — test
  it directly, not the internal rounding or the specific gap arithmetic in isolation.
- The single highest-value seam is `@cm-clone/shared`: the pure `develop` function and its curve are
  unit-tested directly, following the precedent of `ratings.test.ts` and `board.test.ts` in
  `packages/shared/test`. Cover: growth before 23, plateau in the prime, Physical-only decline past
  30, the self-clamping ceiling (no overshoot), hidden attributes moving, and the focused-Category
  multiplier landing only on that Category (with the other three unchanged).
- Determinism is directly testable: identical (attributes, age, potential, focus) inputs must produce
  identical output — a regression net for the whole mechanic.
- `packages/contracts` gets schema-level round-trip tests for the new `SetTrainingFocus` command /
  `PlayerDeveloped` and `TrainingFocus` events, mirroring `contracts/test/roundtrip.test.ts`.
- The `SeasonConcluded` wiring in the app is exercised the way `apps/desktop/test/aiClubs.test.ts`
  exercises `advanceCalendar`: drive a real save, assert every player's stored Attributes advanced and
  that `PlayerDeveloped` fired per club. Follow that same in-repo `@effect/vitest` + real-SQLite-temp
  pattern; no Electron/IPC in the tests.

## Out of Scope

- The training screen UI layout/prototyping for per-screen layout — domain only in this spec.
- Youth academy / intake system — Training applies uniformly across ages via the existing age-curve.
- Training facilities / coaches / capacity — always-on, no slot or scarcity mechanic.
- Training × Condition / injury recovery interaction — Training Focus is purely an Attribute-growth
  lever.
- AI-club training behavior — AI clubs always use unmodified Player Development.
- Any change to the derived Rating / Transfer Value computed-on-read model (ADR-0001).

## Further Notes

- Canonical vocabulary lives in [CONTEXT.md](../../CONTEXT.md) (Player Development, Training Focus).
- Architecture rationale lives in
  [ADR-0011](../../docs/adr/0011-deterministic-fractional-player-development.md).
- Decisions resolved in
  [`.scratch/training/map.md`](map.md) and its two ticket files; the spec introduces no new decisions
  beyond those two tickets (Player Development curve and Training Focus mechanics).
- This spec does not attempt to model Training Focus for AI clubs (out of scope) and does not
  reconcile cross-Decider concerns beyond the single `SeasonConcluded` reaction — see the map's Notes.
## Training model corrections required

Two corrections the onboarding effort found while specifying the Training Focus renderer surface
(`.scratch/onboarding/issues/11-training-focus-has-no-ui.md`). Neither is onboarding's to implement —
onboarding may not change development behaviour — and both are recorded here for whoever next owns or
maintains Training. Until each is resolved, onboarding's contextual help stays neutral and does not
overstate the visible payoff of Training Focus or Technical Coaching.

### Training Focus spends development on mechanically orphaned Attributes

`developPlayer` develops every entry in `ALL_ATTRIBUTES` while a Training Focus biases a whole
Category, so a Technical or Mental focus spends part of its multiplier on `firstTouch` and
`determination` — Attributes no shipped table or resolver reads, and which the onboarding
contextual-help decision removed from player-facing screens. The Training owner must either give those
Attributes a shipped, tested, player-relevant consumer, or exclude mechanically orphaned Attributes
from focus allocation.

### Training Focus accelerates decline, contradicting "no downside"

This spec's Out of Scope and user stories 10–11 present Training Focus as purely additive, with no
downside. The shipped step is:

```
current + (ceiling - current) * fraction
```

with `fraction` = `PLAYER_DEVELOPMENT_FRACTION` (0.65) unfocused and
`PLAYER_DEVELOPMENT_FRACTION * TRAINING_FOCUS_MULTIPLIER` (0.975) focused. Where the age-adjusted
ceiling sits *below* the current value — Physical Attributes past 30, per the Player Development curve
— Training Focus closes 97.5% of the downward gap instead of 65%, accelerating decline rather than
only accelerating growth. "Purely additive" is true of the *other three* Categories, not of the focused
one on a declining player.

The Training owner must choose and record one of two models:

1. **Accelerated decline is intentional.** Amend this spec and the player-facing contract so "purely
   additive" and "no downside" no longer overstate the mechanic.
2. **Focus affects growth only.** Stop applying the Focus multiplier to a negative development gap.

### Related: Training Focus applicability

Separately, onboarding's decision requires the command boundary to reject a Training Focus whose
Category contains no Attribute present on the target player — today `SetTrainingFocus` accepts and
persists a `goalkeeping` focus for an outfield player, where the multiplier then applies to zero
Attributes. That is a change to this effort's shipped command; the rationale and the typed-error shape
are in the onboarding
[Agent Note](../../.agents/notes/proposed/feature/2026-08-29-training-focus-squad-column.md).
