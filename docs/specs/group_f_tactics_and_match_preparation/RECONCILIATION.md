# Group F reconciliation ledger

The specs in this directory are an **import**, not a set of requirements. They read as generated from a
generic template rather than authored against this game, and they routinely describe subsystems this
project has never decided to build. This ledger records, per screen, every place the import is
knowingly not followed, and why.

It is an index, not a store. A row states the divergence in one line and points at the decision that
carries it. The import files are never edited. Their value is that you can always see what arrived.

The format is the one the
[Group A ledger](../group_a_application_shell_and_game_lifecycle_remaining/RECONCILIATION.md) pilots,
with the same four kinds — `out-of-scope`, `contradicted`, `deferred`, `renamed` — and the same status
vocabulary.

## This ledger covers Screen 80 alone

Created 2026-09-18 as milestone [M1](../../../.ai/MILESTONES.md) step 1. Group F is the one group in
that sweep with **almost nothing to transcribe**, and saying so is the ledger's main job.

The `group-f-tactics-and-match-preparation` effort shipped three tickets, all of them Screen 80, and
wrote no map and no spec. **Screens 81–90 have never been read by anyone.** Silence about them below
means unreconciled — not "nothing to reconcile". The coverage table is where that becomes visible,
and it is the reason this file exists despite having only one screen's worth of rows.

Unlike the [Group D](../group_d_player_and_staff_records/RECONCILIATION.md) and
[Group E](../group_e_squad_management/RECONCILIATION.md) ledgers, this one transcribes no disposals.
Group F has made none.

## What each status asserts

| Status | What silence about a section asserts |
|---|---|
| `Reviewed` | Nothing. The rows are the material conflicts a pass found; unlisted sections were not individually checked. |
| `Not yet audited` | Nothing. Nobody has read the file. |

## Coverage

| Screen | Import file | Status |
|---|---|---|
| 80 Tactics Overview | [80_tactics_overview.md](80_tactics_overview.md) | Reviewed — implemented 2026-09-06 |
| 81 Formation Editor | [81_formation_editor.md](81_formation_editor.md) | Not yet audited |
| 82 Starting XI and Substitute Bench | [82_starting_xi_and_substitute_bench.md](82_starting_xi_and_substitute_bench.md) | Not yet audited |
| 83 Team Instructions | [83_team_instructions.md](83_team_instructions.md) | Not yet audited |
| 84 Individual Player Instructions | [84_individual_player_instructions.md](84_individual_player_instructions.md) | Not yet audited |
| 85 Player Position Assignment | [85_player_position_assignment.md](85_player_position_assignment.md) | Not yet audited |
| 86 Set Pieces | [86_set_pieces.md](86_set_pieces.md) | Not yet audited — in scope, decision settled |
| 87 Saved Tactics | [87_saved_tactics.md](87_saved_tactics.md) | Not yet audited |
| 88 Load and Import Tactic | [88_load_and_import_tactic.md](88_load_and_import_tactic.md) | Not yet audited |
| 89 Pre-Match Team Selection | [89_pre_match_team_selection.md](89_pre_match_team_selection.md) | Not yet audited |
| 90 Opposition Scout Report | [90_opposition_scout_report.md](90_opposition_scout_report.md) | Not yet audited |

Ticket references below are deliberately unlinked: they live under `.scratch/`, which is cleared when
an effort is archived, and this ledger outlives the effort that produced it.

## Screen 80: Tactics Overview

Status: **Reviewed**, implemented by group-f tickets 01–03 (2026-09-06). Three tickets, in order: the
tactic save became revision-bound and idempotent, a per-revision snapshot read was added, and the
Tactics landing became the read-only overview that renders it.

**The implementation followed this screen's import unusually closely** — closely enough to be worth
recording, because it is not how the rest of this corpus has gone. Ticket 01 built to the import's
"stable IDs and expected revisions" requirement; ticket 03 implements the import's view-state
vocabulary as distinct observable states (`loading`, `ready`, `modified`, `validating`, `submitting`,
`completed`, `conflicted`, `permission-limited`, `failed`) and its accessibility section as written —
keyboard and screen-reader completion with no drag-only interaction, slots exposed as lists or grids,
warnings associated with their controls, no colour-only state, 200% text scaling and RTL.

The status is nonetheless `Reviewed`, not `Audited`. No section-by-section pass was recorded, and
building to several named sections is not the same as having checked them all.

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| Set-piece status | `deferred` | The overview summarises the club's configured set pieces. | The panel ships and can only read *"No set pieces configured"*. `SetPieceStatusView` is hard-coded to `status: "none"`, and the **Tactic** carries no set-piece fields. `packages/contracts/src/schemas/tactics.ts:204` records the intent as "until Screen 86 lands". | Screen 86. Settled 2026-09-19 — [set pieces ship, as a Tactic field](../../../.agents/notes/proposed/feature/2026-09-19-set-pieces-ship-as-a-tactic-field.md). The panel is waiting on a value, not on a ruling. |
| Selection summary | `renamed` | An explicit starters-and-bench selection model the screen reads. | Starters are exactly the players named in the active tactic's slots; substitutes are the registered players not named. Selection stays distinct from squad membership rather than being modelled separately. | [Human fixture pre-match boundary](../../../.agents/notes/implemented/architecture/2026-08-29-human-fixture-pre-match-boundary.md). An explicit model is Screen 89's, and ticket 02 records the mapping rather than inventing one. |
| Familiarity summary | `deferred` | Familiarity across formation, instructions and position. | Derived, never assigned: the v1 summary reads each named starter's position-familiarity tier plus the tactic's own usage. Formation- and instruction-level familiarity are not computed. | The training domain — [training focus squad column](../../../.agents/notes/proposed/feature/2026-08-29-training-focus-squad-column.md). Group H owns the deferral. |
| Permission-limited state | `renamed` | A permission context that limits what the screen may show. | The archived-presentation refusal mapped onto the existing saved-state guard. No permission system was added, because there is one human manager per **Save**. | The multiplayer axis, disposed in the [Group B ledger](../group_b_global_navigation_and_inbox/RECONCILIATION.md). Ticket 03. |

Three further decisions shape the screen without diverging from the import, and are recorded here so a
later audit does not re-derive them: position and role ratings are computed at the trusted boundary and
never in the renderer
([note](../../../.agents/notes/implemented/architecture/2026-08-27-role-rating-outside-match-engine.md));
a stale expected revision is refused with a typed conflict naming the current one rather than silently
overwritten
([note](../../../.agents/notes/implemented/architecture/2026-08-29-tagged-domain-errors.md)); and the
issues list reports blockers and advisories together, each carrying the screen that owns its fix, so
resolving one never unmasks a second
([note](../../../.agents/notes/implemented/architecture/2026-09-03-the-first-pending-decision.md)).

## Screens 81–90: what is known without having read them

None of these has been audited. What follows is **not** a set of rulings — it is the small amount
already known from elsewhere, recorded so that whoever charts this group does not start from nothing.
Every line below is a question to settle, not an answer.

- **86 Set Pieces is in scope, and the question it raised is answered.** Group E had ruled Screen 75
  Set Piece Takers `out-of-scope` while the shipped contract and Tactics Overview both promised set
  pieces arrive here. Settled 2026-09-19 by group-f decision request 01: set pieces ship as **Tactic**
  fields, Screen 75 is `deferred` to this screen, and nomination inherits ticket 01's revision-bound
  idempotent save rather than adding a write path. Whether the match engine *uses* a nomination is
  deliberately still open. See
  [set pieces ship, as a Tactic field](../../../.agents/notes/proposed/feature/2026-09-19-set-pieces-ship-as-a-tactic-field.md).
- **82 and 89 are the same object as Screen 69.** Under
  [the team sheet is the Tactic](../../../.agents/notes/proposed/architecture/2026-09-13-the-team-sheet-is-the-tactic.md),
  Squad's match-day bar and the tactics editor are two editors of one thing, and 89 and 92 are views
  of it. Expect these to reconcile as `renamed` rather than as new surfaces.
- **89 already has a partial implementation it did not ask for.** Ticket 02 assigned the
  starters-and-substitutes mapping to Screen 89 and shipped the derivation without the screen.
- **88 Load and Import Tactic overlaps Group S Screen 276** (Import, Export and Sharing Utilities).
  Whichever group is charted second inherits the other's ruling.
- **90 Opposition Scout Report likely reuses Team Scout Report**, which shipped in full as
  [Group C Screen 49](../group_c_club_information/49_team_scout_report.md).
- **81, 83, 84, 85 and 87 have a live editor behind them.** The tactics editor ships with formation,
  the three team-instruction values and player assignment, and its save is revision-bound and
  idempotent (ticket 01). Individual player instructions (84) and saved tactics (87) have no known
  counterpart.

## What this ledger leaves owed

- **Group F's remainder is unreconciled, and no longer blocked.** Decision request 01 was answered on
  2026-09-19, so charting may proceed.
- **No effort exists to chart it.** `group-f-tactics-and-match-preparation` shipped Screen 80 with no
  map and no spec, against the path [SPEC-ROADMAP](../../../.ai/SPEC-ROADMAP.md) § Starting a group
  lays out. A group-F reconciliation effort has to be chartered from scratch, and that is a human's
  call.
