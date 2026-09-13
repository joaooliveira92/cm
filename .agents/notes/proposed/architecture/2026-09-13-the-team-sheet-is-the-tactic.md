# Agent Note: The team sheet is the Tactic, with two editors and several views

Status: proposed

## Problem

Four imported screens each describe choosing who starts and who is on the bench: Squad Selection (69),
Starting XI and Substitute Bench (82), Pre-Match Team Selection (89) and Match Day Team Sheet (92).
Whichever of Groups E, F and G reconciled first would have settled ownership by accident, and three
efforts could have built three editors over one value.

## Proposal

**The team sheet is the Tactic.** The 11 slots name the starters, and the fixed-size match-day bench
(`Tactic.bench`, persisted in `tactic_bench_slots`) names the substitutes. There is one value,
`ChangeTactics` is its only write, and Expected Revision and Request Id guard it.

**Two editors, both already writing that value:**
- the **Squad screen's match-day bar** (`renderer/squad/lineupEdits.ts`, pure over a `Tactic`), for
  dragging players from the roster into the lineup;
- the **tactics editor**, for setting formation, roles and personnel together.

Neither is subordinate. They are two presentations of one command, and they must stay behaviourally
identical: the same validation, the same conflict handling, and the same readiness blockers.

**Everything else is a view:**
- **82 Starting XI and Substitute Bench** is the tactics editor's slot and bench assignment. No
  separate screen.
- **89 Pre-Match Team Selection** is a read-only view of the Tactic at the Pre-match Boundary, with
  links into either editor to change it.
- **92 Match Day Team Sheet** is a read-only view during Match day. In-match changes are
  substitutions and mid-match `ChangeTactics`, which Group G owns.
- **69 Squad Selection** is the Squad screen's lineup mode, meaning the match-day bar above.

## Alternatives considered

- **Squad owns selection, tactics is read-only for personnel.** Cheaper, but it takes personnel out of
  the tactics board, where formation and role choices are made against the players filling them.
- **Tactics owns selection, Squad is a roster.** It would back out the match-day bar already built from
  `.scratch/squad-instructions.md`.
- **A separate team-sheet value per Fixture.** It would duplicate the Tactic and need reconciling
  every Matchday. Nothing in the domain asks for a per-Fixture sheet.

## Acceptance criteria

- The Group E, F and G reconciliation ledgers cite this note on screens 69, 82, 89 and 92 rather than
  deciding ownership themselves.
- Screens 89 and 92, when built, write nothing: every change routes through one of the two editors.
- A test drives the same lineup change through both editors and asserts the same stored Tactic and the
  same refusal on an invalid lineup.

## Risks

- The two editors can drift. The shared pure module (`lineupEdits.ts`) and the parity test above are
  the guard.
- Uncommitted squad work in the tree was in progress when this was written, and its final shape may
  move the match-day bar. The ruling that it edits the Tactic rather than its own value still holds.
