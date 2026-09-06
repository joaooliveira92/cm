# Agent Note: The Tactics Overview reads one per-revision snapshot

Status: implemented

## Problem

The Tactics area's only surface is the editor. The overview (Screen 80) needs one read that returns
the club's tactical preparation as a single immutable snapshot bound to one revision, so a stale
view is discarded whole rather than rendering a mix of old and new. Ticket 01 introduced the club
tactic `revision` the snapshot binds to; what remained was designing the read and the composition of
its issues list.

## Decision

`getTacticsOverview` reads one snapshot of the active club's preparation: the formation (name plus
its eleven preview slots), the three Team Instructions, the eleven player assignments with Position
and Role Ratings computed at the boundary, a derived familiarity summary, the selection partition,
the set-piece status (`"none"` until Screen 86 ships), and the issues list. Every section binds to
the same club tactic `revision` the read was taken at — the value ticket 01's accepted save echoes —
so a caller that later learns a newer revision exists discards the snapshot whole. The "club
revision and tactic revision pair" of the ticket is this one value, described from the two sides the
binding touches.

Ratings and familiarity are derived on the read, never in a renderer. The rating math reuses the
existing `positionRating`/`roleRating`; the familiarity summary and the selection partition live as
pure derivations in `packages/shared/src/rules/tacticsSummary.ts`. Familiarity is the count of
starters per tier in the position their slot assigns, folded from each starter's persisted
`player_positions` tier and the selection the Tactic makes of them — never assigned directly.
Formation- and instruction-level familiarity stay deferred to the Training domain, and the broader
Training Focus proposal in [`../../proposed/feature/2026-08-29-training-focus-squad-column.md`](../../proposed/feature/2026-08-29-training-focus-squad-column.md) remains
unbuilt; only the familiarity-summary clause this ticket's decision names ships here.

### The issues list composition

Issues = the match-readiness blockers (`no-tactic`, `tactic-names-departed-players`) plus the
career-readiness advisories (`bids-awaiting-response`), deduplicated by id with the blocking
severity winning. Blockers first, then advisories, each carrying the screen that owns fixing it.
The career-loop-only blockers — a match in progress, an advance in flight, a completed season — are
not reported: two are live renderer states no main-process read can observe, and all three describe
the calendar rather than what the manager can prepare. This reads the ticket's "every blocking and
advisory readiness finding" as *every preparedness finding the snapshot can observe*, and it keeps
`assessMatchReadiness`/`assessContinueReadiness` the single homes for the rules — the snapshot
composes their output, never restates it.

### The snapshot read is serialised against saves

The read runs under the same per-save `Semaphore` `changeTactics` holds. SQLite autocommits each
statement, so an un-serialised read could interleave with an in-window edit and hand back a Tactic
from one revision beside a revision counter from another — the one torn state the snapshot exists to
prevent. Sharing the gate makes a snapshot read and an accepted save mutually exclusive per save.

### The selection stays squad-scoped

Starters are the registered players the active Tactic's slots name, in slot order; substitutes are
every other registered player; the two are a partition of the squad. A slot naming a departed player
lands in neither list, its assignment reads as a gap (null name/ratings), and the
`tactic-names-departed-players` blocker names what to do. An explicit starters-and-bench model is
Screen 89's; this records that mapping rather than inventing one.

## Alternatives considered

- **Compose the issues from the whole continue-readiness union.** Rejected: `matchInProgress` and
  `advancing` are renderer states a main-process read cannot observe, and reporting a completed
  season or an in-flight advance on a tactics screen would surface the calendar rather than the
  preparation being reviewed.
- **Let the overview re-derive the formation preview from `FORMATION_SLOTS`.** Rejected: the
  snapshot is a self-contained immutable read; carrying the preview slots keeps the overview a pure
  consumer and the snapshot internally consistent.
- **Compute a departed player's ratings anyway.** Rejected: a player who left is not a preparation
  option, and showing their suitability would imply the slot could still be played. Nulling the
  assignment and naming the blocker keeps the snapshot honest about what it holds.
- **Relax the read lock and trust SQLite's per-statement consistency.** Rejected as the sole
  mechanism: each statement reads a consistent page state but the multi-statement snapshot can still
  tear against an in-window write.
- **Carry two revision numbers (club and tactic).** Rejected: this codebase has one revision — the
  club tactic revision — and exposing a second invented counter would give callers false staleness
  signals.

## Consequences

- The overview screen (ticket 03) consumes one `getTacticsOverview` read; nothing else consumes it
  yet, and its only failure is `SaveNotFoundError` — reads stay legal on archived saves, where the
  overview's presentation maps the saved-state guard to its permission-limited view.
- Ratings and familiarity arrive computed; the editor's renderer-side role-rating display is
  unchanged.
- `changeTactics` and the overview read now share one per-save gate, so the two are mutually
  exclusive per save.
- The readiness rules stay in one place; the snapshot's issues list is a composition, not a copy.
- The read holds the save's gate while it loads the squad, the tactic, and the readiness facts once
  each.