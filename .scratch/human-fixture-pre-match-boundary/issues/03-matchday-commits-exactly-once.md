# 03: The Matchday commits exactly once

**What to build:** When the human's match reaches full time, an explicit command commits it — the
human result, the rest of that Matchday's Fixtures, and the Calendar's step past it — as one
transaction. Until that command runs, the career has not moved; after it runs, running it again
changes nothing.

The simulation reaching full time and the career accepting that result are two different facts, and
they must stay different. Polling the running match is read-shaped: if one poll happening to observe
the final whistle were what committed the Matchday, durable career state would depend on polling
cadence, component lifecycle, timer behaviour, IPC retries, and whether the player is still looking
at the screen.

The command validates before it writes: the Fixture is the pending one, it exists, it includes the
human club, it is not already played, its match was started, and its stream reaches full time. It
derives the human result from the persisted stream and never re-runs the human simulation. Then, in
one transaction, it writes that result, resolves the Matchday's remaining Fixtures, applies each
Condition write-back exactly once, records the Matchday as resolved, and clears the boundary so
Continue can move again.

A rollback leaves the boundary intact and the Matchday incomplete, so retrying is safe. A repeated
call must not recover Condition twice, re-resolve the other Fixtures, emit a second resolution
event, or produce a different score.

The League table is never allowed to show a partially resolved Matchday — a table where the rest of
the division has played a Matchday the player has not is one the standings would faithfully report
as inconsistent.

Seam: one new command whose failures are the validation conditions above, all observable to the
caller; success returns the committed result. Idempotency keys on the Fixture already being played,
so a second call is a typed already-completed outcome rather than a second commit.

**Decisions:**

- Completion is an explicit idempotent command keyed by Fixture identity, committing the human
  result, the remaining Fixtures, the Condition write-backs, the resolution event, and the calendar
  step in one transaction; polling must never acquire career mutation because one read happened to
  observe the final whistle. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-08-29-human-fixture-pre-match-boundary.md).
- The human result is derived from the persisted stream, never by re-running the human simulation.
  See [Agent Note](../../../.agents/notes/proposed/architecture/2026-08-29-human-fixture-pre-match-boundary.md).
- A Save is durable at commit: a rolled-back completion leaves no record claiming the Matchday
  occurred. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-08-30-durable-at-commit-persistence.md).

**Blocked by:** 02 (Match day is the scheduled Fixture) — there is no started match stream to commit
from until the Fixture-bound start exists.

**Status:** ready-for-agent

- [ ] Reading or polling a running match commits no Fixture or Matchday state.
- [ ] The completion command commits the human result, the Matchday's remaining Fixtures, every
      Condition write-back, the resolution event, and the calendar step in one transaction.
- [ ] Calling it twice commits once: no doubled Condition recovery, no second resolution event, no
      changed score; the second call returns a typed already-completed outcome.
- [ ] An induced failure mid-commit leaves the boundary intact, the Matchday unresolved, and a retry
      succeeds with the same result.
- [ ] The human result is derived from the persisted stream; the human simulation is not re-run.
- [ ] The League table never shows a partially resolved Matchday.
- [ ] After completion, Continue advances to the next boundary as before.
- [ ] `pnpm check:all` is green.
