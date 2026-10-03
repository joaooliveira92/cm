# 02: getClubStaff reads a club's whole backroom over the RPC

**What to build:** a main-process RPC `getClubStaff(saveId, clubId)` returns the Club Staff view —
the club plus its four people grouped by department — for any club in the world, `results-only`
clubs included. The handler reads the club's Stature Tier and nation and the world seed, calls the
pure `deriveClubStaff` from ticket 01, and returns the view; the bound two are **always re-derived,
never read from the `staff` table**, so the page answers for every club and agrees with the rows by
construction. An unknown club is a typed `ClubNotFoundError`.

The slice's edge promise: a caller observes exactly two failures — the save is missing
(`SaveNotFoundError`) or the club id names nothing in that save (`ClubNotFoundError`) — and the
read is a pure query with no mutation and no new service in `R`. The renderer never derives
directly: it lacks the world seed, tier, and nation, and every club-scoped read stays on the RPC
surface like every other in this app.

**Decisions:**

- One function composes the whole club, and the read is a main-process RPC. A pure
  `deriveClubStaff({ clubId, statureTier, clubNation, worldSeed })` in `rules/staff.ts` returns the
  four people as `{ role, firstName, lastName }` grouped by department through a `ROLE_DEPARTMENT`
  map (`executive`, `coaching`, `recruitment`, `medical`); `generateStaff` is unchanged. A new RPC
  `getClubStaff(saveId, clubId)` returns `ClubStaffView { club, groups: [{ department, members:
  [{ role, firstName, lastName }] }] }`, erroring with `ClubNotFoundError` for an unknown club. The
  bound two are always re-derived, never read from the `staff` table: deriving is the path that
  answers for every club, and agreement with the rows is by construction. The renderer never
  derives directly — it lacks the world seed, tier, and nation — so every club-scoped read stays on
  the RPC surface. The human's own club shows exactly one derived coach and cannot show a different
  one than the scouting screen names, because the row that screen reads was materialised from this
  same call. See
  [Agent Note](../../../.agents/notes/implemented/feature/2026-09-07-presence-staff-are-derived-never-stored.md).

**Blocked by:** 01 — the presence derivation and the composing `deriveClubStaff`.

**Status:** done

## Comments

**Reviewer APPROVE (2026-09-07) after one flagged-index pass:** the reviewer's single HIGH was that the
implementator's `git add` had swept three `docs/specs/group_*` files (another effort's in-flight ASCII-art-to-image edits) plus a broken absolute image link in `23_continue_and_advance_time.md:35` into the staged index, redlining `verify-md-links`; the LOW was a dead `export readWorldSeed` with no importer. Repairs: the commit stages exactly this ticket's nine files (foreign files left in the working tree, untouched, and reported to the owning group-b effort); `readWorldSeed` reverted to module-private; `verify-md-links` re-run green on this ticket's bench with the foreign files stashed (845 files), `verify-db-schema` green, `effect-lint` green.

**Files:** `packages/contracts/src/schemas/clubs.ts`, `packages/contracts/src/rpc.ts`,
`packages/contracts/test/roundtrip.test.ts`, the main-process handler beside
`apps/desktop/src/main/career/staff.ts`, `apps/desktop/src/main/rpc/rpcServer.ts`,
`apps/desktop/test/main/career/staff.test.ts`.

- [x] `getClubStaff(saveId, clubId)` is an `AppRpcs` method returning `ClubStaffView { club,
      groups: [{ department, members: [{ role, firstName, lastName }] }] }`, error union
      `SaveNotFoundError | ClubNotFoundError`.
- [x] The handler reads the club's Stature Tier and nation (the same nation join `materialiseStaff`
      runs) and the world seed from the manifest, and returns the composition of
      `deriveClubStaff` — never reading the bound two from the `staff` table.
- [x] The `ClubStaffView` wire shape round-trips in `packages/contracts/test/roundtrip.test.ts`.
- [x] The human's own club shows exactly one derived coach, and that coach is the same person the
      scouting screen names (the row was materialised from the same derivation).
- [x] A `results-only` club — one with no `staff` rows — returns its four people like any other.
- [x] An unknown club id returns `ClubNotFoundError`; a missing save returns `SaveNotFoundError`.
- [x] No schema change: no table, column, or migration.
- [x] `pnpm check:all` is green at this commit.