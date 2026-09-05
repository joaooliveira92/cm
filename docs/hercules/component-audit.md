# Component Composition Audit

> **Date:** 2026-09-04
> **Scope:** `apps/desktop/src/renderer/` — all active React components (142 `.tsx` files, excluding `components/ui/` primitives and test files)
> **Method:** Audit against the [vercel-composition-patterns](../../.agents/skills/vercel-composition-patterns/AGENTS.md) skill rules

---

## Executive Summary

This codebase scores **strong** on composition patterns overall. Boolean prop proliferation is essentially absent, compound component mechanics are used in domain components, and render props have been fully eliminated in favour of children + context. The main areas for improvement are React 19 API migration consistency and a few context interface deviations from the established `state/actions/meta` convention.

| Category | Grade | Key Finding |
|----------|-------|-------------|
| Boolean prop proliferation | **A** | Zero instances of 3+ boolean props. Discriminated unions used throughout. |
| Compound components | **B+** | Good mechanics (shared context), but only one namespace export (`Header`). `MatchControlPanel` is compound but un-exported. |
| State management coupling | **B** | All providers isolate state. Two components duplicate atom values into `useState`. |
| Context interface (state/actions/meta) | **B+** | 4 of 6 providers follow `state/actions/meta`. 2 outliers (ad-hoc / flat). |
| State lifting | **A-** | Providers own state correctly. `stateRef` patterns are intentional and documented. |
| Explicit variants | **A** | Screen-level components are explicit, self-contained variants. No boolean-driven mode switching. |
| Children over render props | **A** | Zero render props in app code. Children composition used exclusively. |
| React 19 APIs | **B** | Zero `forwardRef` usage (clean). 5 files still use `useContext` instead of `use()`. |

---

## 1. Boolean Prop Proliferation — `architecture-avoid-boolean-props`

**Verdict: No remediation needed.**

### Findings

| Component | File:Line | Boolean Props | Severity |
|-----------|-----------|---------------|----------|
| `DataTable` | `table/DataTable.tsx:64` | `busy`, `enableShiftScroll?` | LOW |
| `TablePanel` | `table/TablePanel.tsx:22` | `busy` | LOW |
| `ActiveLeaguesWorkspace` | `activeLeagues/ActiveLeaguesWorkspace.tsx:36` | `stale?`, `advancedDefaultOpen?` | LOW |
| `SetupIntroduction` | `activeLeagues/SetupIntroduction.tsx:15` | `stale?` | LOW |
| `ActiveLeaguesSidebar` | `activeLeagues/ActiveLeaguesSidebar.tsx:28` | `stale?` | LOW |
| `InlineModal` | `transfers/InlineModal.tsx:15` | `submitDisabled?` | LOW |
| `ShellHeader` | `chrome/header/ShellHeader.tsx:17` | `titleAsHeading?` | LOW |
| `ClubRail` | `clubSelection/ClubRail.tsx:10` | `loading` | LOW |

All boolean props are simple, well-scoped, and used for standard React patterns (aria attributes, disabled states, disclosure defaults). No component has 3+ boolean props.

### What prevents the anti-pattern

- **Discriminated unions** replace boolean flags: `PanelMode` (`closed | open | injury-prompt | ...`), `Boot` (`Loading | Failed | Ready`), `viewState._tag`
- **Slot composition** replaces visibility booleans: `ActiveLeaguesLayout` takes `workspace`, `sidebar?`, `footer?` as ReactNode slots; `TablePanel` takes `filterArea: ReactNode`
- **Derived state** in atoms/reducers: `canContinue`, `stale`, `validation` computed from setup state, not stored as independent booleans

---

## 2. Compound Components — `architecture-compound-components`

### Context creation audit

| Context | File:Line | Interface Shape | Quality |
|---------|-----------|-----------------|---------|
| `MatchContext` | `match/MatchProvider.tsx:115` | `{ state, actions, meta }` | **Good** |
| `TransfersContext` | `TransfersProvider.tsx:69` | `{ state, actions, meta }` | **Good** |
| `SquadContext` | `SquadProvider.tsx:10` | `SquadScreenValue` = `{ state, actions, meta }` | **Good** |
| `MatchControlContext` | `match/MatchControlPanel.tsx:100` | `{ state, actions, meta }` | **Good** |
| `CreateSessionContext` | `router/createSessionContext.tsx:49` | Ad-hoc `{ session, update, retryGeneration, selectClub, registerBottomBar }` | **Needs improvement** |
| `ActiveLeaguesContext` | `activeLeagues/ActiveLeaguesProvider.tsx:76` | Flat value: derived views + `dispatch` + `index` | **Needs improvement** |

### Namespace exports

Only one compound component namespace exists in app code:

- **`Header`** (`chrome/header/index.ts:20`) — `export const Header = { TitleBar, Nav, Title, Search, SecondaryRow, Shell }`

**Gap:** `MatchControlPanel.tsx` implements compound component mechanics (shared context, sub-components consuming `MatchControlContext`) but does not export a namespace like `MatchControl.Provider`, `MatchControl.Header`, etc. The sub-components (`TeamInstructionSliders`, `SubstitutionControl`, `InjuryDecisionModal`, `PanelHeader`) are private consts used inline.

### Context consumption

All branded hooks (`useSquad`, `useTransfers`, `useMatchContext`, `useMatchControlContext`, `useActiveLeagues`) null-check and throw outside the provider. Consumers are decoupled from state implementations — UI reads only the provider's context.

---

## 3. State Management Decoupling — `state-decouple-implementation`

### Provider quality

| Provider | State Source | Pattern | Quality |
|----------|-------------|---------|---------|
| `ActiveLeaguesProvider` | Effect atoms (`useAtom`/`useAtomValue`) | Atom-based with typed intent dispatch | **Excellent** |
| `SquadProvider` | Delegates to `useSquadScreen` hook | Thin context wrapper | **Good** |
| `TransfersProvider` | Delegates to `useTransfersScreen` hook | Thin wrapper with state/actions/meta | **Good** |
| `MatchProvider` | 15× `useState` + 5× `useRef` | Traditional React state owner | **Adequate but heavy** |
| `MatchControlProvider` | 8× `useState` | Panel-scoped local state | **Adequate** |

All providers properly isolate state — UI components never touch atoms/hooks directly.

### Atom-to-useState duplication

Two components duplicate atom values into local `useState`, creating a two-source-of-truth risk:

| Component | File:Line | Pattern |
|-----------|-----------|---------|
| `MatchControlPanel` | `match/MatchControlPanel.tsx:471-479` | `useEffect` syncs atom `tacticsResult` into `useState` |
| `TacticsScreen` | `TacticsScreen.tsx:106-110` | `useEffect` syncs atom `viewResult` into `useState` draft |

### State coupling in MatchProvider

`MatchProvider.tsx` has **15 separate `useState` calls** (`:127-141`) plus **5 `useRef`** for mutable polling state. While well-structured as a provider, this volume suggests `useReducer` or atom-based state would improve maintainability — matching `ActiveLeaguesProvider`'s approach.

---

## 4. Context Interface Convention — `state-context-interface`

### Compliance

4 of 6 contexts follow the `state/actions/meta` convention:

- `MatchContext`, `TransfersContext`, `SquadContext`, `MatchControlContext` — all define `{ state, actions, meta }`

### Deviations

| Context | Deviation | Impact |
|---------|-----------|--------|
| `CreateSessionContext` | Ad-hoc shape: `{ session, update, retryGeneration, selectClub, registerBottomBar }` | No `actions`/`meta` split. Methods are flat. |
| `ActiveLeaguesContext` | Flat value: derived views + `dispatch` (reducer intent funnel) + `index` | Defensible reducer model, but breaks the convention. |

Both deviations are functionally correct but reduce discoverability and consistency with the dominant pattern.

---

## 5. State Lifting — `state-lift-state`

**Verdict: Strong. Providers own state correctly. Documented `stateRef` patterns are intentional.**

### Intentional ref patterns

| Pattern | File:Line | Purpose | Assessment |
|---------|-----------|---------|------------|
| `stateRef` (latest-value ref) | `ActiveLeaguesProvider.tsx:141-142` | Avoids stale-closure in async `useEffect` | **Intentional, documented, correct** |
| `panelRef` (keyboard snapshot) | `MatchControlPanel.tsx:456-465` | Keyboard handler reads current state without re-binding | **Intentional, documented, correct** |

### useEffect-based state sync

| Location | Pattern | Quality |
|----------|---------|---------|
| `ActiveLeaguesProvider.tsx:163-195` | Debounced async resolve into slot atom | **Good** — debounced, revision-guarded, cancelled on cleanup |
| `MatchProvider.tsx:245-277` | Session restore on mount | **Good** — one-shot restore, gated by `hydrated` flag |
| `MatchProvider.tsx:280-307` | Recording match to session store | **Good** — side-effect only, no upward state sync |

---

## 6. Explicit Variants — `patterns-explicit-variants`

**Verdict: Screen-level components are clean, explicit variants. No boolean-driven mode switching.**

Each screen is a self-contained variant with its own provider, composing the pieces it needs:

- `SquadScreen` — `SquadProvider` + `SquadTable`
- `TransfersScreen` — `TransfersProvider` + filter bar + tables
- `MatchDayScreen` — `MatchProvider` + `MatchControlPanel` + `Scoreboard` + `MatchCommentaryStream`
- `TacticsScreen` — local draft state + `TacticPitch`

No screen passes `isX`/`showX` boolean props to switch between rendering modes.

---

## 7. Children Over Render Props — `patterns-children-over-render-props`

**Verdict: Zero render props in app code. Children composition used exclusively.**

A search for `render[A-Z]` prop patterns returned zero matches in the active codebase. All composition uses children:

- `ActiveLeaguesLayout` takes `workspace`, `sidebar?`, `footer?` as ReactNode slots
- `TablePanel` takes `filterArea: ReactNode`
- `TablePanel` takes `inlineSidebar?: ReactNode`
- Screen components compose sub-components as JSX children

---

## 8. React 19 APIs — `react19-no-forwardref`

### forwardRef

**Zero instances.** The codebase has been fully migrated — no `forwardRef` calls exist.

### useContext vs use()

| Pattern | Files | Assessment |
|---------|-------|------------|
| `useContext()` | `SquadProvider.tsx:29`, `TransfersProvider.tsx:138`, `MatchProvider.tsx:390`, `MatchControlPanel.tsx:103`, `ActiveLeaguesScreen.tsx:173` | Legacy |
| `use()` (React 19) | `ActiveLeaguesProvider.tsx:79`, `LeagueSelectionScreen.tsx:124`, `router/createFlow.tsx:79` (3 calls) | Idiomatic |

5 consumers still use `useContext` vs 3 using `use()`. The newer providers (ActiveLeagues) use `use()`; older ones (Squad, Transfers, Match, MatchControlPanel) still use `useContext`. Not broken, but inconsistent.

---

## Recommendations

### High priority

None. The codebase is clean on all critical patterns.

### Medium priority

| # | Finding | Recommendation | Pattern Rule |
|---|---------|----------------|--------------|
| 1 | `useContext` still used in 5 files | Migrate to `use()` for React 19 consistency | `react19-no-forwardref` |
| 2 | `MatchProvider` has 15 `useState` calls | Consider `useReducer` or atom-based state (like `ActiveLeaguesProvider`) | `state-decouple-implementation` |
| 3 | Atom→useState duplication in `MatchControlPanel` and `TacticsScreen` | Consume atoms directly or use `useAtom` for draft state | `state-decouple-implementation` |
| 4 | `MatchControlPanel` compound not exported as namespace | Add `MatchControl = { Provider, Header, Sliders, Subs, InjuryModal }` to match `Header` convention | `architecture-compound-components` |
| 5 | `CreateSessionContext` deviates from `state/actions/meta` | Refactor to `{ state: { session }, actions: { update, retryGeneration, selectClub, registerBottomBar } }` | `state-context-interface` |
| 6 | `ActiveLeaguesContext` flat value + `dispatch` | Consider whether the reducer-funnel model is intentional or should migrate to `state/actions/meta` | `state-context-interface` |

### Low priority

| # | Finding | Recommendation |
|---|---------|----------------|
| 7 | `.displayName` not set on app-level compound components | Add `displayName` for DevTools consistency (matching `components/ui/` convention) |
| 8 | `MatchControlPanel` actions bucket is thin (`setIsHalftime` only) | Review whether `dispatchAction` should be formalized into the `actions` interface |

---

## Appendix: Files Audited

### Active application components (142 `.tsx` files)

All files under `apps/desktop/src/renderer/` were read or sampled, excluding:
- `components/ui/*.tsx` — shadcn/radix primitives (third-party composition patterns)
- `*.test.tsx` — test files (35 files)

### Pattern rules applied

1. `architecture-avoid-boolean-props` — Boolean prop proliferation
2. `architecture-compound-components` — Compound component structure and context
3. `state-decouple-implementation` — State management decoupled from UI
4. `state-context-interface` — Generic context interface with state/actions/meta
5. `state-lift-state` — State lifted into provider components
6. `patterns-explicit-variants` — Explicit variant components vs boolean modes
7. `patterns-children-over-render-props` — Children over render props
8. `react19-no-forwardref` — React 19 API migration
