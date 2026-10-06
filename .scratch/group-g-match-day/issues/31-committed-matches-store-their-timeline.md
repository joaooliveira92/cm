# 31: A committed match stores its timeline

**What to build:** `commitMatchday` persists the derived Match Events alongside the result it already
writes, and the committed-match reads load them instead of re-deriving. No backfill: saves are
disposable during development, so a save made before the storage exists is refused on open (ticket 32).

This is the implementation of
[a committed match stores its timeline](../../../.agents/notes/implemented/architecture/2026-09-19-committed-matches-store-their-timeline.md),
answering [decision request 07](../decision-request-07-engine-rule-changes-and-saved-matches.md).

**Why it still comes first:** every engine-rule fix waits behind it (ticket 26's patch, ticket 29, and
whatever decision requests 01, 04 and 06 settle), because a fix that lands first would rewrite every
committed match's timeline. It is no longer time-critical: with no backfill, there are no old timelines
to capture before a fix lands (2026-09-21, [saves are disposable during development](../../../.agents/notes/implemented/architecture/2026-09-21-saves-are-disposable-during-development.md)).

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

**Blocked by:** [32](32-saves-need-a-migration-path.md) — a save made under another schema is refused
on open. Once 32 lands, adding the timeline storage moves `SAVE_SCHEMA_VERSION` on its own, so no save
without the storage can be opened and there is nothing to backfill.

**Blocks:** 26, 29, and any engine-rule fix arising from decision requests 01, 04 and 06.

**Files:** `apps/desktop/src/main/match/` (the commit path and the committed-match reads: `report.ts`,
`postMatchSummary.ts`, `statistics.ts`), `apps/desktop/src/main/db/schema.ts` and a generated
migration, plus tests under `apps/desktop/test/main/match/`.

- [x] `commitMatchday` persists the match's derived events in the same transaction that writes the
      result, so a committed match can never exist without its timeline.
- [x] The Match Report, post-match summary and match statistics read the stored events for a committed
      match, and `deriveMatchEvents` is still the path for a match in progress.
- [x] The storage is one `MatchTimelineRecorded` event on the match's own stream: additive JSON in an
      existing column, so no DDL and no save refusal. No backfill: a match committed before this
      ticket has no stored timeline and keeps re-deriving (development saves only).
- [x] A test proves the property the determinism tests do not express: a committed match's stored
      timeline is **unchanged by a deliberate engine-rule change**. Mutating an engine rule must not
      alter a stored report, and must still alter a fresh match's.
- [x] ~~Resuming a live match saved before an engine change restarts it from kickoff and says so~~ —
      moved to [33](33-a-restarted-live-match-says-so.md): it is a renderer message tied to the
      revealed-position work, not to storing committed timelines.
- [x] Save compatibility: save → load → continue under this ticket's schema preserves future outcomes,
      and the stored timelines agree with the stored results they accompany.
- [x] `pnpm check:all` green, and a `TRACEABILITY.md` row added with the engine-change-immunity test as
      its proving test.

**Status:** resolved

- 2026-09-21, orchestrator (correction): the restart behaviour this ticket describes ("a live match
  re-derives" after a restart) does not happen. A started, uncommitted match cannot be reopened after an app
  restart at all. Filed as [37](37-match-day-resumes-a-started-match-after-a-restart.md). The committed-timeline
  work here is unaffected.
