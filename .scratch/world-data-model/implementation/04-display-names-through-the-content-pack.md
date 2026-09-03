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

**Status:** resolved

**Files:** `packages/shared/src/contentPack.ts`, `packages/shared/src/leagueSetup.ts` (competition
names leaving the catalogue), `apps/desktop/src/main/clubSelection.ts`,
`apps/desktop/src/main/squad.ts`, `apps/desktop/src/main/transfers.ts`,
`apps/desktop/src/main/match.ts`, `apps/desktop/src/main/season.ts`,
`apps/desktop/src/main/saves.ts`, and the tests that assert a club or competition name.

- [x] A main-process seam resolves a canonical id to a display name using the pack recorded on the
      save, with the existing locale then `"*"` then id fallback, and every read path that returns a
      club or competition name goes through it.
- [x] No SQL statement outside that seam selects `clubs.name`, and a test or lint rule asserts it.
- [x] Competition display names live in the content pack rather than in the league-setup catalogue,
      and the catalogue carries only canonical ids and structure.
- [x] The base fictional pack names every club and competition id the catalogue implies, and a test
      reports any id the pack fails to cover rather than letting a raw identifier reach a screen
      unnoticed.
- [x] Every renderer test asserting a visible club or competition name still passes, reading the
      pack-resolved name.
- [x] `pnpm check:all` is green at this commit.

## Comments

**Club ids became canonical here, ahead of ticket 06 (shipped as-is).** The slice's edge promise
says name resolution is a pure function of the pack and an id, and AC5 says every renderer test
asserting a visible club name still passes reading the pack-resolved name. Both are false while
`clubs.id` is `deriveId(worldSeed, "club", <name>)` — a per-world hash no pack can name — so the
seam would have resolved every club to a raw identifier. Generation therefore mints
`canonicalClubId("ENG", ordinal)` (`club_eng_01`…`club_eng_20`), which is the form the Agent Note
prescribes for the base pack, and derives each club's seed from that id rather than from its old
name. `LEAGUE_CLUBS` lost its `name` field in the same change and is now the ordinal-to-stature list
the note describes. Ticket 06 still owns the id the spec settles on — competition-plus-ordinal,
`club_eng_1_07` — and remints from the competition graph; this is the intermediate form, not a
claim on that decision.

**The catalogue's ids moved to underscores here.** No ticket claims the third half of the note's
gist ("one underscore id convention") on its own, and ticket 05 requires it done: its first
criterion says `competitions` carries "the catalogue's own canonical id in the `comp_eng_1` form",
and a competition row has to join to a `nations` row that ticket 02 already wrote as `nation_eng`.
`LEAGUE_SETUP_INDEX`'s fingerprint moved to `real-geography@2.0.0` with it, so every persisted
preset and setup draft from the old catalogue is refused rather than half-restored — the mechanism
working as designed.

**`clubs.name` is written but read by nothing.** The column is still populated, with the base pack's
name, so it stays non-null until ticket 06 drops it; no query anywhere selects it. This is the one
place the shipped code contradicts CONTEXT.md's Content Pack entry ("every display name is resolved
at read time, never written into a row") — deliberately and for one ticket, which is what the
expand/contract split costs. The glossary is not edited for it, because ticket 06 makes the entry
true again rather than the entry being wrong.

**AC4's coverage is asserted for competitions and for the clubs generation mints, not for all 386
club ids the catalogue implies.** `packCoverageGaps` is the reporting mechanism the criterion asks
for and the test uses it three ways; naming the remaining ~366 club ids is the content work the
implementation README already carves out of these tickets, and the ids do not exist in their final
form until ticket 06 mints them.

**The seam is asserted by a source scan, not a lint rule.** `display-names.test.ts` reads
`src/main/**` and fails on any SQL that selects a club name, which is what AC2 asks for. The
`prototype-scale-probe` harness is excluded by name: it reproduces the query shapes its
`RESULTS.md` numbers were measured against, and rewriting it would invalidate the measurements
three open questions still cite.

**The setup screens resolve through a second entry point, on purpose.** `catalogueName` in
`@cm-clone/shared` resolves against the build's own pack, because the catalogue browser, its search,
and the Active Leagues consequences all run before a save exists and so have no recorded pack to
read. Two entry points for two lifetimes, both calling the one `displayName` function — not two
answers to the same question.
