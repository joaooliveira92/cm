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
  must not re-decide it. Since slots are grid cells, every preset waits on that ticket.
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
- [What team and player instructions CM 03/04 had](issues/03-cm-0304-team-and-player-instructions.md):
  no sliders; nine team instructions, player overrides of five of them plus crossing and
  distribution, seven normal/often flags, seven UI-only instruction templates; no tempo or width.
- [Inventory of Role consumers](issues/13-inventory-of-role-consumers.md): tactics domain and
  `tactic_slots.role`, the engine's ±0.05 fit bump, the tactics screens, and contract offers plus the
  `PlayerSigned` event, where the Role gives way to the Position it was derived from.
- [The Tactic domain model](issues/04-the-tactic-domain-model.md): slots are CM grid cells with an
  optional run; instructions per slot; presets and saved tactics are one Tactic Template type with no
  players; the Tactic is a template plus players, and `ChangeTactics` carries all of it.
- [The built-in formation preset set](issues/05-the-built-in-formation-preset-set.md): patch 4.1.3's
  29 presets with exact cells and runs; all wait on the grid; preferred formation references one.
- [The team instruction set](issues/06-the-team-instruction-set.md): CM's nine team instructions
  replace the three sliders; Tactical Styles removed.
- [The saved tactic library](issues/10-the-saved-tactic-library.md): in the save, manager-owned;
  quick load keeps players by slot number; read-only built-ins.
- [Player instructions, and what replaces Role Rating](issues/07-player-instructions-and-what-replaces-role-rating.md):
  CM's per-player screen stored per slot; specific marking match-time only; CM's instruction templates
  seed only the non-override instructions; no fit rating, effects read attributes.
- [Transcribe CM's seven player-instruction templates](issues/14-transcribe-cm-instruction-templates.md):
  values decoded from `tactical_templates.xml` (4.1.4 byte-identical); every template sets Passing,
  Tackling and Mentality explicitly, so ticket 07 seeds only the non-override instructions.
- [How each tactical setting acts on the three-phase engine](issues/08-mapping-tactics-onto-the-three-phase-engine.md):
  a chance pipeline, Foul and Offside events, per-slot behaviour vectors resolved outside the engine,
  a suitability cost, runs counted in possession, tuning proved by tests and calibration.
- [Team instruction effects](issues/15-team-instruction-effects.md): approved direction-and-size
  table for the nine team instructions.
- [Player instruction effects](issues/16-player-instruction-effects.md): approved table; "normal" is
  baseline, "often" roughly doubles the behaviour.
- [When a live tactical change takes effect](issues/09-the-live-tactical-change-boundary.md): the
  existing M+1 / half-time boundary, validated on submit, substitutions first.
- [AI tactic selection and in-match adjustment](issues/11-ai-tactic-selection-and-in-match-adjustment.md):
  seeded CM preferences, a deterministic rule table, a controller outside the engine.
- [Formation, run and suitability effects](issues/17-formation-run-and-suitability-effects.md):
  coverage-scaled Phase Strength, runs in possession, the suitability curve, new stats and commentary.
- [The set-piece model](issues/18-the-set-piece-model.md): instructions and roles in templates,
  captain and takers on the live Tactic, used by the engine through set-piece events.

## Not yet specified

<!-- Set pieces and the captain graduated to ticket 18 on 2026-09-29; tactic familiarity ruled out of scope. -->

## Out of scope

- **A spatial match engine.** Player coordinates, real movement arrows and a simulated offside
  line. A separate future effort; this one maps settings onto the three-phase engine.
- **Migrating existing saves.** Refused by the schema-version check, matching
  player-positional-model.
- **Football Manager Roles and duties.** Not CM 03/04. See the Agent Note linked from ticket 01.
- **The positional model itself** (player line and side ratings, the slot vocabulary, compact
  labels). Owned by player-positional-model.
- **CM 03/04's full attribute set** (Long Shots, Off The Ball, Marking, Anticipation, Creativity,
  Versatility, Work Rate). A separate effort: it reaches generation, development, ratings, scouting
  and every player screen. This effort maps instructions onto the closest existing attributes in one
  swappable table ([ticket 08](issues/08-mapping-tactics-onto-the-three-phase-engine.md)).
- **Tactic familiarity** (a squad playing a new shape worse until trained on it). The CM 03/04
  research found no sign of it, and the map ruled it in only if research showed it.
