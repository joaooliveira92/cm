# 01: Presence Staff derive from the world seed and the club id

**What to build:** every club in the world gains a President and a Physio — a name and a role and
nothing else — derived on demand from the World Seed and the club's canonical id, never stored, at
every Simulation Depth, at zero storage and zero world-generation cost. The derivation lives beside
`generateStaff` in `rules/staff.ts` as a pure function, and a composing `deriveClubStaff` returns
the whole club's backroom — the presence pair plus the re-derived bound Coach and Scouts — as the
uniform `{ role, firstName, lastName }` shape grouped by department.

The slice's edge promise: this is a pure shared function with no service in `R` and no error
channel — a club's staff are a total function of its seed, tier, and nation, so a failure to derive
is a defect rather than a typed error. No schema changes and no new table, column, or migration;
the `staff_role` check constraint keeps meaning exactly `coach` and `scout`. `generateStaff` and the
order-sensitive `staff` stream are untouched, so every existing save's backroom is byte-for-byte
unchanged.

**Decisions:**

- A Presence Staff member is a name and a role, derived on demand from the World Seed and the club's
  canonical id, and never written anywhere. See
  [Agent Note](../../../.agents/notes/implemented/feature/2026-09-07-presence-staff-are-derived-never-stored.md).
- Per-role seeds, because the existing stream is a landmine. Each presence person derives from its
  own seed, `deriveSeed(worldSeed, "presence", "<clubId>:president")` and the same shape for the
  physio; neither touches `deriveSeed(worldSeed, "staff", clubId)`. See
  [Agent Note](../../../.agents/notes/implemented/feature/2026-09-07-presence-staff-are-derived-never-stored.md).
- Domestic names, because a nationality would be a value nothing reads. Presence Staff draw from
  `NAME_POOLS[clubNation]` directly, following the staff precedent; no nationality is drawn. See
  [Agent Note](../../../.agents/notes/implemented/feature/2026-09-07-presence-staff-are-derived-never-stored.md).
- Nothing varies by Stature Tier. See
  [Agent Note](../../../.agents/notes/implemented/feature/2026-09-07-presence-staff-are-derived-never-stored.md).
- Two role unions keep the check constraint honest. `STAFF_ROLES` and `StaffRole` keep meaning
  exactly `coach` and `scout`; `PRESENCE_ROLES` and `PresenceRole` cover `president` and `physio`;
  `ClubPersonRole` serves a caller that needs both. See
  [Agent Note](../../../.agents/notes/implemented/feature/2026-09-07-presence-staff-are-derived-never-stored.md).
- Both roles live in `rules/staff.ts`. See
  [Agent Note](../../../.agents/notes/implemented/feature/2026-09-07-presence-staff-are-derived-never-stored.md).
- One function composes the whole club. A pure `deriveClubStaff({ clubId, statureTier, clubNation,
  worldSeed })` returns the four people as `{ role, firstName, lastName }` grouped by department
  through a `ROLE_DEPARTMENT` map (`executive`, `coaching`, `recruitment`, `medical`);
  `generateStaff` is unchanged. Ticket 02's handler calls this composing function; the function
  itself is a shared deliverable and ships here.

**Blocked by:** None (can start immediately).

**Status:** done

**Files:** `packages/shared/src/rules/staff.ts` (`packages/shared/src/index.ts` unchanged — the
package's existing `export * from "./rules/staff.js"` already ships the new symbols),
`packages/shared/test/rules/staff.test.ts`.

- [x] `PRESENCE_ROLES` is exactly `["president", "physio"]`, and `STAFF_ROLES` is unchanged at
      `["coach", "scout"]`, matching the `staff_role` check constraint.
- [x] No schema change: no table, column, or migration is added by this ticket.
- [x] `deriveClubStaff` for a club returns one president and one physio plus the club's bound coach
      and scouts, each `{ role, firstName, lastName }` drawn from `NAME_POOLS[clubNation]`, grouped
      by department through `ROLE_DEPARTMENT` in the fixed order Executive → Coaching →
      Recruitment → Medical.
- [x] Each presence person derives from its own seed; deriving the physio does not read or advance
      the president's stream, and neither touches `deriveSeed(worldSeed, "staff", clubId)`.
- [x] The same club yields identical Presence Staff across two independent derivations.
- [x] A `results-only` club's inputs (tier, nation, seed) yield a president and a physio like any
      other — distinct at every Stature Tier.
- [x] A president and a physio at one club never share a full name.
- [x] Every existing determinism test over generated staff passes unchanged, byte for byte
      (`generateStaff` untouched).
- [x] `pnpm check:all` is green at this commit.

## Comments

**Gate caveat (orchestrator, 2026-09-07):** the first full `pnpm check:all` run failed one
desktop test — `test/renderer/match/screen-fulltime.test.tsx` "keeps the scoreboard..." — on an
element-find for the final score. That spec passes in isolation (1/1) and is unrelated to this
change (staff derivation only), matching the load-sensitive flake the desktop-suite-red effort
documented. A re-run of `check:all` `test` was green in full (120 files / 1097 tests). The
implementator's own pre-gate run had the suites green too.

**Pre-existing gate failure repaired separately (orchestrator, 2026-09-07):** `verify-md-links`
was red before this work — `docs/specs/group_a_application_shell_and_game_lifecycle_remaining/01_app_shell.md:229`
linked an image by machine-absolute path (`/Users/joao/dev/audit/docs/images/...`). Introduced by
this branch's own commit `ca9f174`, not by this ticket. Repaired to a relative reference in a
separate docs commit so the gate is green at this commit.

**Reviewer APPROVE (2026-09-07), one accepted-and-recorded low:** the collision redraw is bounded
termination, not a proof of the never-collide invariant — the physio loop stops after
`poolCombinations - 1` redraws, so a colliding pair is possible in principle (probability per club
~(1/480)^479 at today's pools, effectively unreachable, and it would require every derived physio
seed to land on the president's exact combination). Accepted over the combination-exhaustion repair
because changing the draw path would alter the seed→name mapping the tests pin byte-for-byte, for a
case no test can fail for the right reason. Recorded here as the constraining design call. The
ticket's `Files` nit (index.ts unchanged) was fixed in the same pass.