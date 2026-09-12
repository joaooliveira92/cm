# 03: Generation reads the snapshot, and the save records what produced it

**What to build:** a career is generated from the League Selection Snapshot the player actually
submitted, and the save records enough to explain itself later. `beginCareer` takes a snapshot
identifier and re-resolves that snapshot's intents against the live catalogue rather than trusting
the selection recorded in it, so a catalogue that has moved on is caught before any file is written:
the player gets a message rather than a corrupt save. The save's generation manifest gains the
catalogue fingerprint, the content pack id and version, and the snapshot id, so a later reader can
say which catalogue and which pack produced the ids in this file.

The world this ticket generates is still today's single fixed league. Only the entry point, the
refusal path, and the recorded provenance change; ticket 05 is what turns the re-resolved selection
into competition rows.

The snapshot id is recorded as a diagnostic pointer and explicitly not as a foreign key: the
snapshot file is machine-local and will not exist beside a save copied to another machine. No table
stores the snapshot's intents.

The slice's edge promise: beginning a career gains one observable failure — the selection no longer
resolves against the live catalogue — and that failure is typed and raised before any file is
created, so the caller's recovery is to re-run selection. A snapshot id that names no snapshot is
the same failure. Everything else about generation stays a defect if it goes wrong, as it is today.

**Decisions:**

- `beginCareer` takes a `SnapshotId` and re-resolves its intents against the live catalogue rather
  than trusting the recorded selection; every seed and canonical id is keyed on canonical ids alone,
  which buys a superset determinism property; and club strength becomes a function of competition
  tier and nation prior, with Stature Tier demoted to a spread within its own competition. See
  [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-02-generation-reads-the-snapshot.md).

**Blocked by:** None (can start immediately).

**Status:** resolved

**Files:** `packages/contracts/src/rpc.ts` and `schemas.ts`, `apps/desktop/src/main/saves.ts`,
`apps/desktop/src/main/rpcServer.ts`, `apps/desktop/src/main/leagueSelection.ts`,
`apps/desktop/src/main/worldGeneration.ts`, `apps/desktop/src/main/db/schema.ts` and the regenerated
DDL, the renderer's career-creation flow, `apps/desktop/test/create-generation.test.ts`,
`apps/desktop/test/saves.test.ts`, `apps/desktop/test/leagueSelection.test.ts`.

- [x] `beginCareer` accepts a snapshot identifier, loads that snapshot, and re-resolves its intents
      against the live catalogue; the resolved selection it generates from is the re-resolution's
      output, never the selection stored in the snapshot.
- [x] A snapshot whose catalogue fingerprint no longer matches is refused with a typed failure
      before any save file exists on disk, and a test asserts the saves directory is unchanged after
      a refusal.
- [x] `generation_manifest` gains the catalogue fingerprint, the content pack id, the content pack
      version, and the snapshot id, keeping its single-row and seed-range `CHECK`s. The snapshot id
      carries no foreign key, and a comment records why.
- [x] No table stores the snapshot's intents, and a test asserts no column anywhere holds a
      selection intent.
- [x] The existing single-league world still generates and every current test that creates a career
      still passes, through whatever default snapshot the test helpers construct.
- [x] `pnpm check:all` is green at this commit.

## Comments

**Most of this ticket had already shipped when it was picked up.** `beginCareer` taking a
`SnapshotId`, loading it, re-resolving its intents against the live catalogue, refusing a stale or
unknown snapshot with a typed `PresetFingerprintMismatchError` before any file exists, and the four
provenance columns on `generation_manifest` all landed inside `a5dfcf9`
(`feat(club-selection): implement the two-column workspace and its six decisions`), together with
their tests in `saves.test.ts` — the refusal pair that asserts the saves directory is unchanged, the
re-resolution test that hand-edits a snapshot's recorded `selections` and shows generation ignores
them, and the schema probe that asserts no column anywhere holds a selection intent and that
`generation_manifest` carries no foreign key. The ticket was left `claimed` rather than resolved,
which is why it read as unstarted. Verified criterion by criterion against HEAD rather than
reimplemented.

**One criterion was genuinely outstanding, and it came from ticket 02's comments rather than from
this ticket's own list.** Ticket 02 recorded that its selection-independence test could only
approximate the property — selection did not reach generation then, so it varied the reference year
and the world seed instead — and that ticket 03 owed the real version once `beginCareer` re-resolved
a real selection. `world-determinism.test.ts` now generates two worlds from one world seed under two
genuinely different scopes (England's top division, and England's plus Spain's) and asserts the whole
catalogue is identical, with a guard that fails if the two snapshots ever resolve to the same scope —
otherwise the test would pass while proving nothing.

**The Agent Note stays in `proposed/`.** `2026-09-02-generation-reads-the-snapshot.md` is also
carried by ticket 06, which owns the club-strength and superset-determinism halves of it, so
promotion belongs to that ticket per the implementation README.
