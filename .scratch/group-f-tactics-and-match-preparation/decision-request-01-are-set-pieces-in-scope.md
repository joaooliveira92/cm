# Decision Request: are set pieces in scope, and if so does Screen 75 return?

## Question

Group E ruled Screen 75 Set Piece Takers `out-of-scope`. Shipped code in two places says set pieces
arrive with Group F Screen 86. Which is right — do set pieces ship, and if they do, is Screen 75
`deferred` to Screen 86 rather than out of scope?

## Why this is blocking

Not a stop condition on a running sprint; raised by milestone
[M1](../../.ai/MILESTONES.md) step 1 while transcribing the
[Group E ledger](../../docs/specs/group_e_squad_management/RECONCILIATION.md). It blocks nothing today
and blocks Group F's remainder the moment that group is charted, because Screen 86 cannot be
scoped while the group next door has ruled its other half out.

What breaks if it is guessed wrong, in each direction:

- **Guess "out of scope"** and the shipped Tactics Overview keeps a panel that can only ever read
  *"No set pieces configured"*, promising a screen that will never land. A dead panel and a comment
  naming a dead ticket is exactly the placeholder confusion M1 exists to end.
- **Guess "in scope"** and Group E's ledger carries a ruling its own effort did not make, on a
  feature nobody has costed.

## What is already settled

Do not reopen these:

- **The contract already anticipates Screen 86.**
  `packages/contracts/src/schemas/tactics.ts:204` carries the comment *"No set pieces configured until
  Screen 86 lands."*
- **The shipped screen renders the empty state.**
  `apps/desktop/src/renderer/tactics/TacticsOverviewScreen.tsx:365` branches on
  `view.setPieces.status === "none"` and renders *"No set pieces configured."* Screen 80 shipped this
  way deliberately, per the `group-f-tactics-and-match-preparation` effort.
- **Group E's survey found no model.** `SetPieceStatusView` is hard-coded to `status: "none"` and the
  **Tactic** carries no set-piece fields. Group E ticket 01 ruled Screen 75 `out-of-scope` on that
  basis. The finding is correct; only the disposition is in question.
- **[SPEC-ROADMAP.md](../../.ai/SPEC-ROADMAP.md)** lists Screen 86 in Group F's remainder and quotes
  the Screen 80 snapshot's own promise about it.
- **The team sheet is the Tactic** —
  [note](../../.agents/notes/proposed/architecture/2026-09-13-the-team-sheet-is-the-tactic.md). If set
  pieces are a Tactic field, taker nomination is an edit to the same object Squad's match-day bar and
  the tactics editor already edit, not a new one.

## Options

### Option A — Set pieces ship; Screen 75 is `deferred` to Screen 86

- **What the player experiences**: nominates takers for corners, free kicks and penalties once; the
  choice persists on the Tactic and shows on the Tactics Overview panel that is empty today.
- **What it costs to build**: set-piece fields on the Tactic, a revision bump like any other tactical
  edit, the taker UI, and a decision about whether the match engine uses the nomination or merely
  records it. The engine half is the unknown and may be the larger cost.
- **What it forecloses**: nothing. It is additive.
- **Save compatibility**: a schema addition with a migration; existing Saves read as "none", which is
  the state they already render.

### Option B — Set pieces do not ship; Screen 75 stays `out-of-scope` and Screen 80 loses its panel

- **What the player experiences**: nothing about set pieces, anywhere. The Tactics Overview has one
  fewer panel rather than a permanently empty one.
- **What it costs to build**: a deletion — the panel, the `SetPieceStatusView` branch, and the
  contract comment. Cheap.
- **What it forecloses**: set pieces as a tactical axis, unless the ruling is later overturned. Worth
  weighing against a football game's usual expectations.
- **Save compatibility**: no schema change. `SetPieceStatusView` leaves the wire.

### Option C — Defer the question, keep both as they are

- **What the player experiences**: an empty panel indefinitely.
- **What it costs to build**: nothing now.
- **What it forecloses**: nothing, but it leaves the Group E ledger holding a row its own effort
  did not make and leaves Screen 86 unscopable. This is the status quo, and it is the option that
  produced the conflict.

## Recommendation

**Option A.** The engine question is genuinely open, but the cheap half is worth doing on its own: a
nominated taker that the engine records and the Overview displays is a real tactical surface, and
whether the engine *uses* it is a separate, smaller decision that can be taken later without
revisiting this one.

Option B is defensible and should be picked if set pieces are genuinely not wanted — but it should
then be picked *explicitly*, with the panel and the contract comment deleted in the same change.
Leaving them is Option C, which is the failure mode.

If Option A is chosen, the Group E ledger's Screen 75 row moves from `out-of-scope` to `deferred`,
anchored to Group F Screen 86, in the same commit.

## What is blocked, and what is not

- **Blocked**: Group F Screen 86, and any charting of Group F's remainder. The Group E ledger's
  Screen 75 row is provisional until this is answered.
- **Proceeding meanwhile**: everything else. Group E's other ten screens are settled, M1 step 1
  continues with the remaining eight groups, and the Tactics Overview works as shipped.

---

## Answer — Option A, 2026-09-19

**Set pieces are in scope. Screen 75 is `deferred` to Group F Screen 86, not `out-of-scope`.**

Approved by the human ("approve your recommendations on the blocking decisions"). Recorded as
[set pieces ship, as a Tactic field](../../.agents/notes/proposed/feature/2026-09-19-set-pieces-ship-as-a-tactic-field.md).

Set-piece takers become fields on the **Tactic**, so nomination inherits the revision-bound idempotent
save from ticket 01 rather than adding a write path, and the takers UI is another editor of the object
the team-sheet note already governs. Screen 80's panel stops being dead — it reads the same snapshot,
with a value other than a hard-coded `"none"`.

**Left open deliberately:** whether the match engine *uses* a nomination. The display half stands on
its own; the engine half is a smaller decision that can be taken later without revisiting this one.

Unblocked: Group F's remainder may be charted. Still needed before Screen 86 builds: a schema addition
and migration, with existing Saves reading `"none"` — the state they already render.
