# 06: Clubs are generated per competition, with a hometown and a ground

**What to build:** the world's clubs are generated from the competition graph rather than from one
hard-coded twenty-club list. Every club belongs to a real place — it has a hometown city, and two
clubs may share one large city without that reading as a defect — and it has a named ground with a
capacity, display only in MVP. A club's canonical id is minted from its competition's id and its
ordinal within that competition, and the display-name column is gone: after this ticket a club is an
identifier plus attributes, and its name comes from the content pack.

This is the contract half of the `clubs.name` deletion begun in ticket 04, and it deletes the fixed
league roster with it. Club strength becomes a function of the competition's tier and its nation's
prior, with Stature Tier demoted to a spread within the club's own competition — so a mid-table club
in a first division is not generated as though it were a mid-table club in a fourth.

Every generated value keys on canonical ids alone. No seed, no id, and no attribute may be computed
from a count, a collection length, or an iteration position over the set of entities being
generated: that is what buys the superset property, where widening a selection reproduces the
narrower world byte-identically and adds to it.

The slice's edge promise: generation stays one transaction over the save's SQL client. A club whose
competition names a nation with no curated cities is a defect in the catalogue caught by ticket 02's
test, not a runtime failure here.

**Decisions:**

- `beginCareer` takes a `SnapshotId` and re-resolves its intents against the live catalogue rather
  than trusting the recorded selection; every seed and canonical id is keyed on canonical ids alone,
  which buys a superset determinism property; and club strength becomes a function of competition
  tier and nation prior, with Stature Tier demoted to a spread within its own competition. See
  [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-02-generation-reads-the-snapshot.md).
- Nations are unconditional referent rows and thin, cities are curated real geography resolved per
  activated nation, no stadium table, and the canonical-id rule lands everywhere at once —
  `clubs.name` deleted, competition names moved to the pack, one underscore id convention. See
  [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-01-world-catalogue-and-canonical-ids.md).

**Blocked by:** 02 (cities), 04 (nothing may read `clubs.name` before it is dropped), 05
(competitions must exist for a club id to be minted from one).

**Status:** ready-for-agent

**Files:** `apps/desktop/src/main/db/schema.ts` and the regenerated DDL,
`apps/desktop/src/main/worldGeneration.ts`, `packages/shared/src/clubs.ts` (the fixed roster leaves),
`packages/shared/src/generation.ts`, `apps/desktop/src/main/saves.ts` (the `createSave` compat shim),
`apps/desktop/test/world-determinism.test.ts`, `apps/desktop/test/create-generation.test.ts`,
`apps/desktop/test/db-schema.test.ts`.

- [ ] `clubs` carries a city reference, a stadium name, and a stadium capacity, and no longer
      carries `name`. Its existing `CHECK`s on stature tier, user-club flag, and seed range are
      unchanged.
- [ ] A club's city is set at every Simulation Depth, so no column on `clubs` is Depth-conditional,
      and a test asserts two clubs may share one city.
- [ ] Club canonical ids are minted from the competition id and the club's ordinal within it, in the
      documented underscore form, and generation produces one club per slot of every competition's
      club count rather than from a hard-coded roster.
- [ ] Club strength is a function of the competition's tier and the nation's prior, with Stature
      Tier spreading clubs within their own competition. The concrete curve constants are generation
      content and may be placeholders; the shape is what this ticket fixes.
- [ ] A determinism test generates two worlds from one seed under a selection and a superset of it,
      and asserts every club present in the narrower world is byte-identical in the wider one.
- [ ] A test asserts no generated value is computed from a count, a length, or an iteration position
      over the entities being generated.
- [ ] `pnpm check:all` is green at this commit.
