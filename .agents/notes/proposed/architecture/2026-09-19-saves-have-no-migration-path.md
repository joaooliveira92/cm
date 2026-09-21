# Agent Note: Saves have no migration path, and several decisions assume one

Status: proposed

Found 2026-09-19 while starting group-g ticket 31. It is a finding, not a decision — the decision it
calls for is named at the end and is a human's.

## What is true today

**A save file's schema is written once, at career creation, and never changed again.**

- `createSchema` (`main/db/createSaveSchema.ts`) runs `MIGRATION_STATEMENTS`, whose own doc comment
  says "Every DDL statement for a **fresh save file**".
- It has exactly **one** call site: `beginCareer` (`main/world/saves.ts:183`).
- `loadSave` (`saves.ts:292`) performs no DDL.
- There are **zero `ALTER TABLE` statements** anywhere in `apps/desktop`, `packages` or `scripts`.
- There is **no `schema_version`** column or constant anywhere. `save_meta` holds `id`, `name`,
  `createdAt`.

The word "migration" in `migrations.generated.ts` means *drizzle generated this DDL*, not *this
upgrades an existing file*. Nothing upgrades an existing file.

## Why nobody noticed

Every schema change so far has been an implicit "new saves only", and nothing makes that visible:

- **The tests cannot catch it.** A save-compatibility test creates a save, loads it and continues — but
  it creates that save under the *current* schema. A test would have to hold a save file written by an
  older schema to fail, and none does.
- **The gate asks for something that cannot exist.** [`/gate`](../../../../.opencode/command/gate.md) step 4
  says: "Save compatibility — when the change touches persistence or a schema: save → load → continue
  preserves future outcomes; **name the migration**." There is no migration to name, so the step has been
  passing on the first clause alone.
- The failure is silent and deferred: an older save opens fine until something reads a table or column
  added after it was created.

## What this blocks

**Group-g ticket 31 cannot be built as written.** Its acceptance criterion — "a migration adds the
storage, and a backfill writes a timeline for every already-committed match under the current engine" —
has no mechanism behind it. The ticket is re-pointed at a prerequisite rather than quietly narrowed to
new-saves-only, because new-saves-only would defeat its purpose: the whole reason for the backfill is the
matches that *already* exist.

**Three decisions taken on 2026-09-19 assume a migration that does not exist**, and are marked
provisional until this is settled:

| Decision | What it assumed |
|---|---|
| [a committed match stores its timeline](2026-09-19-committed-matches-store-their-timeline.md) | A migration plus a backfill over existing committed matches. |
| [revealed play is immutable](../feature/2026-09-19-revealed-play-is-immutable.md), point 3 | "A migration for the persisted revealed position." |
| [the Performance Report shows what it can prove](../feature/2026-09-19-the-performance-report-shows-what-it-can-prove.md) | Survives intact — a `PlayerDeveloped` payload addition is JSON inside an existing column, needs no DDL, and the note already says it cannot be backfilled. |

The third is fine and is listed so the difference is visible: **additive JSON in an existing column is
the only schema change this codebase can currently make to a live save.** That is a narrow escape hatch
and worth knowing about, not a substitute for the mechanism.

## The decision this needs

**Does a save survive a schema change?** Three answers, and this note deliberately does not pick one —
it is a product decision about what a save *is*, and it should be made explicitly rather than inherited
from an absence.

- **Saves are durable.** Build a versioned migration path: `schema_version` in `save_meta`, ordered
  upgrade steps run on open, and a test fixture holding an old save file so the path is proved rather
  than assumed. Most work, and the only answer under which ticket 31's backfill means anything.
- **Saves are disposable during development.** A save created under an older schema is refused on open
  with a clear message. Cheap and honest; it makes the current behaviour explicit instead of silent, and
  it is defensible pre-1.0. It makes ticket 31's backfill unnecessary rather than impossible — there are
  no old saves to backfill, by rule.
- **Status quo.** Keep adding tables that old saves never get, and let them fail whenever the new reader
  runs. Recorded only to be rejected: it is the option nobody chose and everybody has been taking.

The second is the smallest honest answer and probably the right one for now, but it forecloses shipping
to anyone who has a career in progress, which is a product call rather than an engineering one.

## Consequences

- Ticket 31 is blocked on a new prerequisite ticket for the mechanism.
- The two affected notes are marked provisional on their migration clauses; their *rules* stand, only
  their persistence plans are in question.
- The `/gate` "name the migration" step should say what to do when there is no mechanism — today it can
  be read as satisfied by silence.

## Decided

2026-09-21: [saves are disposable during development](../../implemented/architecture/2026-09-21-saves-are-disposable-during-development.md).
