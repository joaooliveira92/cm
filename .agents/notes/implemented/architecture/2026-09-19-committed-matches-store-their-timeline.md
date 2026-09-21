# Agent Note: A committed match stores its timeline

Status: implemented

## Problem

A match is never stored as a timeline. It is re-derived from its `MatchStarted` seed and command
journal on every read — `report.ts`, `postMatchSummary.ts`, `statistics.ts` and `view.ts` all call
`deriveMatchEvents(stream)`, per
[domain-bounded deciders and chunked resimulation](../../implemented/architecture/2026-08-27-domain-bounded-deciders-and-chunked-resimulation.md).
Only the *result* — score, standings, player records — is persisted, at commit.

That is what makes the simulation deterministic and saves small. It also means **an engine rule change
retroactively alters every saved match that rule touches.** A committed match's Match Report can come
to contradict its own stored result: a different goalscorer, a different score in the incident list. A
live match saved before an upgrade and resumed after it can rewrite lines the manager has already read.
The [engineering contract](../../../../.ai/ENGINEERING-CONTRACT.md) requires that load-then-continue
preserve future outcomes.

This was found while implementing group-g ticket 26, whose fix — a forced injury substitution never
brings back a used player, and the replacement is picked by player id rather than SQL row order — makes
almost every saved match with a severe-injury substitution replay differently from that event onward.
The fix is written and held as a patch.

**It blocks every engine-rule fix in the codebase**, not only that one: group-g tickets 26 and 29, and
decision requests 01, 04 and 06.

## Decision

**A committed match stores its derived timeline. Committed matches are frozen; live matches still
re-derive.**

`commitMatchday` persists the Match Events alongside the result it already writes. The Match Report,
post-match summary and statistics read the stored events. Re-derivation stays exactly as it is for a
match in progress, so chunked resimulation and the seed-determinism guarantee are untouched — what
changes is that the moment a result becomes a fact about the world, the account of how it happened
becomes one too.

Four things this decision fixes that the request left open:

1. **Storage lands before any engine-rule change.** A rule change that ships first rewrites every
   committed match's timeline. **No engine-rule fix may land before ticket 31**, including ticket 26's
   patch. *(As first written, this point required a backfill of existing matches under the current
   engine. Superseded 2026-09-21: saves are disposable during development, so a save made before the
   storage is refused on open and there is nothing to backfill.)*
2. **Store events, not a rendered report.** Report, summary and statistics all derive from the event
   stream, so storing events keeps one source of truth and leaves presentation free to change.
3. **A live match interrupted by an upgrade restarts from kickoff, with the manager told.** This is
   already the behaviour for a restart under decision request 05, and the session is already
   save-keyed (ticket 28), so this adds a notice rather than a mechanism.
4. **The guarantee needs a proving test.** The existing two-advances and two-saves determinism tests
   cover seed determinism. They do not cover this. One test must show a committed match's stored
   timeline surviving a deliberate engine-rule change — the property being asserted is *immunity to*
   engine change, which no determinism test expresses.

Decided by the agent on 2026-09-19 under the human's standing delegation ("approve your
recommendations on the blocking decisions"), adopting the recommendation the request itself carried.
It is reversible: nothing is deleted, and reverting means ignoring a stored column.

## Alternatives considered

**Version the engine rules per match** — `MatchStarted` records a rules version and the engine branches
on it, keeping old code paths forever. Rejected: it makes every future rule change a permanent fork in
the engine, and the cost compounds with each one. It also spreads the concern across the engine instead
of confining it to persistence. The one thing it does better is bounded save size.

**Accept that re-derived timelines change.** Free, and the honest reading of what the code does today.
Rejected because it spends the trustworthiness of every history screen to save one migration, and
because it is already violating the engineering contract rather than merely risking it.

**Freeze only on rule change** — snapshot timelines lazily, just before a breaking change ships.
Rejected as the same work under worse conditions: it needs the same backfill, but under deadline, with
the rule change waiting on it.

## Consequences

- **Unblocks group-g tickets 26 and 29 and decision requests 01, 04 and 06** — once ticket 31 lands,
  not before. They move from blocked-on-a-question to blocked-on-a-ticket.
- **Storage** must precede any engine-rule fix. (First written as "a schema addition, a migration and
  a backfill"; see the settled clause below.) **Shipped 2026-09-21** as one `MatchTimelineRecorded`
  event on the match's own stream, appended in the commit transaction (`main/match/timeline.ts`):
  additive JSON in an existing column, so no DDL. Committed reads load it; a live match re-derives.
  **Provisional as of 2026-09-19**: there is no mechanism that reaches an existing save file — see
  [saves have no migration path](../../proposed/architecture/2026-09-19-saves-have-no-migration-path.md). The *rule* here stands;
  how it is persisted to careers already in progress waits on that. Ticket 31 is blocked on ticket 32.
  **Settled 2026-09-21:** [saves are disposable during development](2026-09-21-saves-are-disposable-during-development.md).
  No migration or backfill: a save made before the storage exists is refused on open, so point 1's
  backfill gate no longer applies. Engine-rule fixes still wait for ticket 31 itself.
- **Saves grow by one timeline per human match.** Background matches are results-only and unaffected.
  For a ten-season career this is on the order of a few hundred timelines — small against a football
  database, and the request's own assessment was that nothing important is foreclosed.
- **`deriveMatchEvents` acquires a second caller shape**: live reads derive, committed reads load. That
  seam is where the decision lives, and it is the place to test it.
- **A `TRACEABILITY.md` row is owed** when it ships, with the engine-change-immunity test as its
  proving test.
