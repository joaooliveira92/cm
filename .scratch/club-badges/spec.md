# Club Badges

Status: ready-for-agent

## Problem Statement

The app shows no club logos. Every club appears as a name alone in club selection, the career
header, tables and fixtures. A set of European club logos now sits in a dump at the repo root,
2,160 PNGs (55 MB) laid out by season and league, with Brazilian logos to follow in some other
layout.

Saving the logos at the repo root is not a strategy. Keeping the dump's season-and-league layout
would also go stale every season: clubs change division, so a club's file would move whenever it
was promoted or relegated. The English pack names the 2025–26 Premier League (Burnley, West Ham,
Wolves), while the dump's current folder holds 2026–27 (Coventry, Hull, Ipswich instead).

This is an MVP. Licensing is explicitly out of scope.

## Solution

Club logos become a library organised **by country, not by season or league**. Each country has one
folder with one file per club, whatever division the club plays in. Promotion, relegation and a new
season never move a file. A committed manifest indexes the library, and one import script is the
only way logos enter it. The script gets one adapter per source layout, so the Brazilian logos
arrive by adding an adapter.

A content pack (the layer that already says `club_eng_1_14` is Manchester United) maps each club it
names to that club's logo. A save shows the logos of the pack it was generated under. Every screen
that shows a club badge renders a logo, or a shield in the club's colours with its initials when
the club has no logo.

## User Stories

1. As a manager, I want to see my club's logo in the club selection list, so that I recognise the club I'm picking at a glance.
2. As a manager, I want to see my club's logo in the career header, so that the game feels like it's about my club.
3. As a manager starting a Premier League career, I want real Premier League logos, so that the league looks like the one I know.
4. As a manager starting a La Liga career, I want real La Liga logos, so that the league looks like the one I know.
5. As a manager, I want a club that isn't in its country's current top flight (e.g. a recently relegated club my pack still names) to show its logo, so that relegation doesn't strip a club of its identity.
6. As a manager, I want a club without a logo to show a shield in its colours with its initials, so that no row or header looks broken or empty.
7. As a manager of a fictional-names career, I want colour-and-initials shields for every club, so that fictional clubs never wear a real club's crest.
8. As a manager, I want a club's logo to stay the same after it is promoted or relegated, so that the club reads as the same club.
9. As a manager, I want logos never to be stretched, so that crests look like crests whatever their source proportions.
10. As a manager, I want logos to load the same way in every build, so that nothing that works in development breaks in the packaged app.
11. As a maintainer, I want logos organised by country, so that I never reorganise files when seasons turn over.
12. As a maintainer, I want every logo addressed by a stable `<nation>/<club-slug>` key, so that code never depends on source filenames with accents, spaces or punctuation.
13. As a maintainer, I want one import script to bring a logo dump into the library, so that I never hand-copy or hand-rename files.
14. As a maintainer, I want the import to keep the newest logo when a dump has the same club in several seasons, so that the library holds each club's current crest.
15. As a maintainer, I want the import to stop on a league folder it can't place in a country, so that no club silently goes missing.
16. As a maintainer, I want the import to stop when two different clubs in one country produce the same key, so that one club's crest never overwrites another's.
17. As a maintainer, I want an override table in the adapter to resolve key collisions and edge cases, so that the fix is recorded rather than done by hand.
18. As a maintainer, I want re-running the import on the same dump to change nothing, so that an import is safe to repeat.
19. As a maintainer, I want the import to report which logos were added, replaced and dropped, so that I can review a new dump before committing it.
20. As a maintainer, I want the import never to drop a logo that a pack still maps a club to, so that a partial dump can't break a league's logos.
21. As a maintainer, I want a committed manifest with a hash per logo, so that a changed crest shows up as a readable diff in review.
22. As a maintainer, I want a new source layout (the Brazilian logos) to need only a new adapter, so that the design doesn't change per source.
23. As a maintainer, I want a test that fails when the manifest, the files and the pack mappings disagree, so that a broken library can't pass CI.
24. As a maintainer, I want each pack to map its clubs to logos explicitly, so that "Arsenal" vs "Arsenal FC" is never guessed at runtime.
25. As a maintainer, I want the import script to draft a pack's mappings by fuzzy name match, so that I only review 20 lines per league instead of writing them.
26. As a maintainer, I want names, colours and logos to resolve through one read of the save's pack, so that they can never disagree.
27. As a maintainer, I want a club the pack names but gives no logo to be logged when the save opens, so that a missing crest is reported even though the screen still paints a shield.
28. As a maintainer, I want the fictional pack not to report missing logos, so that the log isn't flooded with gaps that are by design.
29. As a maintainer, I want a screen that adopts logos to add the logo key to its own read model, so that screens that don't render logos don't pay for the field.
30. As a maintainer, I want the logo dump removed from the repo root after import, and ignored until then, so that 55 MB is never committed by accident.

## Implementation Decisions

- **Country is the only organising axis.** A logo belongs to its club's country, never to a league or a season. Country folders hold every club the sources know, in any division. See [club badge library](../../.agents/notes/proposed/architecture/2026-09-11-club-badge-library.md).
- **Badge key is `<nation>/<club-slug>`.** The nation is the lowercase ISO alpha-3 code the canonical ids already use. The slug is the club name with accents removed, lowercased, and every other non-alphanumeric run turned into `-`. The key names a real club, never a canonical id, which is why two packs that name the same club share one file. See [club badge library](../../.agents/notes/proposed/architecture/2026-09-11-club-badge-library.md).
- **One logo per club, newest wins.** A dump's season folders are only input to the import. The newest file per key is kept, and no season is recorded as structure. The current dump flattens to 697 clubs, about 17 MB. See [club badge library](../../.agents/notes/proposed/architecture/2026-09-11-club-badge-library.md).
- **A committed manifest indexes the library**, one entry per key carrying the file, its SHA-256 and its original source path. It is generated by the import and never hand-edited. See [club badge library](../../.agents/notes/proposed/architecture/2026-09-11-club-badge-library.md).
- **The import script is the only way files enter the library**, with one adapter per source layout. Each adapter reduces its source to `(nation, club name, file)` rows, and everything after the adapter is shared. The first adapter, for the current European dump, carries a league-folder-prefix-to-nation table, and it stops on an unknown prefix. See [club badge library](../../.agents/notes/proposed/architecture/2026-09-11-club-badge-library.md).
- **The import fails loudly rather than guessing.** It stops on a same-country key collision, which the adapter's override table resolves. It is idempotent, it reports additions, replacements (by hash) and removals, and it never removes a key a pack references. See [club badge library](../../.agents/notes/proposed/architecture/2026-09-11-club-badge-library.md).
- **`ContentPack` gains `clubBadges`**, canonical club id to badge key, beside `clubColours` and not keyed by locale. The fictional base pack carries an empty map, and the English and Spanish packs map all twenty of their clubs. Mappings are drafted by the import's fuzzy name match, then reviewed. Matching by name never happens at runtime. See [club badge library](../../.agents/notes/proposed/architecture/2026-09-11-club-badge-library.md).
- **A club-badge resolver sits beside the club-colour resolver** in the main-process display-names seam, bound to the same single read of the save's pack. See [club badge library](../../.agents/notes/proposed/architecture/2026-09-11-club-badge-library.md).
- **Read models that show a club carry `badgeKey: string | null`.** The key is resolved in main, and each screen adds the field to its own read model when it adopts logos, never to a contract shared with screens that don't render one. See [club badge library](../../.agents/notes/proposed/architecture/2026-09-11-club-badge-library.md).
- **The renderer bundles the library through Vite.** One renderer module owns the logo folder and turns a key into a URL, so no protocol handler or packaging change is needed. Every caller holds a key, never a URL, so moving to a main-process protocol later touches only that module. See [club badge library](../../.agents/notes/proposed/architecture/2026-09-11-club-badge-library.md).
- **One `ClubBadge` component renders every logo.** It fits the image inside a square box without stretching. When the key is null or unknown, or the image fails to load, it draws a shield in the club's primary colour pair with the club's initials. See [club badge library](../../.agents/notes/proposed/architecture/2026-09-11-club-badge-library.md).
- **Missing logos are reported, not hidden.** Pack coverage reporting logs clubs a pack names without a logo, for any pack whose `clubBadges` is non-empty. The fictional pack is exempt. See [club badge library](../../.agents/notes/proposed/architecture/2026-09-11-club-badge-library.md).
- **First consumers are club selection and the career header.** League table, fixtures and the match scoreboard follow as their own tickets. The Brazilian logos (a new adapter plus Série A/B mappings) follow once that dump is provided.

## Testing Decisions

Good tests here observe behaviour through the highest existing seam: what a save returns, what a
screen renders, what the import writes. They never check how a module computes it. Three seams were
agreed:

- **Library integrity.** One test compares the committed manifest, the files on disk and every content pack's `clubBadges`. It fails on a manifest entry with no file, a file with no entry, a stale hash, or a pack mapping to a key the manifest lacks. Prior art: the committed-artifact check in the `verify-db-schema` gate and the content pack tests in the shared package.
- **Import core.** The shared import logic runs against a small fixture dump and observes the written library and report. It checks slugging (accents, `&`, apostrophes, spaces), newest-wins across season folders, a stop on an unknown league prefix, a stop on a same-country key collision and its override, idempotence on a second run, and refusal to drop a pack-referenced key.
- **Main-process reads.** A generated save (Premier League or La Liga) returns a `badgeKey` for every club its pack maps, a fictional-pack save returns `null`, and coverage reporting logs a club the pack names but doesn't badge. Prior art: the display-names tests, which already generate real saves and resolve names and packs through them.
- **Renderer.** Given a known key, `ClubBadge` renders an image with that logo's URL. Given a null or unknown key, it renders the colour shield with initials. The club selection screen test proves the logo reaches the screen. Prior art: the club selection screen tests.

## Out of Scope

- Licensing: which logos may ship, and excluding licensed art from a build.
- Historical crests, per-season logos, and any screen showing a past season's badge.
- Logos for competitions, nations or kits.
- Brazilian logos and the Série A/B mappings, until that dump is provided.
- Logos on screens beyond club selection and the career header, each a follow-up ticket.
- Mappings for leagues with no content pack (every European league except the Premier League and La Liga). Their logos enter the library but no club resolves to them yet.
- Serving logos through a main-process protocol, or storing them in any database.
- Image optimisation (WebP conversion, resizing).

## Further Notes

- **Prerequisite, already fixed:** Premier League careers were generated under the fictional pack. The English pack was in the registry used to read saves, but pack selection at generation never returned it, so no save ever recorded it. Pack selection now returns it for an English top-division career, as it does for Série A and La Liga. The default English save now reports its national cup as its one unnamed id, the same designed behaviour Brazil's cup has.
- The dump at the repo root must be removed after the first import, and ignored by git until then.
- The current dump's source repository is `football-logos` (139x181 RGBA PNGs, 25 European top flights, seasons 2021–22 to 2026–27).
