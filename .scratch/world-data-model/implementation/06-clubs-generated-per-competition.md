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
  [Agent Note](../../../.agents/notes/implemented/architecture/2026-09-01-world-catalogue-and-canonical-ids.md).

**Blocked by:** 02 (cities), 04 (nothing may read `clubs.name` before it is dropped), 05
(competitions must exist for a club id to be minted from one).

**Status:** resolved

**Files:** `apps/desktop/src/main/db/schema.ts` and the regenerated DDL,
`apps/desktop/src/main/worldGeneration.ts`, `packages/shared/src/clubs.ts` (the fixed roster leaves),
`packages/shared/src/generation.ts`, `apps/desktop/src/main/saves.ts` (the `createSave` compat shim),
`apps/desktop/test/world-determinism.test.ts`, `apps/desktop/test/create-generation.test.ts`,
`apps/desktop/test/db-schema.test.ts`.

- [x] `clubs` carries a city reference, a stadium name, and a stadium capacity, and no longer
      carries `name`. Its existing `CHECK`s on stature tier, user-club flag, and seed range are
      unchanged.
- [x] A club's city is set at every Simulation Depth, so no column on `clubs` is Depth-conditional,
      and a test asserts two clubs may share one city.
- [x] Club canonical ids are minted from the competition id and the club's ordinal within it, in the
      documented underscore form, and generation produces one club per slot of every competition's
      club count rather than from a hard-coded roster.
- [x] Club strength is a function of the competition's tier and the nation's prior, with Stature
      Tier spreading clubs within their own competition. The concrete curve constants are generation
      content and may be placeholders; the shape is what this ticket fixes.
- [x] A determinism test generates two worlds from one seed under a selection and a superset of it,
      and asserts every club present in the narrower world is byte-identical in the wider one.
- [x] A test asserts no generated value is computed from a count, a length, or an iteration position
      over the entities being generated.
- [x] `pnpm check:all` is green at this commit.

## Comments

**Stature Tier is a per-competition quota filled by seed order, not an independent per-club draw.**
The note says "a spread within its own competition" without saying which, and the superset rule
("no generated value may depend on the set of entities being generated") reads at first like it
forbids a quota. It does not: a competition's club set is fixed by the catalogue's `clubCount`, so
`comp_eng_1` has the same twenty ids and the same twenty seeds whether it was loaded alone or beside
six other nations, and a quota over that set is invariant under widening. An independent draw was
implemented first and rejected on the world it produced — twenty independent rolls regularly give a
division with no `big` club at all, which the Board Objective bands and the club-selection screen
both read as a worse world. The quota is filled by **seed order, never ordinal**, so
`club_eng_1_01` is still an address rather than a ranking.

**`createSave`'s compat shim now picks a `big` club rather than the first row.** The shim documented
itself as replicating "the historical `is_user_club = index === 0` behaviour" — and historically
index 0 was `LEAGUE_CLUBS[0]`, always `big`. With stature drawn per competition, "first by insertion
order" became a club of arbitrary standing, and every test downstream of the Board Objective band
turned seed-dependent: three separate suites failed intermittently, differently on each run, before
this was tracked down. Naming the stature restores what the shim actually promised. Anything relying
on the old rowid ordering would notice, and nothing does.

**The superset test was verified against the regression it exists to catch.** Threading a count of
the loaded competitions into the club seed makes all three of the new determinism tests fail; the
change was reverted. Worth recording because the note names this invariant as "easy to break and its
test is slow" — it is now known to be a test that actually bites, not one that merely passes.

**AC4's curve constants are placeholders, as the criterion allows, and nothing calibrates them.**
Strength falls 12 points of ceiling per tier, shifts ±5 with the nation's prior, and spreads ±6 by
Stature Tier over a 35-point band. The prior's swing is deliberately narrower than the band, which is
the rule `nations.ts` states — individual variance must exceed the national term — and
`clubGeneration.test.ts` asserts that relationship rather than the numbers, so retuning is free and
inverting the ratio is not.

**Ground names deliberately do not use the club's city.** A real city plus a real ground word is how
a generated stadium accidentally becomes a real one, which is the licensed-asset problem the content
pack exists to keep out of the core. Two fictional word lists combine instead.

**One note promoted, one held back.** The world-catalogue note is now `implemented/`: every one of
its acceptance criteria is met, including the coverage warning, which this ticket added — opening a
save whose ids its pack cannot name now logs the count and a sample rather than degrading silently.
The generation-reads-the-snapshot note **stays `proposed/`**, a partial implementation: it requires
the base pack to name every id the catalogue's `clubCount` values imply, and the pack names the
twenty clubs of `comp_eng_1` and nothing beyond. `catalogueClubIds` enumerates the key space and
`packCoverageGaps` reports it, so the gap is visible rather than silent — but naming several hundred
clubs is authored content that no ticket owns. That note also has one criterion belonging to ticket
15 (staff written by `commitCareer`), which has not been built at all.
