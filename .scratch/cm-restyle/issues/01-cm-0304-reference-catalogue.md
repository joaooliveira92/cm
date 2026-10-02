# 01: CM 03/04 reference catalogue per screen kind

Type: research
Blocked by:
Status: resolved

## Question

What did Championship Manager 03/04 (and 4, where 03/04 is undocumented) look like for each kind of
screen this renderer has: dense player lists and tables, a player or staff profile, a club
information page, league tables and fixtures, the news inbox, search screens, the finances and
board screens, the match day screens (live match, commentary, statistics), the main menu and new
game flow, and its dialogs and pop-up windows? For each kind, capture: panel structure and titles,
column-heading treatment, button and dropdown styles, row striping and selection, how numbers and
ratings are coloured, and any layout that clearly differs from a generic list. Cite sources
(screenshots on archived fan sites, manuals, videos) and write the findings to
a new `cm-0304-screen-reference.md` under `docs/research/`. No git operations.

## Answer

**Written to [cm-0304-screen-reference.md](../../../docs/research/cm-0304-screen-reference.md),**
from the retail game's own layout and skin files (exact hex), 44 MobyGames screenshots of 4.1.4 and
5 pre-release shots. The default "Ter 03-04" skin washes the backdrop photo 70% black under white
text. Every screen shares one frame: slate sidebar, club-coloured title bar, a blue pill-tab strip,
and a thin blue bottom bar with a `+++` ticker. Two yellows: `#ffff33` for titles, own club and
selection, `#ffd000` for values (`#fff000` for attributes of 15+). Tables run on a blue band
(≈`#305888`). Squad, profile, news, staff profile and finances have their own CM layouts. Match
commentary is a single line in a team-coloured bar. Dialogs are opaque slate (≈`#404c6c`), the one
place the photo does not show. Thin coverage: Club Information, league-positions graph and the
new-game nation picker (layout files only).
