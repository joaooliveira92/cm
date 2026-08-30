# 03 — Dense table pattern and status abbreviations

Type: task
Status: ready-for-agent
Blocked by: 02

## Question

How does the clone render the primary data table (squad screen) and player-status abbreviations, informed by `docs/ui-elements.md` §6 and the current SquadScreen implementation?

### Table density

CM 03/04's squad table used: many columns, small fonts, tight row spacing, scrollable, compact status markers. The current SquadScreen.tsx renders 4 fixed columns (Name, Age, Positions, OVR) plus all 30+ attributes across the table.

Decide:
1. What is the default column set for the squad view? CM showed: Name, Position, Status, Fitness, Morale, Apps, Goals, Avg Rating, Value. Attributes were not all shown at once — CM used view switching (General/Contract/Fitness/Form/Transfer/Selection).
2. What is the "compact" vs "detailed" view distinction?
3. Minimum row height and font size for optimal density at 1024×768.
4. How many columns are visible before horizontal scroll is required?

### Status abbreviations

CM 03/04 used ~25 compact text abbreviations (Lmp, Inj, Sus, Wnt, Bid, Yel, Int, Fgn, Ine, Wpm, Tir, Cup, Loa, Lst, Unh, Unf, Sct, Yth, Req). Some map to modeled game concepts; others do not.

Decide:
1. Which statuses from the CM list have modeled equivalents in the clone (Inj → Injury, Sus → Suspended, Int → international duty, etc.)?
2. Which statuses have no modeled equivalent yet but are worth reserving a display slot for (Wnt, Bid, Unh, etc.)?
3. Display format: abbreviations (CM style), full text, icons, or hybrid?
4. Where in the row does status appear? CM showed it beside the player name — is that the right placement?
5. Color or visual treatment for different status categories (injury = red, suspension = yellow, etc.)?

### Row interaction

CM 03/04: click player name → player profile. Actions menu per row with transfer/contract/scout commands.

Decide:
1. Does clicking a row navigate to the player profile? If so, what's the profile screen?
2. Does the clone need a contextual Actions menu per row, or are actions accessible through the keyboard-first command palette?
3. How do the table interactions compose with the keyboard-first roving tabindex design?