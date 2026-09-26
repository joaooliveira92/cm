# 32: Saves need a migration path before any new table reaches an existing career

**What to build:** a decision, then the mechanism it implies. Prerequisite for
[31](31-committed-matches-store-their-timeline.md).

**The finding:** a save file's schema is written once, at career creation, and never changed again.
`createSchema` has one call site — `beginCareer` (`main/world/saves.ts:183`) — `loadSave` performs no
DDL, there are **zero `ALTER TABLE` statements** in the repo, and no `schema_version` exists anywhere.
Every schema change to date has been an implicit "new saves only" that nothing makes visible. Written up
as [saves have no migration path](../../../.agents/notes/proposed/architecture/2026-09-19-saves-have-no-migration-path.md).

**Why it blocks 31:** 31's backfill exists *for matches that already exist*. Narrowing it to new saves
would leave exactly the matches it was written to protect unprotected, so 31 cannot be quietly scoped
down — it has to wait.

**The decision needed first** (a human's, per the note): are saves durable across a schema change,
disposable during development, or is the status quo accepted? The note recommends nothing and sets out
the three. The second is the smallest honest answer and forecloses shipping to anyone with a career in
progress, which is a product call.

**Blocked by:** 

**Blocks:** 31, and therefore 26, 29, and the engine-rule work behind decision requests 01, 03, 04, 06
and 08.

- [x] The durability question is answered and recorded as an Agent Note.
- [x] ~~If saves are durable~~ — not applicable, saves are disposable (see Comments). Was: `save_meta` carries a `schema_version`, ordered upgrade steps run on open
      inside one transaction, and a **test fixture holds a save file written by an older schema** so the
      path is proved rather than assumed. A test that creates its own save under the current schema
      cannot catch this class of defect and does not count.
- [x] If saves are disposable: opening a save whose version predates the current schema is refused with
      a message naming what happened, rather than failing later at the first read of a missing table.
- [x] `/gate` step 4 says what to do when a change touches persistence and no migration mechanism
      applies — today "name the migration" can be satisfied by silence.
- [x] `pnpm check:all` green.

**Status:** resolved

## Comments

- 2026-09-21: **Saves are disposable during development**, decided under the human's standing
  delegation. Recorded as [saves are disposable during development](../../../.agents/notes/implemented/architecture/2026-09-21-saves-are-disposable-during-development.md).
  The "if saves are disposable" criterion applies, and the "if saves are durable" one falls away. 31's
  backfill becomes unnecessary: 31 is rescoped to new saves only.
