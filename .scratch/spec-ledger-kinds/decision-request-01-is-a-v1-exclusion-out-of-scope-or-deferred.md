# Decision Request: is a recorded v1 exclusion `out-of-scope` or `deferred`?

## Question

`CONTEXT.md` line 753 excludes six systems from v1. When a reconciliation ledger disposes of a screen
resting on one of them, does that row take the kind `out-of-scope` or `deferred`?

It governs roughly twenty screens across five groups, and Group K cannot be charted without the answer.

## Why this is blocking

Raised by milestone [M1](../../.ai/MILESTONES.md) step 1, which gave Groups D, E, F, K, L and M durable
ledgers and found the same question unanswered in four of them.

The two kinds mean opposite things, and the [Group A
ledger](../../docs/specs/group_a_application_shell_and_game_lifecycle_remaining/RECONCILIATION.md)
defines the difference as load-bearing:

| Kind | Meaning | Can it return? |
|---|---|---|
| `out-of-scope` | Ruled permanently outside this game. | **No.** |
| `deferred` | Wanted, in scope, not built. | Yes. |

An `out-of-scope` row is not re-read. So guessing wrong in that direction quietly converts "not in v1"
into "never", for twenty screens, without anyone deciding it. Guessing wrong the other way is cheap:
a `deferred` row that should have been `out-of-scope` costs one edit.

**Group K is blocked.** Its board-relations screens (149, 150, 160) cannot be reconciled without this,
and it is the one group in the sweep with no rulings at all.

## What is already settled

Do not reopen these:

- **The v1 exclusion itself.** `CONTEXT.md:753` — "It does not govern player contracts, wage
  negotiation, promised playing time, dressing-room relationships, media handling, or board relations —
  none of those systems ship in v1." This request does **not** ask whether these systems ship. They do
  not.
- **Group M stays out of v1.** Its ticket 02 settled that against the option of overturning
  `CONTEXT.md`, and its reasoning stands: reopening media would be a programme, not a group.
- **Another decision already rests on the exclusion.** `CONTEXT.md:445–447` gives the absence of press
  content as the reason the **Calendar** needs no finer clock than "jump to the next scheduled event".
- **Absence of a model alone is `deferred`.** Established twice by M1 step 1 —
  [national teams](../../.agents/notes/implemented/architecture/2026-09-13-national-teams-deferred-not-ruled-out.md)
  and [per-player statistics](../../.agents/notes/proposed/architecture/2026-09-19-per-player-statistics-deferred-not-ruled-out.md).
  This request is the harder neighbouring case: a *recorded decision* to exclude, rather than a mere
  absence.

## What is affected

| Screens | Group | Rests on | Kind today |
|---|---|---|---|
| 181–193 (13) | M | media handling | `deferred`, provisional |
| 58 Happiness, 60 Discipline | D | dressing-room relationships | `out-of-scope` |
| 78 Grievance, 79 Team Meeting | E | dressing-room relationships | `out-of-scope` |
| 137–140 contract and wage negotiation | J | wage negotiation, promised playing time | unreconciled |
| 149, 150, 160 board screens | K | board relations | unreconciled — **blocked** |

The ledgers are currently inconsistent: Group M's thirteen are provisionally `deferred` while Group D's
and Group E's four are `out-of-scope`, for exclusions in the same sentence of the same file.

## Options

### Option A — A v1 exclusion is `deferred`, anchored `unscheduled`

- **What it asserts**: these systems are wanted and unbuilt. v1 is a version, not the game's final
  shape, and `CONTEXT.md` says "v1" deliberately.
- **What it costs**: re-kinding four rows in Groups D and E. Group M's stay as written.
- **What it forecloses**: nothing. Every affected row stays revisitable.
- **Risk**: twenty `deferred` rows imply a backlog that may never be worked, which can read as a
  commitment the project has not made.

### Option B — A v1 exclusion is `out-of-scope`

- **What it asserts**: v1 is the game. A system excluded from it is outside the project as scoped.
- **What it costs**: re-kinding Group M's thirteen rows, and Group K's and Group J's when charted.
- **What it forecloses**: a great deal, silently. Nobody re-reads an `out-of-scope` row, so morale,
  media, board relations and contract negotiation would leave the design's field of view permanently.
- **Risk**: the failure mode this whole class of finding is about. Three of M1's four corrections so
  far were exactly this error made accidentally; choosing it deliberately for twenty screens is a
  different matter, but the consequence is the same.

### Option C — A third kind, `excluded-from-v1`

- **What it asserts**: this case is genuinely neither — a deliberate ruling, scoped to a version.
- **What it costs**: a fifth kind in every ledger's How-to-read table, and the four existing ledgers
  updated. Cheap now, with six groups still unwritten; expensive later.
- **What it forecloses**: nothing.
- **Risk**: kind proliferation. Four kinds are currently enough to classify every row in six ledgers,
  and a fifth needs to earn itself.

## Recommendation

**Option A.** `CONTEXT.md` says "v1" and means it; that is the plainest reading, and it is the
reversible direction. Re-kinding Group D 58 and 60 and Group E 78 and 79 is four edits.

Option C is genuinely tempting and I would not argue hard against it — the case *is* distinguishable,
and an anchor of `v1 exclusion — CONTEXT.md:753` carries more than `unscheduled` does. But Option A
plus that anchor text captures the same information without a fifth kind, so the distinction can live
in the Anchor column where it costs nothing.

Option B should be rejected unless the intent really is that v1 is the whole game. If it is, that is
worth stating in `CONTEXT.md` directly rather than leaving twenty ledger rows to imply it.

## What is blocked, and what is not

- **Blocked**: charting Group K. Group M's rows are provisional but stable, and Group J's 137–140 will
  hit this when that group is next touched.
- **Proceeding meanwhile**: everything else. M1 step 1 has four groups left (G, H, I, J), none of which
  needs this answer to be transcribed.

---

## Answer — Option A, 2026-09-19

**`deferred`.** Approved by the human in one word, which is the whole answer.

Recorded as [a v1 exclusion is `deferred`, not `out-of-scope`](../../.agents/notes/proposed/process/2026-09-19-a-v1-exclusion-is-deferred-not-out-of-scope.md),
which amends the ledger-format note rather than sitting beside it: the four kinds were defined without
saying how to choose between two of them in the commonest case, and now they say.

The Anchor names the exclusion — `v1 exclusion — CONTEXT.md:753` — rather than a bare `unscheduled`,
so no fifth kind was added. `out-of-scope` is now reserved for a positive statement that the thing
should not exist in this game, with the closed **Bound Staff** / **Presence Staff** role set as the
model case.

**The completed rule**, across all three decisions this class produced:

> Absence of a model is `deferred`. A version boundary is `deferred`. Only a design statement that the
> thing should not exist is `out-of-scope`.

**Applied the same day**, in two passes with different authority:

- *This decision* — Group D 58, Group E 78 and 79 re-kinded; Group M's thirteen confirmed.
- *The already-approved absence rule* — Group D 53, 59, 60, 63 and Group E 73, 74, 76 and Screen 77's
  eligibility half, listed in the note so the sweep is traceable to one place.

Group D now reads 4 `out-of-scope`, 2 `renamed`, 10 `deferred`, 3 implemented. **No screen in Group E
is `out-of-scope` at all.**

Unblocked: charting Group K.
