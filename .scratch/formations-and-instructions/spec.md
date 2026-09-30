# Spec: CM 03/04 formations, instructions and the Tactics screen

Status: ready-for-agent

> Synthesized by `cm-to-spec` from the resolved [formations-and-instructions map](map.md) (tickets
> 01-19) and the conversation of 2026-09-29/30. Decisions that produced a proposed Agent Note end with
> that ticket's gist and link. The slot vocabulary, suitability and label come from the sibling
> [player-positional-model spec](../player-positional-model/spec.md), which ships first.

## Problem Statement

A Tactic is an MVP: five formation templates of ten Positions, one Football Manager-style Role per
slot, and three three-state sliders (Mentality, Tempo, Pressing). Championship Manager 03/04, the game
this clones, shipped 29 formation presets on a grid of 31 cells with run arrows, nine team
instructions, fifteen per-player instructions, set-piece instructions, roles and taker priorities,
and a library of saved tactics, and let the manager change any of it during a match. The match engine
gives most tactical choices nothing to act on: its outcomes are fixed shares and its shooter is picked
at random. AI clubs pick among five shapes and never change anything mid-match. The Tactics screen
shows none of CM's model.

## Solution

A Tactic becomes CM 03/04's: a formation of eleven grid cells with optional runs, per-slot player
instructions and set-piece roles, nine team instructions and team set-piece instructions, taker lists
and a captain, plus the players assigned to it and the bench. Built-in presets and the manager's saved
tactics are one kind of Tactic Template. Roles, Tempo, Pressing and Tactical Styles go. The match
engine gains a chance pipeline, fouls, offsides and set pieces, fed by a resolution step that turns
the Tactic into numbers, so every setting has a real, tested effect without a spatial engine. AI clubs
play complete tactics from seeded CM preferences and adjust them during matches. The Tactics screen
follows CM 03/04's own layout, in and out of matches.

## User Stories

1. As a manager, I want CM 03/04's 29 formation presets, so that I can start from the shapes I know.
2. As a manager, I want to place players in any of 31 cells (goalkeeper, sweeper, three central and
   two wide columns in each row), so that I can build shapes presets do not cover.
3. As a manager, I want to give a player a run to another cell, so that a winger can push up when we
   have the ball.
4. As a manager, I want the Tactic named after the template it came from, marked "(modified)" once I
   change it, with its row-count shape beside it, so that I know what I am playing.
5. As a manager, I want CM's nine team instructions (passing, focus passing, tackling, closing down,
   mentality, offside trap, zonal marking, counter attack, men behind the ball), so that I set the
   team's style the way CM did.
6. As a manager, I want each unticked instruction to show what applies instead, so that nothing on
   the screen reads as blank.
7. As a manager, I want per-player overrides of passing, closing down, tackling, marking and
   mentality, so that one player can do something different from the team.
8. As a manager, I want crossing and goalkeeper distribution instructions, so that wide players and
   the keeper act as I choose.
9. As a manager, I want the seven "more often" switches (cross ball, long shots, forward runs, run
   with ball, try through balls, free role, hold up ball), so that I shape a player's game.
10. As a manager, I want CM's seven instruction templates as a Set To Preset shortcut, so that I can
    set a player's instructions in one go.
11. As a manager, I want built-in presets to come with sensible per-slot instructions that still
    follow my team instructions, so that changing team mentality affects the whole side.
12. As a manager, I want to mark a specific opponent in a match, so that his best player is shadowed.
13. As a manager, I want team set-piece instructions per side and set-piece roles per slot, so that
    corners, free kicks and throw-ins are planned.
14. As a manager, I want ordered lists for captain and penalty, free-kick, corner and throw-in takers,
    so that the next nominee steps up when the first is off the pitch.
15. As a manager, I want to save, rename, overwrite, duplicate, delete and quick-load my own tactics,
    so that I keep a home shape, an away shape and a chasing shape.
16. As a manager, I want quick load to keep my players in their slot numbers, so that loading a shape
    does not scramble my team.
17. As a manager, I want to change formation, positions and every instruction during a match, taking
    effect at the next minute, so that I can react to the game.
18. As a manager, I want every setting to change what happens in a match, so that tactics matter.
19. As a manager, I want playing someone out of position to cost, so that selection matters.
20. As a manager, I want to see fouls, offsides, possession and shots by type in match statistics and
    commentary, so that I can see my tactics working.
21. As a manager, I want AI clubs to set up differently from each other and to change tactics when
    chasing or protecting a result, so that opponents feel like managed teams.
22. As a manager, I want AI opponents to know only what I could know about them, so that the AI does
    not cheat.
23. As a manager, I want the Tactics screen to look and work like CM 03/04's, so that it feels like
    the game I know.
24. As a manager, I want every drag-and-drop action to have a keyboard equivalent, so that I can play
    without a mouse.
25. As a manager starting a career, I want to choose a preferred formation from the 29, so that my
    first Tactic is mine.
26. As a player of an older save, I want the game to refuse it clearly, so that nothing breaks
    mid-career.
27. As a developer, I want the match engine to stay free of tactics vocabulary and deterministic under
    its seed, so that it is testable and replays are exact.

## Implementation Decisions

- **Scope and sources.** This effort owns presets, team and player instructions, live changes, the
  library, AI tactics, the Tactics screen and persistence of complete Tactics; CM 03/04 as shipped is
  the source of truth; the engine stays non-spatial. **Sibling effort; CM 03/04 as shipped is the
  source; Roles are removed; the engine stays non-spatial; complete Tactics change live; a named
  tactic library; AI runs complete Tactics; old saves are refused.** See
  [Agent Note](../../.agents/notes/proposed/architecture/2026-09-29-roles-give-way-to-cm-player-instructions.md).
- **Domain model.** Slots are the positional spec's grid cells; a slot may carry a run; instructions
  and set-piece roles belong to the slot; a Tactic Template holds no players; the Tactic adds
  assignments, bench, taker lists and captain. **A slot is a CM grid cell with an optional run target;
  Player Instructions belong to the slot; built-in presets and saved tactics are one Tactic Template
  type with no players; the live Tactic is a template's contents plus assignments and bench, named by
  its source template, with "modified" and the row-count label derived; `ChangeTactics` carries the
  complete Tactic.** See
  [Agent Note](../../.agents/notes/proposed/architecture/2026-09-29-tactic-templates-and-grid-cell-slots.md).
- **Built-in presets.** The 29 presets of CM 03/04 patch 4.1.3 onward, cells and runs exactly as in the
  shipped files (tables in the formations research), names as the file names;
  `manager_profile.preferred_formation` references one of them and a new manager's first Tactic loads
  it.
- **Team instructions.** **CM 03/04's nine team instructions, each defaulting to the game's unticked
  state, replace Mentality/Tempo/Pressing; Tactical Style presets are removed and the preferred
  formation is the manager's tactical identity.** See
  [Agent Note](../../.agents/notes/proposed/feature/2026-09-29-cm-team-instructions-replace-sliders-and-styles.md).
- **Player instructions.** **CM 03/04's per-player screen exactly (five overrides with a `team` value,
  three standalone settings, seven normal/often switches), stored per slot; Distribution on the GK
  slot only; specific marking is match-time only; built-in templates seed each slot from CM's
  instruction template for its cell for the non-override instructions only, leaving the five overrides
  at `team`; no fit rating replaces Role Rating, and effects read the executing player's
  attributes.** See
  [Agent Note](../../.agents/notes/proposed/feature/2026-09-29-cm-player-instructions-per-slot-without-a-fit-rating.md).
- **Instruction template values.** The seven CM templates' values are the table transcribed in ticket
  14 from `tactical_templates.xml`; 0 means `team` on overrides, `default` on standalone settings.
- **Roles removed.** Roles, Role Weights and Role Rating leave the domain, contracts, storage, UI and
  engine; every consumer named in ticket 13's inventory gets its stated successor.
- **Engine framework.** **A chance pipeline inside the three-phase engine (possession, attempt, chance
  type, weighted creator and finisher, attribute-based outcome), new Foul and Offside events, a
  resolution step that turns the Tactic into team modifiers and per-slot behaviour vectors the engine
  consumes as numbers, a suitability cost that scales decision-making and positional attributes, runs
  that count in the target cell in possession, closest-attribute mappings, and a tuning table proved
  by directional tests and a calibration harness.** See
  [Agent Note](../../.agents/notes/proposed/architecture/2026-09-29-tactics-resolve-to-behaviour-vectors-for-a-chance-pipeline.md).
- **Team instruction effects.** The approved direction-and-size table in ticket 15.
- **Player instruction effects.** The approved table in ticket 16; "normal" is the engine's baseline
  and "often" roughly doubles that behaviour's weight.
- **Formation, run and suitability effects.** **Phase Strength = average × coverage factor (normal
  4/4/2, diminishing returns), plus width coverage for crosses; runs count fully in the target row in
  possession; the suitability factor falls gently to about 0.9 at 15 and steeply below; new match
  stats (fouls, offsides, possession, shots by chance type) and commentary templates (foul, offside,
  beaten trap, chance types, AI tactical and formation changes) on the match and post-match
  screens.** See
  [Agent Note](../../.agents/notes/proposed/architecture/2026-09-29-phase-strength-scales-with-coverage.md).
  The suitability curve is the one the positional work already ships as `suitabilityFactor`.
- **Live changes.** The complete Tactic applies at the start of the first unseen minute (M+1), or at
  the break for a half-time change, validated on submit against the revealed pitch; substitutions at
  the same boundary apply first. Replaying seed and journal reproduces the match.
- **Library.** **In the save, owned by the manager; quick load keeps players by slot number and leaves
  the bench; create/rename/overwrite/duplicate/delete with read-only built-ins, unique
  case-insensitive names, no cap, Request Id on every operation and Expected Revision on
  overwrite/rename/delete.** See
  [Agent Note](../../.agents/notes/proposed/feature/2026-09-29-tactic-library-in-the-save-reseats-by-slot.md).
- **AI tactics.** **Seeded CM staff preferences per AI club; a preferred template with a best-XI
  fallback and style-mapped instructions before kickoff; a deterministic in-match rule table by score,
  minute and red cards; all run by a tactical controller outside the engine and journaled as
  `ChangeTactics` for the human's opponent.** See
  [Agent Note](../../.agents/notes/proposed/architecture/2026-09-29-ai-tactics-from-seeded-preferences-via-a-controller.md).
- **Set pieces.** **Team set-piece instructions and per-slot set-piece roles live in the Tactic
  Template; the captain and ordered taker lists live only on the live Tactic; the engine uses them
  through Corner, Free Kick and Penalty events and long throws in the chance pipeline; absent nominees
  fall back down the list, then to the best relevant attribute; the captain has no match effect.** See
  [Agent Note](../../.agents/notes/proposed/feature/2026-09-29-cm-set-pieces-in-templates-takers-on-the-tactic.md).
  As amended by ticket 19: every set-piece setting has a `default`; the roles are CM's five (attack
  and defend for free kicks and corners, attacking throw-ins per side) with the transcribed values;
  attacking-third throw-ins resolve without a visible event so every throw-in setting has an effect.
- **Tactics screen.** **The Tactics screen follows CM 03/04's own layout (prototype variant A): File
  and View menus, Set Positions / Set Instructions / Set Priorities modes, a Team Selection list
  always on the left, CM's tick-box-plus-dropdown instruction rows, and the same screen in match with
  Confirm, Undo Last and Cancel.** See
  [Agent Note](../../.agents/notes/proposed/feature/2026-09-30-tactics-screen-follows-cm-0304-layout.md).
  The approved prototype is on branch `prototype/tactics-screen`.
- **Storage.** `tactics` stores team instructions and team set-piece instructions; `tactic_slots`
  stores row, column, run row and column, the per-slot instructions and set-piece roles; taker lists
  and captain get their own ordered table; the library gets its own tables. The `Position` type and
  the positional spec's transitional Position-to-cell mapping are deleted here. The DDL change refuses
  older saves through the schema version.
- **Contracts.** `ChangeTactics` carries the complete Tactic; tactics views carry cells, runs,
  instructions, set-piece settings, takers and fit; no contract carries tactics vocabulary into the
  engine package.
- **Glossary.** `CONTEXT.md` gains Tactic Template, Formation (as the arrangement of slots and runs),
  Run, Team Instruction (rewritten), Player Instruction, Set-Piece Role and Taker List; loses Role,
  Role Weights and Role Rating; Tactic and Team Instructions are rewritten; all in the same changes as
  the code.

## Testing Decisions

- **Good tests** assert behaviour through a public seam: a Tactic in, a validation result or resolved
  numbers out; a seeded match in, event counts out; a command in, a stored and re-read state out. None
  reaches into internals.
- **Seam 1, the shared tactics rules.** Tactic and Tactic Template types and validation; the 29
  presets (each preset's cells and runs against the research tables); row-count labels and
  "modified"; instruction value sets and defaults, including the transcribed templates and the
  seeding rule; resolution from a Tactic to team modifiers and per-slot behaviour vectors; the AI's
  pre-match choice and in-match rule table. Prior art: the shared rules tests.
- **Seam 2, the match engine.** A directional test per setting over many seeded matches (for example
  Tackling hard raises fouls and cards; Long Shots often raises long-shot chances); determinism under
  the seed; coverage and suitability effects. The calibration harness (league averages: goals
  2.5-2.8, yellow cards 3-4, fouls 20-26, set-piece goals a quarter to a third) runs as its own script
  gate, not in the unit suite. Prior art: the engine's seeded match tests.
- **Seam 3, the main process on a seeded save.** `ChangeTactics` full replacement with revision and
  idempotency; library operations; live changes at M+1; set-piece taker fallback and captain
  handover; the AI's journaled changes for the human's opponent; an older save refused. Prior art: the
  main club and match tests and the seeded-match helper. Seed-pinned match tests will need re-pinning
  as the engine changes; their enumeration method is recorded in their doc comments.
- **Seam 4, the Tactics screen.** Renderer tests for the approved layout: each mode, the tick-box rows
  and their unticked text, substitute swaps, taker-list ordering, and keyboard equivalents for every
  drag. Prior art: the existing tactics renderer tests.

## Out of Scope

- A spatial match engine: coordinates, simulated movement and a simulated offside line.
- Migrating existing saves.
- Football Manager Roles, duties and touchline shouts.
- CM 03/04's missing attributes (Long Shots, Off The Ball, Marking, Anticipation, Creativity,
  Versatility, Work Rate); instructions read the closest existing attributes through one swappable
  table.
- Tactic familiarity.
- The player positional model itself (owned by player-positional-model).

## Further Notes

- **Sequencing.** The player-positional-model spec lands first; this spec's first slice replaces the
  Tactic's Position slots with cells and removes the transitional mapping. The engine framework
  (pipeline and resolution) precedes the per-setting effects; the Tactics screen can proceed in
  parallel against contracts once the domain model lands.
- **Research.** Facts rest on
  [the formations research](../../docs/research/formations-and-instructions-cm0304-formations-and-tactic-files.md)
  and [the instructions research](../../docs/research/formations-and-instructions-cm0304-team-and-player-instructions.md);
  effect sizes are tuning constants, not research findings.
- **Shared worktree.** Parallel sessions share the worktree and index; commit with
  `git commit --only -- <paths>`.
