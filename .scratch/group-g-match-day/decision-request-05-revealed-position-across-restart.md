# Decision Request: Should a live match's revealed position survive an app restart?

## Question

When the app is closed or crashes during a live match and is reopened, should Match day continue
from the Commentary Line the manager had reached, or replay the match from kickoff?

## Why this is blocking

Found in review of [ticket 23](issues/23-match-day-remount-replays-from-kickoff.md). Ticket 23 keeps
the revealed position, lines, injuries and substitution counts in renderer module state
(`apps/desktop/src/renderer/match/session.ts`). Those survive leaving and returning to Match day, but
not a restart. After a restart:

- The feed replays from kickoff.
- The Commentary screen shows "No Commentary Lines revealed yet".
- A command raised during the replay is stamped at the replay minute ([ticket 16](issues/16-live-commands-stamped-by-revealed-minute.md)),
  so it rewrites everything after that minute, including play the manager saw before the restart.

Persisting the position turns a presentation cursor into durable state that the main process stamps
commands with. That changes what a save holds and needs a migration, so it should not be decided
inside a bug fix.

## What is already settled

- Match truth lives in main. Commentary Lines are display data, not simulation state (CONTEXT.md).
- A resumed match replays deterministically from its seed and journal.
- Commands take effect at the revealed position (tickets 16, 18).

## Options

### Option A — persist the revealed position with the match

- **What the player experiences**: reopening mid-match continues where they left off, and commands
  are stamped correctly.
- **What it costs to build**: a column or journal row for the revealed position, written as lines
  are revealed (throttled), and a migration. `resumeSimulation` returns it, and the renderer seeds its
  session from it.
- **What it forecloses**: nothing; the position is derived data that can always be ignored.

### Option B — replay from kickoff after a restart, but stamp commands no earlier than the last journaled command

- **What the player experiences**: the feed replays, but a command cannot rewrite the past before the
  manager's last decision.
- **What it costs to build**: a check in `submitMatchCommand`; no persistence change.
- **What it forecloses**: continuing the feed where it was.

### Option C — accept the replay

- **What the player experiences**: a restart replays the match, and early commands rewrite it.
- **What it costs to build**: nothing.
- **What it forecloses**: the promise that play the manager has seen is fixed.

## Recommendation

**Option A.** A restart mid-match is rare, but Option C makes the feed the manager watched unreliable
exactly when they resume.

---

## Answer — Option A, 2026-09-19

Settled together with group-g requests 01, 04, 05 and 08 as one rule: **revealed play is immutable.**
What the manager has been shown is a fact about the match, and nothing may change it. Recorded as
[revealed play is immutable](../../.agents/notes/proposed/feature/2026-09-19-revealed-play-is-immutable.md).

These four were four symptoms of one missing rule, which is why nineteen tickets patched them
individually without the pattern closing. A defect of this family is now a violation of a stated rule
rather than a fresh discovery.

**Gated on [ticket 31](issues/31-committed-matches-store-their-timeline.md)** where the change alters what
a seed produces — requests 01, 04 and 08 all do. The backfill must land first or saved matches rewrite
themselves.

Decided under the human's standing delegation ("i need you to solve the decisions"), adopting this
request's own recommendation.
