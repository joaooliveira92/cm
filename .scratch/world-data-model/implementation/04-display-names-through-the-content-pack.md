# 04: Display names resolve through the content pack

**What to build:** every club and competition name the player sees comes from the content pack
rather than from a column, so the same generated world can run under fictional, licensed, or
localized names. A single main-process resolution seam turns a canonical id into a display name for
every read path that returns one — the squad header, the club selection list, the transfer inbox and
bid list, the match screens, the fixture list, the league table, and the save list.

This is the expand half of deleting `clubs.name`. The column still exists and is still written after
this ticket; nothing outside the seam reads it. Ticket 06 deletes it. Splitting it this way is what
lets the wide change land green: `clubs.name` is read from six main-process modules and asserted by
several tests, and removing the column and rewiring every reader in one change is not reviewable.

Competition display names move out of the catalogue and into the pack in the same change, so the
rule lands once: a canonical id is never a display name, and nothing downstream of generation keys
behaviour off a name.

The slice's edge promise: name resolution is a pure function of the pack and an id, so it adds no
failure to any caller's error channel. An id the pack does not name resolves to the id itself,
which is deliberately visible in the UI rather than an empty string or a raised error.

**Decisions:**

- Nations are unconditional referent rows and thin, cities are curated real geography resolved per
  activated nation, no stadium table, and the canonical-id rule lands everywhere at once —
  `clubs.name` deleted, competition names moved to the pack, one underscore id convention. See
  [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-01-world-catalogue-and-canonical-ids.md).

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

**Files:** `packages/shared/src/contentPack.ts`, `packages/shared/src/leagueSetup.ts` (competition
names leaving the catalogue), `apps/desktop/src/main/clubSelection.ts`,
`apps/desktop/src/main/squad.ts`, `apps/desktop/src/main/transfers.ts`,
`apps/desktop/src/main/match.ts`, `apps/desktop/src/main/season.ts`,
`apps/desktop/src/main/saves.ts`, and the tests that assert a club or competition name.

- [ ] A main-process seam resolves a canonical id to a display name using the pack recorded on the
      save, with the existing locale then `"*"` then id fallback, and every read path that returns a
      club or competition name goes through it.
- [ ] No SQL statement outside that seam selects `clubs.name`, and a test or lint rule asserts it.
- [ ] Competition display names live in the content pack rather than in the league-setup catalogue,
      and the catalogue carries only canonical ids and structure.
- [ ] The base fictional pack names every club and competition id the catalogue implies, and a test
      reports any id the pack fails to cover rather than letting a raw identifier reach a screen
      unnoticed.
- [ ] Every renderer test asserting a visible club or competition name still passes, reading the
      pack-resolved name.
- [ ] `pnpm check:all` is green at this commit.
