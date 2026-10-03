# Agent Note: Set-piece instructions shape who takes part and how, and defaults change nothing

Status: implemented

## Problem

Tactics stores CM 03/04's set-piece instructions (team delivery per side, six per-player roles), and the
engine ignores all of them. Making them count raises two questions. How much modelling do they get? And how
do they arrive without changing every match played so far, every pinned seed and the calibration?

## Decision

The instructions act through the existing set-piece resolution rather than replacing it. The attacking
roles decide who is in the box and where. The delivery picks the target among them, or turns the set piece
into a shot from range, a short option or a kept ball. Defending roles apply bounded multipliers to the
defence's value against that delivery and target. Heading stands in for height in the marking roles; no
attribute is added.

With every role and delivery at `default`, the engine takes exactly the old path: the same random draws
and the same events. A role or delivery only takes effect when set. A non-default instruction may draw
extra random numbers, so matches that use them differ from before, and that is intended.

Throw-in delivery and roles stay without effect: the engine has no throw-in events.

See [the effort spec](../../../../.scratch/set-piece-roles/spec.md).

## Alternatives considered

- **A new set-piece model with its own probability tables per delivery.** Rejected: it would retune the
  calibrated goal rates for every match, including all-default ones, for no gain in what the player sees.
- **Mapping `default` to a sensible role per position** (centre backs go forward, full backs stay back).
  Rejected: it changes every existing match and seed, and CM's own `default` is opaque. A manager who wants
  a behaviour sets the role.
- **Adding a height attribute for the marking roles.** Rejected: a database and generation change for two
  menu entries; heading is the attribute that decides headers anyway.

## Consequences

- Seeded tests and saved matches in progress are unaffected until a tactic sets an instruction.
- Each role's effect is a constant in the simulator's constants file, tunable without touching the rules.
- Throw-in instructions remain a known no-op until throw-ins are modelled.
- The resolution lives in `packages/game-engine/src/match/simulate/cornerPlan.ts` and `freeKickPlan.ts`;
  set-piece events record the delivery that actually happened, so commentary, which only reads what came
  before a line, never announces a short corner that was then crossed.
- Per-slot **player instructions** have the same gap and are not fixed by this effort: see
  [formations-and-instructions 35](../../../../.scratch/formations-and-instructions/issues/35-player-instructions-reach-real-matches.md).
