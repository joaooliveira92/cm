# Map: formations-and-instructions

Label: wayfinder:map

## Destination

A **spec**, at `spec.md` in this effort's directory, for a production-level, CM 03/04-faithful
Tactic: the built-in formation presets, team instructions, per-player instructions, their effects
on the three-phase match engine, live tactical changes, a named saved-tactic library, AI tactic
selection and in-match adjustment, the Tactics UI, and the removal of Roles. Plus the
reconciliation it needs in `CONTEXT.md` and the Agent Notes.

Plan-only. The map is done when nothing is left to decide and the spec can be handed to
`/to-spec` → `/to-tickets` → `/implement`.

## Notes

- **Sibling of [player-positional-model](../player-positional-model/map.md).** That effort owns
  which slots and positional lines exist. This one consumes its slot vocabulary (its ticket 05) and
  must not re-decide it. Presets that use only today's slots are not blocked by it.
- **CM 03/04 is the source of truth.** The pasted requirements list that opened the effort is a
  hypothesis for tickets 02 and 03, not a source. Keep the verified / inherited / later-FM labelling
  the positional effort uses.
- **No MVP compromises, but no faked spatial semantics.** See
  [Effort scope and binding decisions](issues/01-effort-scope-and-binding-decisions.md).
- **Shared worktree.** A parallel session has uncommitted Tactics UI changes (2026-09-29). Research
  subagents write only under `docs/research/` and do no git operations, instead of the skill's
  default throwaway `research/<name>` branch, because switching branches would move the other
  session's worktree.
- **Skills every session should consult**: `grilling` and `domain-modeling` by default; `research`
  for 02 and 03; `prototype` for 12; `effect-code` for any session that reads source to answer a
  ticket.
- **Slice plan the spec must produce.** The user's requested implementation sequence, for
  `/to-tickets` to cut as vertical slices once the map is done: built-in formation presets; team
  instructions; player instructions; Role removal; match-engine effects; live tactical changes;
  saved tactic library; AI tactic selection; AI in-match adjustment; Tactics UI; save-version
  rejection test; documentation and Agent Note reconciliation; system validation and regression.
  Presets needing new slots are sliced behind player-positional-model's implementation.

## Decisions so far

<!-- one line per closed ticket: gist, then link to the ticket file -->

- [Effort scope and binding decisions](issues/01-effort-scope-and-binding-decisions.md): sibling
  effort; CM 03/04 as shipped decides the lists; Roles removed; three-phase engine kept with no faked
  spatial effects; complete Tactics change live; named tactic library; AI runs complete Tactics
  through the same operations; old saves refused by the existing schema-version check.
- [What formations CM 03/04 shipped, and what a tactic file held](issues/02-cm-0304-default-formations-and-tactic-files.md):
  29 presets (27 at retail) on a GK + 6-row by 5-column grid with no wing-back row; each player has a
  base cell and one run target; tactic files hold no player identities.

## Not yet specified

- **Set pieces.** Whether takers and set-piece routines belong to the Tactic.
  [group-f's decision request](../group-f-tactics-and-match-preparation/decision-request-01-are-set-pieces-in-scope.md)
  is still open; this effort should either consume its answer or rule set pieces out.
- **Captain and other per-match designations** (penalty taker, playmaker, target man), if ticket 03
  finds CM 03/04 stored them on the tactic.
- **Opposition instructions** (tight marking of a named opponent, tackling a named opponent), if
  CM 03/04 had them.
- **Tactic familiarity**, meaning whether a squad plays a new shape worse until it has trained on it.
  Only if research shows CM 03/04 modelled it; otherwise out of scope.
- **Scouting and reports.** The Team Scout Report predicts an opponent's shape from the old
  five-template vocabulary. It needs a successor once presets are fixed.
- **Match statistics and commentary** that make new instruction effects visible, after ticket 08.

## Out of scope

- **A spatial match engine.** Player coordinates, real movement arrows and a simulated offside
  line. A separate future effort; this one maps settings onto the three-phase engine.
- **Migrating existing saves.** Refused by the schema-version check, matching
  player-positional-model.
- **Football Manager Roles and duties.** Not CM 03/04. See the Agent Note linked from ticket 01.
- **The positional model itself** (player line and side ratings, the slot vocabulary, compact
  labels). Owned by player-positional-model.
