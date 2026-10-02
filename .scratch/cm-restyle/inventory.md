# cm-restyle: renderer screen and style inventory

Taken 2026-10-02 at `dev` 16457228 by [Renderer screen and style inventory](issues/02-renderer-screen-and-style-inventory.md).
Paths are relative to `apps/desktop/src/renderer/`. "cls" counts `className=` in the feature
folder, a rough measure of bespoke styling; "raw" counts Tailwind default-palette classes
(`bg-sky-900`, `text-yellow-300`, ...) that bypass the tokens. Playwright specs are matched by
folder name, so they are a starting list, not proof of coverage.

## The shared layer

This is where binding decision 6 puts the look; restyling it reaches most screens unedited.

| Piece | Reach |
|---|---|
| `components/ui` primitives (files importing each, outside `components/ui`) | button 67 · alert 36 · select 16 · badge 15 · table 14 · key-value 9 · input 9 · card 9 · label 6 · tabs 5 · kbd 5 · dialog 5 · sidebar 4 · tooltip 3 · popover 3 · separator 2 · autocomplete 2 · spinner, skeleton, sheet, progress, number-ticker, hover-card, dropdown-menu, command, calendar, button-group 1 each |
| Unused primitives (0 importers) | toggle-group, toggle, textarea, scroll-area, radio-group, liquid-glass, item, gradient-background-text, glass-card, field, empty, checkbox, alert-dialog, accordion. They need no restyle; whether to delete them is outside this effort. |
| `theme.ts` constants (importing files) | PANEL 11 · MODAL_SCRIM 11 · MODAL_TITLE_BAND 11 · MODAL_BODY 10 · MODAL_COMPACT 9 · PANEL_STRONG 3 · MODAL_SCRIM_TOP 3 · MODAL_WIDE 3 · BTN_SECONDARY 2 · FIELD_INPUT/SELECT/LABEL 2 · PANEL_CHROME, BTN_PRIMARY, CHROME_BAND, FIELD_RIM 1 |
| `components/reui` | `data-grid` (League Table), `event-calendar` (Fixtures), `icon-stack` |
| `table/` | the shared DataTable family (DataTable, header, body, panel, filters), used by the squad and transfer tables |
| `index.css` | `@theme` role tokens, the `chrome-gradient*`, `stadium-wash`, `backdrop-*`, `pitch-grass`, `club-header` and `cm-button-gradient` utilities, the `--color-cm-*` tokens |
| `tactics/cmChrome.ts` + `tactics/instructionRows.tsx` | the CM classes and rows the Tactics editor uses; to fold into the shared layer |

## App chrome and overlays

- **Chrome**: `chrome/CareerChrome.tsx` (layout, toolbar band), `chrome/header/*` (AppTitleBar, ShellHeader, MatchHeader with the two-club scoreboard, HeaderNav, HeaderSearch, HeaderActionsMenu, CareerIdentity, `club-scheme.ts` for the club paint), `chrome/bottom-bar/*` (ShellBottomBar, StatusMarquee), `chrome/CareerBottomBar.tsx`, `chrome/ContinueResult.tsx`, `chrome/SaveGameAction.tsx`; the sidebar and context tabs under `navigation/`.
- **Overlays**: `dialog/LightweightDialog.tsx`, `discoverability/` (CommandPalette, HelpOverlay, TeachingSplash, ShortcutHint, ActionKeyBadge), `quitGuard/QuitGuard.tsx`, `appearance/PreferencesDialog.tsx`, `chrome/header/ActionConfirmDialog.tsx`; screen dialogs in `scouting/ScoutPlayerDialog.tsx`, `squad/AttributeFilterDialog.tsx`, `squad/SquadTable.tsx`, `tactics/SetPrioritiesPanel.tsx` (popover), `create/DateOfBirthField.tsx` (popover); the `MODAL_*` constants carry the rest.
- **Backdrop**: `backdrop/Backdrop.tsx` behind the shells; screens that reference it directly: `squad`, `tactics`, `create`.

## Screens by group

Sidebar groups come from `NAV_GROUPS` in `navigation/nav-config.ts`. Screens reached only from
another screen (a club, player, staff member or competition) are listed as drill-downs, since no
sidebar section owns them.

### Team (Squad, Tactics, Training)

| Folder | Size | cls | raw | ui primitives | Notes · Playwright |
|---|---|---|---|---|---|
| squad | 24f 3221L | 71 | 0 | alert, button, dialog, dropdown-menu, select, sheet, table | backdrop; lineup bar · app, club-squad, contract-offer, contract-renewal, development-centre, keyboard, player-screen-scouting, player-search-scouting, router |
| squadStaff, squadInformation, squadFinances, squadHistory | 13L each | 3 | 0 | — | placeholders |
| tactics | 17f 3857L | 248 | 4 | alert, badge, button, card, command, key-value, popover, table | already CM; reconcile onto the foundation · app, journeys, keyboard, router, contract-offer, error-paths |
| training | 19f 1873L | 145 | 0 | alert, button, select | six screens (overview, coaching, schedule, workload, plan, development centre) · club-staff-nav, development-centre, performance-report, training-plan, training-workload |

### Operations (Recruitment, Analysis)

| Folder | Size | cls | raw | ui primitives | Notes · Playwright |
|---|---|---|---|---|---|
| transfers | 19f 2679L | 83 | 0 | alert, button, input, select, table, tabs | MODAL_* · app, club-fixtures-and-transfers, contract-offer, error-paths, journeys, keybindings, keyboard, player-search-scouting, router, transfer-history, transfers-market |
| transferHistory | 2f 125L | 8 | 0 | table | transfer-history |
| shortlist, staffSearch | 13L each | 3 | 0 | — | placeholders |
| scouting | 12f 1724L | 123 | 0 | alert, button, dialog, key-value, progress, select, table, tabs | three screens + Team Scout Report · scouting-assignment, scouting-centre, scouting-knowledge, player-search-scouting, player-screen-scouting, club-squad, contract-offer, journeys, transfers-market |
| playerSearch | 2f 501L | 25 | 0 | button, input, select, table | player-search-scouting |
| contractExpiry, budgetReview | 95L, 122L | 17, 8 | 0, 1 | — | PANEL · contract-expiry-and-budget-review |
| leagueTable | 2f 326L | 18 | 0 | alert, hover-card | reui data-grid; club hover card · club-* specs via `e2e/leagueRow.ts` |
| fixtures | 3f 208L | 15 | 0 | alert, card, spinner, table | reui event-calendar · app, club-fixtures-and-transfers, competition-overview, competition-results, router |
| seasonSummary | 132L | 19 | 0 | alert, badge, card | — |

### Club & World (News, Club, World)

| Folder | Size | cls | raw | ui primitives | Notes · Playwright |
|---|---|---|---|---|---|
| news | 2f 518L | 29 | 0 | alert, badge, button, card, input | PANEL |
| managerProfile | 10f 777L | 130 | 2 | alert, badge, button, card, key-value, tabs | seven manager screens; MODAL_* |
| clubInfo, finances, staffOverview, boardConfidence | 46–133L | 3–11 | 0 | — | PANEL (boardConfidence) · club-finances-and-board |
| competitions | 1f 217L | 10 | 0 | alert | World section entry |

### Drill-downs

| Folder | Size | cls | ui primitives |
|---|---|---|---|
| playerProfile, playerContract, playerDevelopment, playerCoachReport, playerComparison | 23–272L | 2–30 | button, select (contract) |
| clubSquad, clubStaff, clubInformation, clubFixturesDetail, clubTransfersDetail, clubFinancesDetail | 73–194L | 7–11 | key-value (information) |
| staffProfile | 286L | 20 | table |
| competitionOverview, competitionTable, competitionFixturesDetail, competitionResults | 114–147L | 6–19 | alert, table |

The club drill-downs are reached through the League Table hover card; their Playwright specs are
club-squad, club-staff, club-information, club-finances-and-board, club-fixtures-and-transfers.

### Match day

| Folder | Size | cls | ui primitives | Notes · Playwright |
|---|---|---|---|---|
| match | 41f 3745L | 152 | alert, badge, button, select | Match Day screen, live feed, commentary bar, LiveCommandFrame; an active commentary effort edits it · app, journeys, keyboard, router, commentary-bar, club-squad, player-search-scouting, transfers-market |
| matchMatchTactics, matchSubstitutions | 112L, 118L | 0, 9 | button | LiveCommandFrame screens |
| matchPreview, matchReport, matchCommentary, matchRatings, matchStats, matchHomeTeam, matchAwayTeam | 44–161L | 5–25 | alert, button | — |
| matchLatestScores, matchLiveTable, matchOppositionInstructions, matchPlayerStats, matchReplays | 13L each | 3 | — | placeholders |

### Pre-career

| Folder / file | Size | cls | ui primitives | Notes · Playwright |
|---|---|---|---|---|
| `router/mainMenu.tsx`, `router/loadCareer.tsx` | — | — | — | read the appearance preference; recently hand-edited · save-management, router |
| create | 24f 2775L | 107 | alert, autocomplete, badge, button, calendar, input, key-value, label, popover, select, tabs | backdrop; MODAL_* · journeys, router, save-management |
| leagueSelection, activeLeagues | 1539L, 2573L | 59, 72 | alert, button, card, input, key-value, select, separator | active-leagues-setup |
| clubSelection | 24f 851L | 58 | alert, badge, button, card, number-ticker, select, skeleton, tooltip | PANEL_STRONG, FIELD_LABEL |

## Placeholders

Eleven screens are 13-line placeholders and inherit the look from the shell: squadStaff,
squadInformation, squadFinances, squadHistory, shortlist, staffSearch, matchLatestScores,
matchLiveTable, matchOppositionInstructions, matchPlayerStats, matchReplays.

## Appearance preference consumers

For [Retiring the appearance preference](issues/04-retiring-the-appearance-preference.md):

- `appearance/appearance.ts` (option lists, `localStorage` persistence, attribute write),
  `appearance/palettes.css` (7 base × 18 theme palettes), `appearance/PreferencesDialog.tsx`;
- `main.tsx` (applies the stored choice at startup), `index.css` (the `theme-neutral` custom
  variant and the role tokens reading the palette variables);
- readers of the theme state: `chrome/CareerChrome.tsx`, `router/mainMenu.tsx`,
  `router/loadCareer.tsx`, `squad/SelectionIndicator.tsx`;
- `test/renderer/appearance/appearance.test.tsx`.

## Tests that assert on styling

27 class-name assertions across 11 unit test files (`level1-a11y`, `tactics/keyboard-reachability`,
`tactics/tactics-overview`, `navigation/context-tabs`, `components/read-state-message`,
`table/scroll-edge-fades`, `squad/squad-views`, `chrome/continue-control`, `clubSelection/screen`,
`competitionFixturesDetail/CompetitionFixturesDetailScreen`, `router/main-menu`). No Playwright spec
asserts on classes or CSS; the e2e drift risk is visible text and roles, not styling. 33 Playwright
specs in total.
