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

**Status:** ready-for-agent

**Files:** `packages/contracts/src/rpc.ts` and `schemas.ts`, `apps/desktop/src/main/saves.ts`,
`apps/desktop/src/main/rpcServer.ts`, `apps/desktop/src/main/leagueSelection.ts`,
`apps/desktop/src/main/worldGeneration.ts`, `apps/desktop/src/main/db/schema.ts` and the regenerated
DDL, the renderer's career-creation flow, `apps/desktop/test/create-generation.test.ts`,
`apps/desktop/test/saves.test.ts`, `apps/desktop/test/leagueSelection.test.ts`.

- [ ] `beginCareer` accepts a snapshot identifier, loads that snapshot, and re-resolves its intents
      against the live catalogue; the resolved selection it generates from is the re-resolution's
      output, never the selection stored in the snapshot.
- [ ] A snapshot whose catalogue fingerprint no longer matches is refused with a typed failure
      before any save file exists on disk, and a test asserts the saves directory is unchanged after
      a refusal.
- [ ] `generation_manifest` gains the catalogue fingerprint, the content pack id, the content pack
      version, and the snapshot id, keeping its single-row and seed-range `CHECK`s. The snapshot id
      carries no foreign key, and a comment records why.
- [ ] No table stores the snapshot's intents, and a test asserts no column anywhere holds a
      selection intent.
- [ ] The existing single-league world still generates and every current test that creates a career
      still passes, through whatever default snapshot the test helpers construct.
- [ ] `pnpm check:all` is green at this commit.
