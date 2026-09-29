# Renderer refactor candidates

A survey of `apps/desktop/src/renderer` taken on 2026-09-29 (453 files, ~50.8k lines). Each entry
names the files, the evidence, and the refactor it suggests. The list is a snapshot: re-measure
before starting an item, because the renderer moves fast.

To run the component-level items (section 2), use [refactor-task.md](refactor-task.md) with the
folders listed here as its target scope. The cross-cutting items (sections 1 and 4) are not God
Components; `slay-gods.md` does not fit them, and they are better done as single mechanical commits.

## 1. Duplication (high value, low risk)

### 1.1 Home and Away team screens are the same screen

[MatchHomeTeamScreen.tsx](../apps/desktop/src/renderer/matchHomeTeam/MatchHomeTeamScreen.tsx) and
[MatchAwayTeamScreen.tsx](../apps/desktop/src/renderer/matchAwayTeam/MatchAwayTeamScreen.tsx)
differ in three lines: the export name, `data-focus-id` and `aria-label`. Both render *both* team
panels, so the "Home" and "Away" tabs show identical content. Each also fetches imperatively
(`useEffect` + `Effect.runPromise`) and casts `matchId as never`.

Suggested: one `MatchTeamSheetScreen` parameterised by side, reading through an atom like the other
screens. Decide first whether each tab should show only its own side; that is a behaviour
change, not a refactor.

### 1.2 Eleven copy-pasted placeholder screens

These files are the same 13-line `<main>` with a "WIP — Placeholder screen" line:
`squadHistory`, `squadStaff`, `squadInformation`, `squadFinances`, `matchLiveTable`,
`matchLatestScores`, `matchOppositionInstructions`, `matchPlayerStats`, `matchReplays`,
`staffSearch`, `shortlist/ShortlistScreen.tsx`.

Suggested: one `PlaceholderScreen({ focusId, label, title })` component. The router can
instantiate it directly, so the eleven one-file directories go away.

### 1.3 Screen shell boilerplate

- `const PAGE_CLASS = ...` is defined locally in 31 files.
- `FOCUS_RING.join(" ")` appears in 101 files.
- Every screen repeats the same `<main tabIndex={-1} data-focus-id aria-label className>` wrapper.

Suggested: a `ScreenMain` component (or at minimum an exported `FOCUS_RING_CLASS` string from
[focus.ts](../apps/desktop/src/renderer/focus.ts)). This touches many files, but every change is
mechanical.

### 1.4 Read-state handling bypasses the existing helper

[rpc/readState.ts](../apps/desktop/src/renderer/rpc/readState.ts) already maps an atom result to
`Loading | Failed | Ready`, with the typed-error fallback. Only 6 files use it. 25 files check
`_tag === "Initial"` by hand, and 15 define their own `messageOf` for the error line.

Suggested: migrate screens to `readState` one directory at a time. Pairs naturally with 1.3,
since the loading and error lines are part of the shell.

### 1.5 `runAtEdge` defined four times

- [activeLeagues/ActiveLeaguesScreen.tsx:60](../apps/desktop/src/renderer/activeLeagues/ActiveLeaguesScreen.tsx#L60)
- [activeLeagues/ActiveLeaguesProvider.tsx:119](../apps/desktop/src/renderer/activeLeagues/ActiveLeaguesProvider.tsx#L119) (returns `Exit`, the others return `Result`)
- [leagueSelection/useLeagueSelection.ts:51](../apps/desktop/src/renderer/leagueSelection/useLeagueSelection.ts#L51)
- [create/useCreateSession.ts:94](../apps/desktop/src/renderer/create/useCreateSession.ts#L94)

Suggested: one export from `rpc/`. Settle on `Result` or `Exit` deliberately.

### 1.6 Setup bootstrap duplicated between the two league-selection surfaces

`ActiveLeaguesScreen` and `useLeagueSelection` each call `getLeagueSetupIndex` and
`loadSetupDraft` on mount. The two presentations over one intent model are intentional (see the
comment at `ActiveLeaguesScreen.tsx` "Manage leagues"); the duplicated loading is not.

Suggested: a shared bootstrap hook or atom. The manage-mode tree could then receive the index
instead of fetching it again.

### 1.7 Scattered formatters

`formatCount` is defined identically in
[leagueSelection/viewModel.ts](../apps/desktop/src/renderer/leagueSelection/viewModel.ts) and
[activeLeagues/ActiveLeaguesSidebar.tsx](../apps/desktop/src/renderer/activeLeagues/ActiveLeaguesSidebar.tsx).
Date formatters live privately in `router/loadCareer.tsx` and
`managerProfile/ManagerProfileScreen.tsx`. Suggested: move them into
[format.ts](../apps/desktop/src/renderer/format.ts).

## 2. God components and hooks

Ranked by how much state each one juggles, not by line count alone. Line counts are for the
largest single function, not the whole file.

| File | Largest function | Evidence | Suggested direction |
|---|---|---|---|
| [match/CommentaryProvider.tsx](../apps/desktop/src/renderer/match/CommentaryProvider.tsx) | `CommentaryProvider` (~300) | 11 `useState`, ~15 `useRef`, many of them mirroring a state value (`clubSubs`/`clubSubsRef`, `revealedInjuries`/`revealedInjuriesRef`), plus a `mountedRef` | One reducer over the feed state, and the fetch/stream loop moved into its own hook. The ref mirrors exist to read fresh state from async callbacks; a reducer removes most of them. |
| [create/useCreateSession.ts](../apps/desktop/src/renderer/create/useCreateSession.ts) | `useCreateSession` (~460) | 577 lines (23 under the lint ceiling), 7 effects, 20 `useCallback`/`useMemo`, `mountedRef` | Split per concern: session state, world generation run, bottom-bar registration, leave guard. |
| [match/useMatchControl.ts](../apps/desktop/src/renderer/match/useMatchControl.ts) | `useMatchControl` (~320) | 8 `useState`, 5 effects, a `panelRef` object bag | Separate the substitution picker state from tactic application and alerts. |
| [discoverability/HelpOverlay.tsx](../apps/desktop/src/renderer/discoverability/HelpOverlay.tsx) | `HelpOverlay` (~300) | One component body, 4 `useState`, 3 effects | Extract tabs/list/search panes. |
| [router/mainMenu.tsx](../apps/desktop/src/renderer/router/mainMenu.tsx) | `MainMenuScreen` (~285) | 6 `useState`, 3 effects, imperative RPC | Pull the data loading into a hook; split menu sections. The screen also sits in `router/`, which should hold route wiring only. |
| [news/NewsInboxScreen.tsx](../apps/desktop/src/renderer/news/NewsInboxScreen.tsx) | `NewsInboxScreen` (~240) | Selection, filtering and the reading pane in one body; one `as never` | Extract list and toolbar; `MessageRow`/`MessagePane` are already split out. |
| [activeLeagues/ActiveLeaguesScreen.tsx](../apps/desktop/src/renderer/activeLeagues/ActiveLeaguesScreen.tsx) | `ActiveLeaguesSetup` (~240) | 4 `useState`, 6 effects, bottom-bar registration, manage-mode switch | Do together with 1.5 and 1.6. |
| [playerSearch/PlayerSearchScreen.tsx](../apps/desktop/src/renderer/playerSearch/PlayerSearchScreen.tsx) | `PlayerSearchScreen` (~155), `SearchResults` (~135) | 8 `useState` for filter fields | Collapse the filter fields into one criteria object and a `useSearchCriteria` hook. |

HelpOverlay, mainMenu and NewsInbox are flagged by shape (size, state count). Their internals were
not read in detail, so confirm the split points before planning.

## 3. Blocked: files with uncommitted work from another session

The files below qualify, but on 2026-09-29 the working tree held uncommitted edits to them. Wait
for that work to land, then re-measure.

| File | Evidence at survey time |
|---|---|
| [squad/SquadTable.tsx](../apps/desktop/src/renderer/squad/SquadTable.tsx) | 575 lines; `SquadTable` body ~306 lines. `RefreshStatusLine`, `ColumnControls`, `SquadToolbar`, `ViewStateMessage`, `FitContextLine` are already split out, but still in this file. |
| [squad/useSquadScreen.ts](../apps/desktop/src/renderer/squad/useSquadScreen.ts) | 565 lines; one ~423-line hook with 6 effects and 21 `useCallback`/`useMemo`. |
| [tactics/TacticsScreen.tsx](../apps/desktop/src/renderer/tactics/TacticsScreen.tsx) | 545 lines; `TacticsScreen` body ~364 lines. The pure slot helpers (`placeSlot`, `moveSlot`, `changeFormation`...) can move to a model file with no behaviour risk. |
| [match/MatchControlPanel.tsx](../apps/desktop/src/renderer/match/MatchControlPanel.tsx) | 397 lines, one large JSX body. |
| [transfers/useTransfersScreen.ts](../apps/desktop/src/renderer/transfers/useTransfersScreen.ts) | 412 lines. |

The first three are within 40 lines of the 600-line ceiling in `scripts/effect-lint.ts`, so the
next feature added to any of them will fail the gate.

## 4. Structural

### 4.1 Adding a screen touches eight files

Tracing `squadHistory` finds it in the screen file,
[destinations.ts](../apps/desktop/src/renderer/navigation/destinations.ts),
[router/index.tsx](../apps/desktop/src/renderer/router/index.tsx),
[nav-config.ts](../apps/desktop/src/renderer/navigation/nav-config.ts), `NavProvider.tsx`,
`actions/allActions.ts`, `actions/types.ts` and `keyboard/KeyboardSpine.tsx`.

The size of the two registry files is a recorded decision: both are on the line-ceiling allowlist
in `scripts/effect-lint.ts`, and splitting them is not proposed here. The candidate is the
repetition *across* them. Deriving the route list, nav entries and action bindings from one screen
table would cut a new screen to one or two edits. This changes a cross-cutting navigation
contract, so per [AGENTS.md](../AGENTS.md) it goes through the tracker rather than straight to code.

### 4.2 Unsafe casts

`as never` appears 10 times in 8 files: `matchHomeTeam`, `matchAwayTeam`, `news/NewsInboxScreen`,
`chrome/header/CareerIdentity`, `activeLeagues/state`, `rpc/playerSearchQueries`,
`keyboard/KeyboardSpine`, `keyboard/KeyboardStateProvider`. Each one hides a type mismatch,
usually a branded id built from a plain string. Replace them with the brand's `make` or a
decoded value.

## Out of scope

- [components/ui/sidebar.tsx](../apps/desktop/src/renderer/components/ui/sidebar.tsx) (564 lines)
  and the other `components/ui` primitives are vendored shadcn/Base UI, customised in place.
  Their size follows upstream.
- `router/index.tsx`, `navigation/destinations.ts`: size is allowlisted (see 4.1).
- [rpc/queries.ts](../apps/desktop/src/renderer/rpc/queries.ts) (591 lines) is a flat list of atom
  definitions, long but with a single job. It needs a split only when it hits the ceiling, and then
  by domain area.
- `clubInfo/` vs `clubInformation/`: already resolved. `ClubInfoScreen` is now a thin resolver
  onto `ClubInformationScreen`.
