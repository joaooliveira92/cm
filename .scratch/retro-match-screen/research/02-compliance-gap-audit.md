# 02-compliance-gap-audit — findings

Ticket: [02-compliance-gap-audit](../issues/02-compliance-gap-audit.md)

## Scope and method

Read the full 27-section brief (`.scratch/retro-match-screen/references/brief.md`, 1,312 lines) and every
file of the scaffold at `apps/desktop/src/renderer/components/match-screen/` (15 files, ~2,300 lines: all
components, `types.ts`, `formatters.ts`, `mock-fixtures.ts`, `styles.css`, plus the in-folder demo). Also
read the live `MatchDayScreen.tsx`, `App.tsx`, the stray `components/MatchScreenDemo.tsx` +
`components/mock-fixtures.ts`, `packages/contracts/src/rpc.ts`, the `keyboard-first-renderer` map
(decision 11, relevant to mount ticket 03), and every file under `apps/desktop/test` and
`apps/desktop/e2e`. Strictly read-only — no scaffold file was modified. No reference screenshots exist on
disk (glob for images under `.scratch/retro-match-screen/` found none), so §24 fidelity is assessed
structurally only.

## Section-by-section audit

### §1 Mission — PARTIAL
- Full screen composition and all listed regions exist as components (`MatchScreen.tsx:1-12`).
- "Data-driven" is mostly honored (teams/incidents/fixture/possession come from state), but presentation
  components embed fixture values anyway: version hardcoded (`Sidebar.tsx:100`), preformatted fixture
  dates (§12), and a wrong "Tottenham v Blackburn" status string (`mock-fixtures.ts:118`).
- "Original replacement assets": zero assets shipped. `.stadium-background` (`styles.css:432-438`) is dead
  CSS — nothing renders it — and the font is the system stack only.

### §2 Shared structure and state differences — PARTIAL
- Layout skeleton corresponds 1:1 to the shared-structure list (`MatchScreen.tsx:51-127`).
- All three reference states are expressed as data variations of one component
  (`mock-fixtures.ts:6,133,259`), matching "variations of the same component" — but the calendar-mode
  variation (Reference B date/time sidebar) is unrepresentable in the state model (see §7.2, §16).

### §3 Recommended technical direction — PARTIAL
- React 19 + TypeScript + one global `styles.css` (vanilla, not locally scoped — the weakest option the
  brief allows, which is trivially fixable).
- Vitest/RTL/Playwright exist repo-wide; **no tests target this screen** (§23).
- Runtime validation: brief recommends Zod; scaffold has **none** — `types.ts:2` says "Pure TypeScript
  types - no runtime validation dependencies". The repo standard is Effect Schema (see Fixture-code
  coexistence), and the scaffold uses neither.
- Engineering qualities: "no duplicated screen implementations" violated (two identical demos, §below);
  "no match-specific values in components" violated (§7/§12/§15); "no unexplained numeric constants"
  mostly met (dimensions are tokens, §5); "tests for state-dependent labels and visual proportions" —
  none.

### §4 Target viewport and scaling model — MISSING
- No 1024×768 logical canvas: `.match-screen` is `width:100%; height:100%` of its container
  (`styles.css:61-62`).
- No 4:3 preservation, no `scale()` transform, no pointer/focus/text-clarity verification of a scaled
  canvas, no center-or-grow rule for wider windows.
- Below-800 handling is token shrink (`styles.css:944-967`), not the §19-prescribed scale-the-canvas or
  landscape-message path.

### §5 Global layout — MET
- CSS Grid shell `grid-template-columns: var(--sidebar-width) 1fr` (`styles.css:66-72`).
- Every recommended logical dimension exists as a named token inside its range: sidebar 88 (84-90),
  main-gap 6 (5-8), scoreboard 68 (64-70), primary-tabs 24 (22-25), overview 400 (380-430), fixture 104
  (96-108), secondary-tabs 24 (22-25), possession 44 (40-48), bottom-toolbar 32 (30-34) —
  `styles.css:32-40`.
- Caveat: `--main-gap` is declared (`styles.css:33,918`) but never consumed by any rule — a dead token.

### §6 Visual design system — MET
- Color tokens copy the brief verbatim: `--chrome-blue-*`, `--panel-*`, `--text-*`, `--score-*`,
  `--possession-divider`, `--focus-ring` (`styles.css:3-29`).
- Font fallback stack matches the brief suggestion exactly (`styles.css:43`); every type size is inside
  its brief range (`styles.css:44-53`): team 26 (24-29), score 24 (22-28), heading 17 (16-18), tabs 12
  (11-13), incident 13 (12-14), fixture 12 (11-13), sidebar 12 (11-13), clock 28 (25-30), version 9 (8-10).
- Beveled glossy chrome on buttons/panels/score box (`styles.css:109-131,334-352,449-463`); no
  flat-dashboard look.

### §7 Sidebar — PARTIAL
- Full structure present: status block, prev/next, Continue, Manager Profile, Competitions, Nations &
  Clubs, Screen History, Game Options, flexible area, version label (`Sidebar.tsx:41-102`).
- §7.2 status modes: **full-time mode is half-present** — it shows the digit with an apostrophe
  (`121"`, `Sidebar.tsx:32-34`) but never the "Full Time" word label; **calendar-time mode (Wednesday /
  17.12.2003 / 19:30) does not exist** — the `scheduled` union variant carries one flat `value: string`
  and renders a single line (`Sidebar.tsx:29-31`, `types.ts:29-33`).
- History arrows: two square buttons, yellow triangles, `aria-label` "Previous screen"/"Next screen",
  disabled reduces opacity (`Sidebar.tsx:47-66`, `styles.css:152-155`) — meets §7.3.
- Continue is yellow (`styles.css:171`); **Game Options is white, not yellow** (`styles.css:222`) — §7.4
  partial.
- Version label is styled yellow-green (`styles.css:253-260`) but the value **`v1.02` is hardcoded**
  (`Sidebar.tsx:100`). `ApplicationMetadata.versionLabel` exists (`types.ts:101-103`) and every fixture
  carries it (`mock-fixtures.ts:126-128`) yet it is never passed to the Sidebar — §7.5 value-in-metadata
  unmet.

### §8 Scoreboard — PARTIAL
- **49/51 home/away split not implemented**: the grid is `1fr auto 1fr` centered on the score boxes
  (`styles.css:272-273`), i.e. equal regions, not 49/51.
- Score box 58px wide (54-62) and outer height 68 (64-70) (`styles.css:334-352,34`); home name left /
  away name right, vertically centered, 18px padding (12-18) (`styles.css:285-324`) — met.
- Score-box face: white→gray gradient, 2px dark outline, radius 10, inner top highlight, lower shadow —
  met (`styles.css:334-352`).
- Dynamic foreground via explicit `theme.foreground` (`Scoreboard.tsx:20,43`; `types.ts:4-8`) — met.
- No shift on one-digit change: `font-variant-numeric: tabular-nums` + fixed 58px box
  (`styles.css:358,334`) — met.

### §9 Primary tabs — PARTIAL
- `role="tablist"`/`role="tab"`, `aria-selected`, `aria-disabled`, real `disabled` prop, hover brighten,
  separators, connected blue bar (`PrimaryTabs.tsx:18-30`, `styles.css:383-420`); selected yellow /
  unselected white — met.
- **Arrow-key tab navigation missing** — no roving tabindex, no `onKeyDown` anywhere in the scaffold.
- Enter/Space activate via native `<button>` — met.
- Disabled-tab machinery exists but is **never exercised**: no tab in any fixture has `disabled:true`, and
  the 2D Pitch label is absent from every `primaryTabs` array (`mock-fixtures.ts:104-109,230-235,349-355`).
- **No `role="tabpanel"`**, no `aria-controls`; non-Overview tabs render a placeholder sentence
  (`MatchScreen.tsx:105-111`).

### §10 Stadium background and overlay — PARTIAL
- Layering skeleton in the brief's order exists: dark tint `z-index:1` (`styles.css:440-446`), translucent
  panels `z-index:2` with `rgba(5,12,13,0.72)` (`styles.css:452`).
- **No stadium image and no venue-driven switching**: `.stadium-background` rule is dead CSS
  (`styles.css:432-438`); `StadiumOverlay` renders only the 72% black tint (`StadiumOverlay.tsx:10-16`);
  every fixture's `stadiumBackgroundId` is silently ignored (`mock-fixtures.ts:116,242,361`).
- "Stadium visible but darkened" (§10) and "text contrast above the stadium" (§20) cannot hold without an
  image.

### §11 Match incidents panel — PARTIAL
- Heading "Match Incidents" yellow, bold, left (`styles.css:466-474`) — met.
- **§11.2 four-column grid is declared but miswired**: `grid-template-columns: 1fr 60px 1fr 60px` exactly
  as asked (`styles.css:485`), but the grid has only **two** children — `.incident-column--home` and
  `.incident-column--away` (`MatchIncidents.tsx:43,68`). Auto-placement puts the away column in grid cell
  (row1, col2) — the first 60px minute track — not column 3, so the two 60px tracks are never used as
  minute columns, and rows inside each column are flex (`styles.css:510-517`) rather than a grid-row
  across the four tracks. The brief's home-name|minutes|away-name|minutes row model is not achieved.
- All nine incident types plus `stoppageTime` in the union (`types.ts:35-54`); minutes formatted from
  `number[]` via `formatMinutes` (`formatters.ts:1-3`) — met.
- Injury orange via `.incident-row--injury` (`MatchIncidents.tsx:49,74`, `styles.css:519-522`) — met.
- §11.5 period summary: partial — renders half/full/extra-time lines from structured `periodScores`
  (`MatchIncidents.tsx:94-121`) but: `penalties` is dropped from the props (`MatchIncidents.tsx:8-12`), so
  no penalty segment; labels are hardcoded English (no localizable path); and the two derivation helpers
  `formatPeriodScores`/`formatSummary` (`formatters.ts:9-47`) are **never imported** — the derivation is
  re-implemented inline in JSX.

### §12 Fixture panel — PARTIAL
- Two groups of three rows (Competition/Referee/Venue | Date/Weather/Attendance) plus optional Round
  (`FixturePanel.tsx:20-54`) — met.
- Grid `105px 1fr 105px 1.25fr` matches the brief exactly (`styles.css:594-599`); labels white, values
  yellow (`styles.css:605-615`) — met.
- **Attendance**: `toLocaleString()` (`FixturePanel.tsx:52`) produces grouped "32,145"/"34,133"; the
  §12.3 clone default is **no grouping** (34133) behind a `useGrouping` option. The unused
  `formatAttendance` helper (`formatters.ts:91-93`) returns the ungrouped form but is never wired.
- **Dates**: a real ordinal formatter exists with correct 11/12/13 and 21/22/23 rules
  (`formatters.ts:54-84`), but the fixtures **store preformatted strings** ("Saturday 1st November 2003")
  and `FixturePanel` passes them through verbatim when `new Date()` parsing fails
  (`FixturePanel.tsx:11-13`, `formatters.ts:70`) — the real formatter is **never exercised by any
  fixture**. Direct §12.4 violation ("do not store the entire formatted date").
- Weather structured (condition + temperatureCelsius) with `formatWeather` → "Dry 3°C" — met.

### §13 Secondary context tabs — MET (component), caveat on fixtures
- Array-driven, no fixed count, even `flex:1` distribution, white text, connected bar, no-wrap via
  `white-space:nowrap` + `min-width:0` + ellipsis (`SecondaryTabs.tsx:16-38`, `styles.css:637-656`) — the
  940px five-tab case cannot wrap.
- Fixture caveat (a §22 problem, not a component defect): Scenario 3 ships **three** secondary tabs where
  the brief requires five (`mock-fixtures.ts:356-360`); Scenarios 1/2 ship four.

### §14 Possession panel — PARTIAL
- Label left; home segment from left, away from right, with **true percentage widths driving the
  boundary** (`PossessionPanel.tsx:26-34`) — met, the boundary does move with data.
- Team-theme colors, not an independent chart palette — met (`PossessionPanel.tsx:26-34`).
- `normalizePossession` scales to sum 100 (`formatters.ts:95-100`) — met; but **§14.3 finite/non-negative
  validation is missing** (NaN/negative inputs yield invalid widths; the only guard is `total === 0` →
  50/50; irrelevant percentages: the off-by-one is absorbed by `100 - rounded(home)`).
- Accessible text `Home possession X%, away possession Y%` via `role="img"` — met
  (`PossessionPanel.tsx:22`).
- **§14.4 caveat**: a 1px decorative line sits at `left:50%` unconditionally
  (`styles.css:731-739`), so a fixed center anchor remains even at 58/42. Segments track the data, but the
  fixed center marker reads against "the visual boundary must move".

### §15 Bottom command bar — PARTIAL
- Structured status segments `text | separator | spacer` (`types.ts:90-93`); the loop renders text and
  separator but **`spacer` renders nothing** (`BottomCommandBar.tsx:33-41`).
- Fixture bug inside §15: Scenario 1's status text is `"Tottenham v Blackburn +++ League Cup 4th Rnd"`
  (`mock-fixtures.ts:118`) while the fixture's teams are Sunderland v Blackburn — a fixture-specific value
  leaking into data, and the only presence of the brief's example content.
- Options button renders `Options ▼` (`BottomCommandBar.tsx:56-58`) but **there is no Options menu at
  all** — `onOpenOptions` is a bare callback the demo answers with `alert()`
  (`MatchScreenDemo.tsx:23-25`). No menu UI, no outside-click, no Escape, no keyboard nav, no portal, no
  stacking above the bar.
- Tactics buttons: one per team, full club name as label, permission-gated — but **conditionally omitted
  instead of disabled** (`canEditHomeTactics && <button>`, `BottomCommandBar.tsx:45-54`). Club `id` props
  are passed through (`MatchScreen.tsx:116-117`) but no click path consumes them; navigation is role-based
  callbacks, which satisfies "never derive navigation from the visible name".

### §16 Proposed data model — PARTIAL
- Surface matches the brief's `MatchScreenState` almost field-for-field (`types.ts:105-123`): `matchId`,
  clubs, `Score`, `periodScores` incl. `penalties`, `incidents`, `possession`, `primaryTab`+`primaryTabs`,
  `secondaryTab?`+`secondaryTabs`, `stadiumBackgroundId`, `bottomStatus`, `permissions` — all present.
- Divergences: `clock` is a `__typename` union (`types.ts:29-33`) vs brief `MatchClockState.mode` +
  `currentDateTime`; the `scheduled` variant holds one preformatted `value: string` and **cannot carry a
  calendar date/time** (§7.2 blocker); state type named `Matchscreen` vs `MatchScreenState`;
  `metadata: ApplicationMetadata` is embedded in state (`types.ts:101-103,122`) while the brief keeps it
  standalone.
- **Runtime validation (brief §16: "validate external or fixture JSON … before rendering") — MISSING.** No
  Zod, no Effect Schema, none anywhere; `types.ts:2` declares it intentional.

### §17 Component architecture — PARTIAL
- Tree matches the brief's nesting one-to-one at top level, flattened one file per region (`MatchScreen.tsx`
  composes its children) — acceptable granularity.
- Formatters live outside visual components (`formatters.ts`) — met; imported by `FixturePanel`,
  `MatchIncidents`, `PossessionPanel`.
- Separation violations: sidebar hardcodes the version (`Sidebar.tsx:100`); fixtures carry preformatted
  kickoff strings consumed verbatim (§12); two identical demos at two paths (§3). No memoized selectors;
  contrast logic is the explicit `theme.foreground` (fine).
- **Dead code**: of 11 exported helpers, 7 are never referenced — `formatStoppageTime`,
  `formatPeriodScores`, `formatSummary`, `getInjurySummary`, `formatAttendance`, `getTeamForegroundColor`,
  `clamp` (not imported by any component; verified by grep).

### §18 Interaction requirements — PARTIAL
- **Continue Game**: no dup-activation guard and no pressed/processing state — only
  `disabled={!canContinue}` (`Sidebar.tsx:68-72`, `MatchScreen.tsx:16`); the brief explicitly requires
  "prevent duplicate activation while the command is processing".
- History arrows: disabled-state props are wired (`MatchScreen.tsx:20-23`), but the only producer is the
  demo (`MatchScreenDemo.tsx:44` hardcodes `isPreviousDisabled={true}`); no real screen-history
  infrastructure.
- Tabs: switching preserves the shell, fine; but no `role=tabpanel`/`aria-controls`, and non-Overview tabs
  are placeholders.
- Tactics: role-based callbacks, return context left to the host — acceptable at component level.
- **Options menu: MISSING** (§15) — every §18 Options bullet (Escape, outside click, keyboard, portal,
  not-cropped) is unbuilt.

### §19 Responsive behavior — PARTIAL
- Real breakpoints at 940 (`styles.css:915-942`) and 800 (`:944-967`) shrinking tokens: sidebar 88→84→80,
  team-name 26→24→22, score box 58→54→50, fixture columns 105→95→85; secondary tabs never wrap; fixture
  panel stays row-based.
- §19's 940px targets (name shrink ~1-2px, incident-panel height reduced before removing content, bottom
  buttons visible) are met in spirit by token shrink.
- **The underlying §4/§19 scale model (4:3 canvas, below-800 scale-or-landscape) is absent** — linked to §4.

### §20 Accessibility — PARTIAL
- Semantic `<button>` everywhere; `role="tablist"`+`role="tab"` with `aria-selected`/`aria-disabled`
  (`PrimaryTabs.tsx:18-30`, `SecondaryTabs.tsx:18-30`); **`role="tabpanel"` absent**; arrow-key roving
  absent (§9).
- Visible `:focus-visible` ring (`styles.css:888-900`) — met.
- Possession accessible text — met (§14); injury/cards not conveyed by color alone (icon + text) — met;
  `prefers-reduced-motion` global block (`styles.css:903-912`) — met; no flashing — met.
- Stadium-decorative and contrast-above-stadium bullets are moot (no stadium image).

### §21 Animation — PARTIAL
- All present transitions are 80ms (buttons/tabs, `styles.css:132,180,237,396,655,837,875`) or 140ms
  (overlay fade `:14`, possession `:719`) — inside the 80-140ms band; none of the "avoid" list (springs,
  bouncing, continuous gloss movement, layout-shifting transitions) is present.
- Unbuilt allowed items: menu-opening fade (no menu), tab crossfade, scoreboard update pulse (no
  score-change machinery), possession transition on live data change (CSS exists; nothing feeds updates).
- Reduced-motion respected — met.

### §22 Required fixture scenarios — PARTIAL
- Three fixtures exist for the three scenarios (`mock-fixtures.ts:6,133,259`). Gaps per scenario's
  explicit demonstration list:
  - **Scenario 1 (ET finish)**: elapsed 121 ✓, extra-time score ✓ (`:32`), halftime score ✓, injury ✓
    (`:79-86`), uneven possession 58/42 ✓, four secondary tabs ✓ — **"Full Time" label not rendered** (§7),
    and the `periodScores` do not sum to the headline: HT 1-1 + FT 3-3 + ET 1-0 gives 4-3, not score 5-3
    (`mock-fixtures.ts:29-34` vs `:28`) — the fixture data is internally incoherent for the brief's
    derivation.
  - **Scenario 2 (high-scoring league)**: different team colors ✓ (gold/red vs graphite), multiple minutes
    for one participant ✓ (45,57 twice), near-even possession 49/51 ✓, long referee/venue ✓ — **but
    calendar date/time sidebar mode absent** (clock is `full-time: 94`, `mock-fixtures.ts:162-165`).
  - **Scenario 3 (draw)**: equal final score 3-3 ✓, halftime deficit 0-2 ✓, stoppage-range 94 ✓,
    possession 45/55 ✓, bottom status segments ✓ — **but only 3 secondary tabs (brief requires 5)**
    (`mock-fixtures.ts:356-360`) and no "Full Time" label.
- Trademark note (informational): fixtures reuse real 2003 club names (Sunderland, Blackburn, Tottenham,
  Wolves, Charlton); §22 asks for original names if distributing publicly.

### §23 Testing requirements — MISSING
- **No unit, component, visual, or e2e coverage of match-screen exists anywhere.** There are no
  `*.test.ts` under `apps/desktop/src` at all; `apps/desktop/test` (13 vitest files) covers only
  main-process logic (saves, match, decider, tactics, transfers, season, seed-saves, fitness, …);
  `apps/desktop/e2e` holds 4 Playwright specs (save-management, error-paths, journeys, app) plus a launch
  helper. None reference match-screen (grep: zero hits). Not one §23 item (ordinal dates, weather,
  possession normalization, injury class, period-summary generation, disabled-tab/button activation,
  continue-once, …) is tested — the components have no test harness (no RTL, no Playwright config for the
  renderer).

### §24 Visual-fidelity checklist — PARTIAL (unverifiable)
- Structurally satisfied: sidebar ~88px of 1024 ≈ 8.6% (8-9%) ✓, scoreboard dominates the top row ✓, score
  boxes near center ✓, home/away alignment ✓, tabs immediately below scoreboard ✓, overview panel
  translucent ✓, incidents heading yellow ✓, fixture two groups of three with yellow values ✓, secondary
  tabs span width ✓, possession colors from themes ✓, tactics right-aligned ✓, beveled/glossy chrome ✓, no
  modern flat conventions ✓.
- Structurally failed: **stadium background visible with readable text over it** — no stadium image at all;
  **incident name/minute column grid** — miswired (§11).
- The comparison half of the checklist requires the reference screenshots, which are not in the repo
  (ticket 04); until then this section can only be scored structurally.

### §25 Explicit non-goals — MET
- The scaffold adds nothing from the non-goal list (no simulation engine, no player DB, no real assets, no
  3D, no mobile-first restructure, no analytics charts, no online play). Compliant by absence.

### §26 Agent execution order — MISSING
- What exists covers roughly steps 3-14 in one pass (tokens, fixtures, layout, all panels). The acceptance
  tail — step 15 keyboard/a11y polish (arrow tabs, Options menu), 16-17 tests + Playwright shots, 18
  validation commands, 19-20 screenshot comparison + correction (blocked without ticket 04), 21 report —
  is entirely undone. No validation or test artifacts exist; the scaffold has never been run through the
  repo gates (today it would not typecheck because of the stray duplicate, see Fixture-code coexistence).

### §27 Required final report — MISSING
- No implementation summary, no validation/lint/test/build results, no visual-check results, no
  files-changed list, no limitations, no suggested commit exist anywhere. The scaffold is untracked (all
  files under `components/` show as `??` in `git status`) with no commit history.

## Fixture-code coexistence (working tree facts)

- **MatchDayScreen imports nothing under components/match-screen.** `MatchDayScreen.tsx:1-24` imports only
  `@cm-clone/contracts` and `@cm-clone/shared`; `App.tsx:216` renders `MatchDayScreen` (the only match
  surface in the live app) and never imports any `MatchScreenDemo`/`match-screen` module (grep across
  `apps/desktop/src` outside `components/`: zero hits). The whole scaffold, including both demos, is
  **completely unmounted** from the running app.
- **Stray `components/MatchScreenDemo.tsx` + `components/mock-fixtures.ts` are broken and duplicative.**
  `components/mock-fixtures.ts:1-2` imports `{ MatchScreenStateSchema, MatchIncidentTypeSchema }` from
  `"./types"` and annotates each scenario with type `MatchScreenState` — but there is **no
  `components/types.ts` file at all**, and `match-screen/types.ts` (the only `types.ts` under
  components/) exports neither `MatchScreenStateSchema` nor `MatchIncidentTypeSchema` nor any type named
  `MatchScreenState` (its state interface is `Matchscreen`, `types.ts:105`). Confirmed by repo-wide grep:
  the only `MatchScreenStateSchema` hits are the stray file itself plus ticket/map prose. The stray file
  cannot typecheck. Its twin `match-screen/mock-fixtures.ts:2` imports only the `Matchscreen` type and
  performs **no `.parse()`** — the Schema-gated parse attempt is exclusive to the stray copy.
- `components/MatchScreenDemo.tsx:2-4` is structurally identical to
  `match-screen/MatchScreenDemo.tsx:2-4` (same scenario switch, same `alert()` handlers) — the brief's "no
  duplicated screen implementations" is violated by the scaffold itself.
- **Runtime-validation precedent:** `packages/contracts/src/rpc.ts` is built on Effect Schema —
  `import { Schema } from "effect"` (`rpc.ts:1`) with every method's `payload`/`success`/`error` declared
  as `Schema.Struct` / `Schema.Finite` / `Schema.optional` (`rpc.ts:57-267`), and `packages/AGENTS.md`
  (Roles) gives contracts the wire-shape single source of truth. So the brief's "Zod" maps to **Effect
  Schema** in this repo — and the scaffold uses neither.
- **Test files touching match-screen:** none found. All 13 unit tests under `apps/desktop/test` and all 4
  specs under `apps/desktop/e2e` act on main-process logic or app journeys; grep for
  `match-screen`/`MatchScreenDemo`/`scenario1-3` in them returns zero hits.

## Divergences from the brief's proposed data model

- `clock`: `__typename` union `"scheduled" | "live" | "full-time" | "halftime"` (`types.ts:29-33`) vs the
  brief's `MatchClockState.mode` `("scheduled" | "live" | "half-time" | "full-time")` with
  `currentDateTime`. The scaffold's `scheduled` variant holds one preformatted `value: string` —
  structurally unable to represent §7.2's calendar mode; naming also diverges (`halftime` vs
  `half-time`).
- State interface named `Matchscreen` (lowercase) vs brief `MatchScreenState` — cosmetic but ripples
  wherever the schema is declared.
- Scaffold **adds** `metadata: ApplicationMetadata` inside the state (`types.ts:101-103,122`); the brief
  keeps `ApplicationMetadata` as standalone application metadata — and the field is dead (Sidebar never
  reads it, §7.5).
- Kept conforming: `periodScores` incl. `penalties` ✓, `weather` condition union ✓, incident-type union
  incl. `penalty-scored`/`penalty-missed` ✓, club `shortName` ✓, `BottomStatusSegment` ✓, and a
  `NumberFormattingOptions`-adjacent helper (unused) ✓. `stadiumBackgroundId` is present but drives
  nothing.
- Fixture model matches, but fixtures store preformatted kickoff strings — violating the §12.4 date
  contract — and Scenario 1's `periodScores` do not sum to the 5-3 headline (a data-coherence bug the
  brief's derivation logic would surface).

## Disposition-relevant verdict

The keep-work delta is **medium-large and predominantly additive; three or four items are structural**.
The scaffold already owns the entire static surface — layout (§5 MET), visual tokens (§6 MET), scoreboard
(§8 mostly MET), incident/injury data model (§11), fixture grid + weather (§12), secondary tabs (§13 MET),
possession core (§14), non-goals (§25 MET) — so nothing above the fold is a rewrite. The single biggest
absence is **testing: §23 is 100% unbuilt** (no test file touches anything under `components/`), and with
it §26's acceptance tail and §27's report are entirely unbuilt — pure addition, no existing code at risk,
but the bulk of the remaining effort. Second is **interaction + a11y**, wholly additive to existing
files: the Options menu does not exist (§15.2/§18), tabs lack arrow-key roving and a `tabpanel` role
(§9/§20), Continue lacks dup-protection (§18). The structural (non-cosmetic) items: (1) a **runtime
validation layer does not exist and must be introduced** — Effect Schema by repo precedent, and today the
repo would not typecheck because of the stray `components/mock-fixtures.ts`; (2) the **4:3 canvas / scale
responsive model** (§4/§19) is absent and cannot be patched purely in CSS — it changes how `.match-screen`
is sized and mounted; (3) the **incident four-column grid is miswired**, and the period summary must use
the existing (dead) derivation helpers plus the penalties segment (§11); (4) **data-model divergences**
are mechanical renames/union changes (clock union → mode, `Matchscreen` → `MatchScreenState`, metadata
placement) that ripple through every fixture and component — mechanical but repo-wide. The calendar
sidebar mode (§7.2) is unrepresentable and needs both a clock-union change and a new render path. Stadium
imagery is fully absent (asset + wiring, adjacent to ticket 04). §24 fidelity is unscorable until
reference images exist. Nothing here demands throwing the scaffold away; the honest shape of the keep-path
is: finish the interaction + validation + test/artifact layer, fix four structural points, and re-run
every fixture through a now-existent validator.