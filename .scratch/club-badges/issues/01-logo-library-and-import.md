# 01: Logo library and import script

**What to build:** Club logos live in a per-country library inside the desktop app's renderer assets,
indexed by a committed manifest, and one import script is the only way logos enter it. Running the
script on the current European dump (`football-logos-master/`) fills the library: one PNG per club
at `<nation>/<club-slug>.png`, with no league or season anywhere in a path. After that the dump
leaves the repo root.

The script has one adapter per source layout. Everything after the adapter is shared. The first
adapter reads the European dump's layout: league folders named `<Country> - <League>`, current
season under `logos/`, older seasons under `history/<season>/`. It carries a
league-folder-prefix-to-nation table covering all 25 countries in the dump.

- **Order:** it walks the current season first, then older seasons newest first, and keeps the
  first file per key.
- **Failures:** the script exits non-zero with a message naming the offender, and writes nothing,
  when it meets an unknown league prefix, a same-country key collision the override table doesn't
  resolve, or an import that would remove a key a content pack references.
- **Report:** on success it prints the keys added, the keys replaced (hash changed) and the keys
  removed.

This ticket also adds the (empty) `clubBadges` map to every content pack, so the integrity test and
the import's pack-reference guard have something real to check before ticket 02 fills the English
and Spanish maps.

**Seam:** this is a dev tool, not an app read path. No new service reaches the main process or the
renderer, and no app-facing Effect gains a failure.

**Decisions:**

- Country is the only organising axis. A logo belongs to its club's country, never to a league or a season. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-11-club-badge-library.md).
- Badge key is `<nation>/<club-slug>`: lowercase ISO alpha-3 nation, and a slug with accents removed, lowercased, every other non-alphanumeric run turned into `-`. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-11-club-badge-library.md).
- One logo per club, newest wins. A dump's season folders are only input to the import. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-11-club-badge-library.md).
- A committed manifest indexes the library, one entry per key with file, SHA-256 and original source path. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-11-club-badge-library.md).
- The import script is the only way files enter the library, with one adapter per source layout. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-11-club-badge-library.md).
- The import fails loudly rather than guessing: it stops on collisions and unknown prefixes, is idempotent, reports changes, and never removes a pack-referenced key. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-11-club-badge-library.md).

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] `football-logos-master/` is listed in `.gitignore` before the first import runs, so the dump can't be committed.
- [ ] The library holds one PNG per club under a folder per nation, and no path contains a league or a season. The current dump yields 697 keys.
- [ ] A committed manifest lists every key with its file, SHA-256 and original source path.
- [ ] Every content pack carries a `clubBadges` map (empty for now).
- [ ] An integrity test fails on a manifest entry with no file, a file with no manifest entry, a stale hash, or any pack's `clubBadges` value missing from the manifest.
- [ ] Import-core tests against a small fixture dump cover:
  - slugging of accents, `&`, apostrophes and spaces;
  - newest-wins across `logos/` and `history/` seasons;
  - a non-zero stop on an unknown league prefix;
  - a non-zero stop on a same-country collision, and resolution through the override table;
  - a second run producing no changes;
  - refusal to remove a key a pack references.
- [ ] Re-running the import on the European dump leaves the working tree unchanged.
- [ ] `football-logos-master/` is removed from the repo root once the import is committed.
- [ ] `pnpm check:all` passes.
