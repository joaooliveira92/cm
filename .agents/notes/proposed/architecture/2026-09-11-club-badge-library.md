# Agent Note: Club badges are a per-country file library, mapped to clubs by content packs

Status: proposed

## Problem

The app has no club badges. A source dump now sits untracked at the repo root,
`football-logos-master/`: 2,160 PNGs (139x181, RGBA), 55 MB, laid out by season and league:
`logos/<Nation> - <League>/<Club Name>.png` for 2026–27, and
`history/<season>/<Nation> - <League>/…` back to 2021–22. It covers the top flight of 25 European
nations, 26 across its history, because Hungary appears in 2024–25 only. Brazilian badges will
follow in some other layout.

Keeping that layout means a club's file moves every time the club changes division or a season
turns over. The English pack names the 2025–26 Premier League (Burnley, West Ham, Wolves), while
`logos/` holds 2026–27 (Coventry, Hull, Ipswich instead). A season- or league-shaped library is out
of date the day it is imported. League folders also carry sponsors' names, such as
`Bulgaria - efbet Liga` and `Croatia - SuperSport HNL`, which change with the sponsor. The filenames
are display strings with accents, spaces, `&` and apostrophes.

This is an MVP. Licensing is explicitly out of scope: nothing below is shaped by it.

## Proposal

**Country is the only organising axis.** A club's badge belongs to the club's country, and to no
league or season. Promotion, relegation and a new season never move a file.

| Layer | What it is | Where it lives |
| --- | --- | --- |
| **Badge library** | One folder per country, one file per club | `apps/desktop/src/renderer/assets/club-badges/<nation>/` |
| **Pack mapping** | Canonical club id → badge key | `ContentPack.clubBadges` in `packages/shared` |
| **Delivery** | Badge key → URL, plus the fallback shield | one `clubBadges.ts` module and a `<ClubBadge>` component in the renderer |

### Badge library

- **Key**: `<nation>/<club-slug>`, e.g. `eng/manchester-united`, `bra/flamengo`. The nation is the
  lowercase ISO alpha-3 code already used in canonical ids (`club_eng_…`). England and Scotland have
  no ISO country of their own and take their football association codes, `eng` and `sco`. The
  slug is the club name with accents removed, lowercased, and every other non-alphanumeric run
  turned into `-`.
  Same-named clubs in different countries don't collide, because each country has its own
  namespace.
- **Files**: `club-badges/<nation>/<club-slug>.png`. A country folder holds every club of that country
  the sources know, whatever division it plays in: top flight, second tier, or Brazilian Série C
  when that arrives.
- **Manifest**: `club-badges/manifest.json`, generated and committed. One entry per key:
  `{ key, file, sha256, source, adapter }`, where `source` is the original path in the dump, kept
  for traceability, and `adapter` names the adapter that imported it. An import only replaces or
  removes its own adapter's keys, so a Brazilian import can't drop the European ones. Changing a
  badge is then a one-line hash diff in review.
- **One badge per club.** The dump has several seasons of the same club. Its season folders are only
  input to the import: the newest file for a club wins, and the season is not recorded as structure
  anywhere. Flattening the dump by country gives 572 clubs, about 14 MB (down from 55 MB). The dump
  has 697 distinct file names, but 125 of them are another spelling of a club already counted
  (`Arsenal` in 2021–22, `Arsenal FC` since), so they share that club's key. The 572
  include clubs no longer in a top flight, such as Burnley, which the English pack still names.

### Import script

`pnpm import-club-badges <source-dir> --adapter <name>` (`apps/desktop/scripts/import-club-badges.ts`)
is the only way files enter the library.

- **One adapter per source layout**, each reducing its source to `(nation, club name, file)` rows.
  The first is `football-logos`. It holds a `league folder prefix → nation` table (`"England" →
  "eng"`, `"Türkiye" → "tur"`, …), walks `logos/` then `history/` newest first, and keeps the
  first file per `(nation, slug)`. A folder whose prefix the table doesn't know stops the import.
  The Brazilian dump gets its own adapter whatever its layout. Everything after the adapter is
  shared.
- **Slug collisions stop the import.** Two different clubs in one country that slug the same don't
  overwrite each other. The slug rule can't tell a renamed club from a different one, so any two
  spellings that land on one key stop the import. The adapter's override table records the answer:
  it assigns a different club its own slug, or maps every spelling of one club onto one key.
- The script copies files, rewrites the manifest, and prints what was added, replaced (by hash) and
  dropped. Re-running it on the same dump changes nothing. It never drops a key that a pack in
  `CONTENT_PACKS` still references.
- After the first import, `football-logos-master/` leaves the repo root (kept elsewhere or deleted).
  Add it to `.gitignore` until then so the 55 MB isn't committed by accident.

### Pack mapping

A canonical id carries no name. Only a content pack says that `club_eng_1_14` is Manchester United,
so only a pack can say which badge it wears. `ContentPack` gains
`clubBadges: Readonly<Record<CanonicalId, BadgeKey>>` beside `clubColours`, not keyed by locale.

- The English, Spanish, Série A and Série B packs map their clubs explicitly. The import script
  drafts those lines by fuzzy-matching pack names against the library, and each draft is reviewed.
  Name matching never happens at runtime, because "Arsenal" vs "Arsenal FC" is exactly the guess
  that silently binds the wrong crest.
- The fictional base pack carries `{}`, and its clubs render the fallback shield.
- `displayNames.ts` grows `clubBadgeResolver` next to `clubColourResolver`. It uses the same
  `savePack` read, so names, colours and badges can never disagree.

### Delivery

- The library sits under the renderer's assets and is bundled by Vite. `clubBadges.ts` is the only
  file that knows the folder:
  `import.meta.glob("../assets/club-badges/*/*.png", { eager: true, query: "?url", import: "default" })`,
  reduced to a `badgeKey → url` map. It needs no protocol handler and no `electron-builder` change, and
  it works the same in dev, packaged builds, and Vitest.
- Read models that show a club carry `badgeKey: string | null`, resolved in main through the pack.
- `<ClubBadge badgeKey colours name size>` fits the image inside a square box without stretching it.
  When the key is null or unknown, it draws a shield in the club's primary colour pair with the club's
  initials. A table row can't paint "missing", so a badge always renders, as colours always do.
- Because the fallback hides a gap, `reportPackCoverage` also logs clubs a pack names but gives no
  badge, for any pack with a non-empty `clubBadges`.

### Adoption order

1. Import script, library, manifest, integrity test (no UI).
2. `clubBadges` on `ContentPack`, English and Spanish mappings, resolver.
3. `clubBadges.ts`, `<ClubBadge>`, first consumers: club selection (Step 3) and the career header.
4. Further consumers (league table, fixtures, match scoreboard), one ticket each, adding
   `badgeKey` to that screen's read model. Per the
   [club colours note](../../implemented/architecture/2026-09-03-club-colours-and-the-header-scope.md),
   add the field where it's read, not to a contract shared by screens that don't render it.
5. Brazilian badges: a new adapter plus Série A/B mappings, landing in `club-badges/bra/`. No design
   change.

## Alternatives considered

- **Organise by season and league, as the dump does.** Rejected. Every season's promotions and
  relegations move files, and a pack naming last season's clubs points at folders the new dump no
  longer has.
- **Blobs in the save database.** Rejected. Saves are generated per career, so every save would
  carry its own 14 MB copy. Identity is resolved from the pack on read
  ([saves generated under the world's content pack](../../implemented/architecture/2026-09-05-saves-generated-under-the-worlds-content-pack.md)),
  and a badge baked into a save row would go stale exactly as a baked-in name would.
- **A shared `badges.sqlite`.** Rejected. For under 1,000 immutable read-only images it adds a build
  step and a binary blob in git, and offers no query the manifest can't answer.
- **Serve files from `resources/` through a custom `club-badge://` protocol.** Deferred. Its real
  advantage is keeping art out of the bundle so a build can ship without it or swap it without a
  rebuild, which matters only once licensing does. The switch touches only `clubBadges.ts`, because
  every caller holds a key, not a URL.
- **Name files by canonical id** (`club_eng_1_07.png`). Rejected. Which club an id is depends on the
  pack, so an id-named file is wrong under every other pack.
- **Match badges to clubs by name at runtime.** Rejected, see Pack mapping.

## Acceptance criteria

- `football-logos-master/` is gone from the repo root. The library is
  `apps/desktop/src/renderer/assets/club-badges/<nation>/<club-slug>.png` with a committed
  `manifest.json`, and no league or season appears in any path.
- A test fails if a manifest entry has no file, a file has no manifest entry, a hash is stale, or
  any pack's `clubBadges` points at a key the manifest lacks.
- Re-running the import on the same dump leaves the working tree unchanged.
- A Premier League or La Liga save shows real crests in club selection and the header, including for
  a club that isn't in the dump's current top-flight folder. A fictional-pack save shows
  colour/initials shields and logs no badge gaps.

## Risks

- **Renderer build weight.** Vite copies about 700 files (more with Brazil) into every renderer
  build. They're copied, not transformed, so this is cheap. Switch to the deferred protocol
  alternative if build time or bundle size becomes a problem.
- **Repo weight.** About 14 MB of PNGs now, and every crest refresh adds history. Move the directory to
  Git LFS if it passes roughly 100 MB.
- **A club that changes country.** This doesn't happen in practice (Welsh clubs in the English
  pyramid are the known edge). Their key stays under the country whose league they play in, which
  the adapter's override table records.
- **Aspect ratio.** Every current source is 139x181. `<ClubBadge>` fits rather than stretches, so a
  future source with a different ratio doesn't distort.
