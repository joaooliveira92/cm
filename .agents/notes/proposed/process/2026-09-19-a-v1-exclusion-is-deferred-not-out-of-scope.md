# Agent Note: A v1 exclusion is `deferred`, not `out-of-scope`

Status: proposed

Amends [spec reconciliation ledger](../../implemented/process/2026-08-30-spec-reconciliation-ledger.md),
which defines the four kinds but not how to choose between two of them in the commonest case.

## Problem

`CONTEXT.md:753` excludes six systems from v1:

> It does not govern player contracts, wage negotiation, promised playing time, dressing-room
> relationships, media handling, or board relations — none of those systems ship in v1.

Reconciliation ledgers dispose of roughly twenty screens on the strength of that one sentence, and they
did not agree on what kind those rows take. The ledger's own definitions make the disagreement
consequential:

| Kind | Meaning | Can it return? |
|---|---|---|
| `out-of-scope` | Ruled permanently outside this game. | **No.** |
| `deferred` | Wanted, in scope, not built. | Yes. |

By 2026-09-19 the corpus held both answers for exclusions in the same sentence of the same file: Group M's
thirteen media screens were `deferred`, while Group D 58 and 60 and Group E 78 and 79 were
`out-of-scope`. Nobody had decided; the ledgers had simply been written by different efforts.

An `out-of-scope` row is not re-read. So the inconsistency was not cosmetic — it silently converted
"not in v1" into "never" for whichever screens happened to be written by the effort that chose that
word.

## Decision

**A recorded v1 exclusion is `deferred`.** The Anchor names the exclusion — `v1 exclusion —
CONTEXT.md:753` — rather than the bare `unscheduled`, so a reader sees that the row rests on a
deliberate ruling and not on an oversight.

`out-of-scope` is reserved for a **positive statement that the thing should not exist in this game**,
not for the observation that it does not exist yet and not for a version boundary. The closed
**Bound Staff** / **Presence Staff** role set is the model: `CONTEXT.md` says what Staff *are*, so a
staff-hiring screen is `out-of-scope` — there is no version of this game in which that screen makes
sense.

This completes a rule the two preceding decisions had been circling:

> **Absence of a model is `deferred`. A version boundary is `deferred`. Only a design statement that
> the thing should not exist is `out-of-scope`.**

Approved by the human on 2026-09-19 ("deferred").

## Alternatives considered

**`out-of-scope`.** Coherent if v1 *is* the game — if there is no v2 planned, a v1 exclusion is a
permanent one. Rejected because `CONTEXT.md` says "v1" deliberately and repeatedly, and because the
cost of being wrong is asymmetric: an `out-of-scope` row that should have been `deferred` is never
re-read, while the reverse costs one edit. If v1 really is the whole game, that belongs in `CONTEXT.md`
as its own statement rather than being implied by twenty ledger rows.

**A fifth kind, `excluded-from-v1`.** Genuinely tempting, and the case *is* distinguishable — a
deliberate ruling scoped to a version is neither "never" nor "not yet". Rejected because the Anchor
column already carries that distinction at no cost, and four kinds have so far classified every row
across seven ledgers. A fifth kind has to earn itself against a case the Anchor cannot express.

**Decide it per group as each is charted.** Rejected: it is how the inconsistency arose.

## Consequences

Rows re-kinded `out-of-scope` → `deferred`, all anchored to the exclusion they rest on:

| Screens | Group | Rests on |
|---|---|---|
| 181–193 (13) | M | media handling — confirmed, previously provisional |
| 58 Player Happiness | D | dressing-room relationships |
| 78 Player Interaction and Grievance | E | dressing-room relationships |
| 79 Team Meeting and Discipline Decision | E | dressing-room relationships |

**Group K is unblocked** — its board-relations screens (149, 150, 160) now have a kind to take, and
Groups J 137–140 inherit the same when charted.

**A consistency sweep follows from the general rule**, covering rows that rest on absence of a model
rather than on the v1 exclusion: Group D 53, 59, 60 and 63, and Group E 73, 74, 76 and 77's eligibility
half. These move under the rule already recorded in
[per-player statistics are deferred, not ruled out](../architecture/2026-09-19-per-player-statistics-deferred-not-ruled-out.md),
not under this decision, and are listed here so the sweep is traceable to one place.

**What stays `out-of-scope`**, because a design statement — not an absence — puts it there: Group D
64, 65 and 66 (Staff Profile, Contract, History) and Group E's multiplayer inheritances. Group D 67
Coach Report is the weakest survivor: "no counterpart exists, and none is planned" is close to an
absence, and it should be re-read if a Coach ever produces anything a manager reads.
