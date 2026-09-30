# Agent Note: Roles give way to CM 03/04 player instructions

Status: proposed

## Problem

v1 gave each tactical slot one Role (Goalkeeper, Ball-Playing Defender, Wing-Back, Anchorman,
Playmaker, Winger, Attacking Midfielder, Poacher), derived from the slot's Position through
`POSITION_ROLES`, and scored each starter's fit with a Role Rating against `ROLE_WEIGHTS`. That fit
nudged `TacticalModifiers` by up to ±0.05. Roles are a Football Manager concept (FM 2012 onward) and
never existed in Championship Manager 03/04, which this game clones. CM 03/04 expressed what a player
does in his slot through per-player instructions instead. Once the Tactic is rebuilt to CM 03/04
fidelity, the question is whether Roles survive next to those instructions.

## Proposal

Roles, Role Weights and Role Rating will be removed as domain concepts. Per-player instructions, with
the set and values CM 03/04 shipped, will take their place. The removal is complete: `CONTEXT.md`,
the Agent Notes that describe Roles, the domain types, contracts, UI, ratings logic, fixtures and
tests are reconciled in the same implementation sequence, and no compatibility adapter silently turns
a Role into an instruction bundle.

Named instruction bundles may exist only as UI conveniences that fill in instruction values, and only
if research shows CM 03/04 offered something similar. They are never stored or read by the engine as
a Role.

What takes over Role Rating's job (a fit measure that nudges `TacticalModifiers`) is decided
separately in the effort's player-instruction ticket; this note settles only that Roles go.

## Relationship to existing notes

Partially supersedes
[Role Rating is computed at tactic-resolution time](../../implemented/architecture/2026-08-27-role-rating-outside-match-engine.md):
its Role and Role Rating content goes, while its rule that the match engine reads Position Ratings and
precomputed modifiers rather than tactics stays in force until the effort's engine-mapping ticket
revisits it. That note gets a `> Superseded in part` block when this one is implemented.

## Alternatives considered

- **Keep Roles alongside CM instructions.** Rejected: two overlapping ways to say what a player does
  in a slot, one of them anachronistic, with the engine needing a precedence rule between them.
- **Keep Roles as the model and skip player instructions.** Rejected: contradicts the goal of CM
  03/04 fidelity and leaves one fixed Role per Position, which carries no real choice.
- **Convert Roles into instruction bundles behind the scenes.** Rejected: keeps a dead concept alive
  under another name and makes stored Tactics depend on a mapping nobody chose deliberately.

## Acceptance criteria

- No `Role`, `ROLES`, `POSITION_ROLES`, `ROLE_WEIGHTS` or Role Rating remains in `packages/` or
  `apps/desktop/src`, other than unrelated uses of the word (staff roles).
- `CONTEXT.md` has no Role, Role Weights or Role Rating entries and defines Player Instruction.
- The Role Rating note carries its supersession block.
- Every former Role consumer (contract offer terms, tactics contracts and screens, commentary, AI
  clubs) has a named successor or was deleted on purpose.

## Risks

- Contract offer terms name a Role today; removing it changes what a contract offer shows and needs
  its own successor decision.
- Losing the ±0.05 fit nudge changes match balance until its successor lands.
- A future contributor who knows FM may try to reintroduce Roles. Reintroduce them only if the
  destination changes from CM 03/04 fidelity to FM fidelity.
