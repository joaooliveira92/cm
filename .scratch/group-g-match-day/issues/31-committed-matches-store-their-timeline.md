# 31: A committed match stores its timeline

**What to build:** `commitMatchday` persists the derived Match Events alongside the result it already
writes, and the committed-match reads load them instead of re-deriving. Plus the migration and the
backfill that must precede any engine-rule change.

This is the implementation of
[a committed match stores its timeline](../../../.agents/notes/proposed/architecture/2026-09-19-committed-matches-store-their-timeline.md),
answering [decision request 07](../decision-request-07-engine-rule-changes-and-saved-matches.md).

**Why it is urgent rather than merely wanted:** the backfill has to run under the *current* engine. Every
engine-rule fix that lands first destroys the original timeline of every saved match it touches —
recoverable in theory by checking out the old engine and replaying, which nobody will do. Three written
fixes are waiting behind this (ticket 26's patch, ticket 29, and whatever decision requests 01, 04 and
06 settle), so the window is open now and closes the moment one of them ships.

**Seam:** of the committed match. A caller observes one immutable timeline for a committed match and a
re-derived one for a match in progress; which it got is not the caller's concern. Live reads keep
calling `deriveMatchEvents(stream)`; committed reads load.

**Decisions (from the note, not to be re-litigated here):**

- Store **events**, not a rendered report — `report.ts`, `postMatchSummary.ts` and `statistics.ts` all
  derive from the stream, so one stored artefact serves all three and presentation stays free to change.
- Re-derivation is untouched for live matches. Chunked resimulation and seed determinism are not in
  scope and must not regress.
- A live match interrupted by an upgrade **restarts from kickoff with the manager told** — already the
  restart behaviour under decision request 05, and the session is save-keyed by ticket 28.

**Blocked by:** [32](32-saves-need-a-migration-path.md) — saves have no migration path. Discovered
2026-09-19 on starting this ticket: `createSchema` runs once at career creation, `loadSave` does no DDL,
there are zero `ALTER TABLE` statements in the repo and no `schema_version` anywhere. The backfill below
exists *for matches that already exist*, so this cannot be narrowed to new saves without defeating its
own purpose.

**Blocks:** 26, 29, and any engine-rule fix arising from decision requests 01, 04 and 06.

**Files:** `apps/desktop/src/main/match/` (the commit path and the committed-match reads: `report.ts`,
`postMatchSummary.ts`, `statistics.ts`), `apps/desktop/src/main/db/schema.ts` and a generated
migration, plus tests under `apps/desktop/test/main/match/`.

- [ ] `commitMatchday` persists the match's derived events in the same transaction that writes the
      result, so a committed match can never exist without its timeline.
- [ ] The Match Report, post-match summary and match statistics read the stored events for a committed
      match, and `deriveMatchEvents` is still the path for a match in progress.
- [ ] A migration adds the storage, and a backfill writes a timeline for every already-committed match
      under the current engine. The backfill is idempotent and safe to re-run. **Depends on ticket 32:
      there is no mechanism today that reaches an existing save file.**
- [ ] A test proves the property the determinism tests do not express: a committed match's stored
      timeline is **unchanged by a deliberate engine-rule change**. Mutating an engine rule must not
      alter a stored report, and must still alter a fresh match's.
- [ ] Resuming a live match saved before an engine change restarts it from kickoff and says so, rather
      than silently rewriting revealed play.
- [ ] Save compatibility: load → continue on a save written before this ticket preserves future
      outcomes, and the backfilled timelines agree with the stored results they accompany.
- [ ] `pnpm check:all` green, and a `TRACEABILITY.md` row added with the engine-change-immunity test as
      its proving test.

**Status:** ready-for-agent
