# Agent Note: Revision-bound, idempotent saves for a club's Tactic

Status: implemented

## Decision

A club's Tactic row carries a monotonic `revision`, raised by exactly one on every accepted save; a
fresh save reads as 0. The `changeTactics` command takes an `expectedRevision` (the revision the
caller read) and a `requestId` (a fresh id minted per submit), and reads the stored state, validates,
and writes inside one SQLite transaction:

- A replay whose `requestId` is already in the `tactic_write_requests` log is a **no-op success**
  returning the *current* state — checked before the revision comparison, so a retry after a lost
  response never double-applies and never conflicts, however stale its expected revision.
- A submit whose `expectedRevision` does not match the stored revision is refused with a
  `TacticRevisionConflictError` naming the current revision, and changes nothing.
- Otherwise the Tactic is replaced, the revision is set to `currentRevision + 1`, and the request id
  is logged in the same transaction.

The wire `TacticsScreenView` carries the `revision` it was read at, and an accepted save echoes the
new revision, so a caller can tell stale reads from current ones. The editor records the revision it
loaded, sends it as the expected revision with a fresh request id per submit, and renders a conflict
as a distinct state — last draft preserved, Refresh offered — rather than a bare failure line. The
Refresh affordance discards the draft only once the refetched view actually moves past the stale
revision, never on the still-stale intermediate value.

The idempotency log records only the accepted writes' request ids, never the rejected ones: a
conflicted submit has nothing to replay. It is keyed on `(club_id, request_id)` so one club's fresh
request ids cannot collide with another's. This follows the patterns established in the League and
Nation Selection note (echoed revisions for staleness) and the tagged-domain-errors note (typed,
narrow failures a caller can branch on).

## Alternatives considered

- **Last-request-id-only idempotency (store the last `request_id` on the Tactic row).** Rejected:
  a retry of an *older* accepted request after the club moved to a later revision would not match the
  stored "last" id, so it would surface as a conflict instead of the guaranteed no-op Screen 80
  requires. Only an append-only log of accepted ids satisfies "against the same or a later revision".
- **Record write requests as `events` log entries.** Rejected: the event log is restricted to facts
  no table holds (see `db/event-log-restriction.test.ts`), and a request id is a write-side
  idempotency record keyed to a club and a save, not a domain event for a chronology. A dedicated
  table keeps the log's size rule and its test untouched.
- **Client-side dedupe only (the editor never re-sends on retry).** Rejected: retries happen
  regardless (timers, re-renders, IPC), and the server could not detect a replayed payload from a
  second window or a crashed-and-recovered client. The guarantee has to be server-side.

## Consequences

- **The request log grows with the career** (one row per accepted save). Tactic saves are an
  occasional, player-paced action, so the growth is trivially small next to the event log, and
  nothing scales with the size of the world.
- **Existing saves predate the `revision` column.** Save files are created fresh per career with no
  in-place migration (per `drizzle.config.ts`), so an old save would fail a `SELECT revision`. This
  matches the project's established schema-change policy — no migration runner exists.
- **AI clubs write revision 0 and no request id.** `aiClubs.ts` persists season-start tactics
  through the same `persistTactic` helper, untouched: the revision is a human-editing concept, and
  no one reads an AI club's Tactic revision.
- **The renderer mints the request id with `crypto.randomUUID()`** at submit time, branded
  `WriteRequestId` at the wire boundary so a `saveId` and a `requestId` can never be transposed.