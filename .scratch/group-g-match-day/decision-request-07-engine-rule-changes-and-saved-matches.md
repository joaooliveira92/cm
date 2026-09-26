# Decision Request: How may the match engine's rules change without rewriting saved matches?

## Question

When a fix changes how the match engine resolves an event, should matches already in a save keep
replaying under the rules they were played with (engine rules versioned per match, or the timeline
stored at commit), or is it acceptable that their re-derived timelines change?

## Why this is blocking

Found while implementing [ticket 26](issues/26-forced-substitution-picks-any-squad-player.md). The
work is kept as [a patch](patches/26-forced-substitution-never-re-enters.patch). It makes a forced
injury substitution never bring back a used player, and picks the replacement by player id instead of
SQL row order. As a result, almost every saved match with a severe-injury substitution replays
differently from that event on.

A match is never stored as a timeline. It is re-derived from its `MatchStarted` seed and command
journal on every read ([domain-bounded deciders and chunked resimulation](../../.agents/notes/implemented/architecture/2026-08-27-domain-bounded-deciders-and-chunked-resimulation.md)):

- `report.ts` (Match Report), `postMatchSummary.ts`, `statistics.ts` and `view.ts` all call
  `deriveMatchEvents(stream)`.
- The committed result (score, standings, player records) is persisted at commit.

After an engine rule change, a committed match's Match Report and statistics can contradict its stored
result, for example a different goalscorer or a different final score in the incident list. A live
match saved before the upgrade and resumed after it can rewrite lines the manager has already seen.
The engineering contract requires that "load-then-continue must preserve future outcomes".

The same question blocks every engine-rule fix in this effort:

- [ticket 26](issues/26-forced-substitution-picks-any-squad-player.md)
- [ticket 29](issues/29-substitution-windows-share-a-minute-across-halves.md)
- [decision request 01](decision-request-01-live-change-tactics-scope.md)
- [decision request 04](decision-request-04-who-may-come-on-as-a-substitute.md)
- [decision request 06](decision-request-06-red-carded-goalkeeper-stand-in.md)

## What is already settled

- Match simulation is deterministic from its seed (match engine note), and resuming is replaying.
- Committed results are persisted.
- The engine carries no rules version.

## Options

### Option A — version the engine rules per match

- **What the player experiences**: old matches stay exactly as played; new matches get fixed rules.
- **What it costs to build**: `MatchStarted` records a rules version. The engine branches on it for
  every rule that changes, and old branches are kept forever. The simplest form is a version on the
  stream plus a guard that old versions replay with the old code paths.
- **What it forecloses**: deleting old engine behaviour.

### Option B — store the derived timeline at commit

- **What the player experiences**: committed matches are frozen. A live match in progress across an
  upgrade still re-derives, which could be handled by abandoning or restarting it with a notice.
- **What it costs to build**: persist the Match Events at `commitMatchday`, with a migration and
  backfill for existing committed matches under the current engine before any rule change ships.
  Reports read the stored events.
- **What it forecloses**: nothing important; the save grows by one timeline per human match.

### Option C — accept that re-derived timelines change

- **What the player experiences**: after an update, an old Match Report may disagree with the recorded
  score.
- **What it costs to build**: nothing.
- **What it forecloses**: trust in the history screens.

## Recommendation

**Option B.** It removes the constraint from every future engine fix at a one-time cost, and it
matches the rule that committed results are authoritative. Ship the backfill before ticket 26's patch.

---

## Answer — Option B, 2026-09-19

**A committed match stores its derived timeline.** Committed matches are frozen; live matches still
re-derive, so chunked resimulation and seed determinism are untouched.

Decided under the human's standing delegation ("approve your recommendations on the blocking
decisions"), adopting this request's own recommendation. Recorded as
[a committed match stores its timeline](../../.agents/notes/implemented/architecture/2026-09-19-committed-matches-store-their-timeline.md).

Four things this fixes that the options left open:

1. **The backfill is a hard gate, and it is time-critical.** Existing committed matches must be
   backfilled under the *current* engine before any engine-rule change ships — ship a rule change first
   and those timelines are gone in practice. **No engine-rule fix may land before the backfill, ticket
   26's patch included.**
2. **Store events, not a rendered report.** Report, summary and statistics all derive from the event
   stream; one source of truth, presentation stays free.
3. **A live match interrupted by an upgrade restarts from kickoff, with the manager told.** Already the
   restart behaviour under decision request 05, and the session is save-keyed (ticket 28), so this is a
   notice rather than a mechanism.
4. **The guarantee needs its own proving test.** The two-advances and two-saves tests cover seed
   determinism and say nothing about this. One test must show a stored timeline surviving a deliberate
   engine-rule change.

Filed as [ticket 31](issues/31-committed-matches-store-their-timeline.md). Tickets 26 and 29 are
re-pointed at it: they are no longer blocked on a question, they are blocked on a ticket. Decision
requests 01, 04 and 06 are likewise unblocked as *questions about engine rules* — each still needs its
own answer about what the rule should be.
