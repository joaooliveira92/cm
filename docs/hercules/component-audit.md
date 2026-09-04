# Component Audit: God Components & Production-Readiness

**Date:** 2026-09-03
**Scope:** `apps/desktop/src/renderer/` (96 .tsx files, 15,761 lines)
**Method:** [React Composition Patterns](https://github.com/vercel/composition-patterns) audit for boolean prop proliferation, compound component violations, render props, React 19 migration gaps, and god-component heuristics (useState > 10, useEffect > 5, local imports > 10, JSX > 100 lines, mixed concerns).

---

## Executive Summary

| Severity | Count | Description |
|----------|-------|-------------|
| CRITICAL | 3 | God components — single-file screen components mixing data, business logic, and rendering |
| HIGH | 3 | Boolean-prop state interfaces (5+ booleans in a single context/state type) |
| MEDIUM | 4 | React 19 migration gaps (`useContext` → `use()`, `forwardRef`) |
| LOW | 2 | Render prop-adjacent patterns, minor composition opportunities |

**Total lines in the top 6 offenders: ~4,200 (27% of all renderer code).**

---

## 1. God Components (CRITICAL)

These components own too many responsibilities. They mix data fetching, business logic, state orchestration, keyboard handling, and rendering in a single file. They are difficult to test, reason about, and refactor.

### 1.1 `TransfersScreen.tsx`, 1,133 lines

**File:** `TransfersScreen.tsx`
**Heuristics hit:** 7 useState, 6 useEffect, 26 local non-UI imports, ~281-line JSX return, 4 RPC mutation seams

This is the strongest god-component in the codebase. It owns:

| Concern | Evidence |
|---------|----------|
| **Market data fetching** | `transfersAtom`, `placeBidMutation`, `signFreeAgentMutation`, `respondToBidMutation`, `respondAsBidderMutation`, 4 mutation seams via `useAtomSet` |
| **Bid-draft state machine** | `reduceBidDraft`, `BidDraftState`, `KeepDiscardDialog` — a full dirty-draft lifecycle |
| **Two TanStack tables** | Market + Free Agents, each with their own `useDataTable`, `useTransferTableState`, sort/filter/bookmark |
| **Counter-offer modal** | `InlineModal`, `counterAmount`, `counterError`, `runRespondAsBidder` |
| **Action-handler registration** | `registerActionHandler` for both tables |
| **Focus restoration** | `makeTableFocusBookmark`, `resolveTableFocus`, `restoreFocusAfterOverlay` |
| **Selection** | Shared `selected` state across two tables |

**What it should be:** At minimum three components, a `TransferMarketTable`, a `FreeAgentTable`, and a `BidComposer`, each behind its own provider or at minimum a shared `TransferScreenState` context. The bid-draft lifecycle (`reduceBidDraft` + `KeepDiscardDialog`) is a self-contained state machine that could be a compound component with its own provider.

---

### 1.2 `MatchProvider.tsx`, 394 lines

**File:** `match/MatchProvider.tsx`
**Heuristics hit:** **15 useState** (far exceeds the 10-rule), 5 useEffect, 5 useRef

The provider owns every facet of a live match:

| Concern | useState count |
|---------|---------------|
| Opponent selection | `opponents`, `opponentId` |
| Match lifecycle | `match`, `error`, `starting`, `hydrated` |
| Commentary streaming | `revealed`, `currentMinute` |
| Scoreboard | `homeScore`, `awayScore` |
| Match state | `isComplete`, `paused` |
| Substitutions/injuries | `homeSubs`, `homeOnPitchCount`, `chunkInjuries` |

Plus 5 mutable refs for streaming pacing (`cursorRef`, `pendingRef`, `fetchingRef`, `streamCompleteRef`, `pausedRef`).

**What it should be:** The streaming/commentary subsystem is a separate concern from opponent selection and scoreboard state. The provider could be split into:
- `MatchProvider` - opponent lifecycle + match start/reset (3-4 useState)
- `CommentaryProvider` — streaming, pacing, cursor management (useReducer + refs)
- Scoreboard derived from commentary state

---

### 1.3 `SquadScreen.tsx`, 637 lines

**File:** `SquadScreen.tsx`
**Heuristics hit:** 9 useState, 4 useEffect, 22 local non-UI imports, ~181-line JSX return

Owns the canonical CRUD+sort+filter+visibility+preferences+focus screen:

| Concern | Evidence |
|---------|----------|
| Data fetching | `squadAtom` |
| Sorting | `sortDirectionOf`, `setSortFor` |
| Filtering | `applyFilters`, `clearFilters`, `positionClause`, `upsertFilter` |
| Column visibility | `SQUAD_PRESETS`, `toggleColumn`, `loadSquadColumnPreferences` |
| Focus restoration | `makeTableFocusBookmark`, `resolveTableFocus` |
| Session persistence | `readTableSession`, `updateTableSession`, `discardSelectionForNavigation` |
| Announcements | `announce`, `statusTermsOf` |

**What it should be:** The table features (sort, filter, visibility, focus, session) are already modularized into separate files under `table/features/`. The screen itself should be a thin composition of a `SquadProvider` (data + session state) and a composed `SquadTable` (DataTable + toolbars + status bar). The current file conflates the provider and the view.

---

## 2. Boolean-Prop State Interfaces (HIGH)

Components that use compound contexts (good!) but with overly boolean-heavy state types. Each boolean doubles the conditional branches downstream.

### 2.1 `MatchControlState`, 7 booleans

**File:** `match/MatchControlPanel.tsx:47`

```typescript
interface MatchControlState {
  readonly open: boolean;
  readonly isHalftime: boolean;
  readonly injuryPrompt: boolean;
  readonly hasRedInjury: boolean;
  readonly isShorthanded: boolean;
  readonly injuryDecisionPrompt: boolean;
  readonly subDraftComplete: boolean;
  // + 5 non-boolean fields
}
```

These 7 booleans create 2^7 = 128 possible states. The sub-components (`SubstitutionControl`, `PanelHeader`, `InjuryDecisionModal`) consume 3–4 booleans each, resulting in complex conditional rendering:

```typescript
// SubstitutionControl reads: isShorthanded, hasRedInjury, subsStatus.capReached
// PanelHeader reads: injuryPrompt, hasRedInjury, open
```

**Recommendation:** Replace boolean flags with a discriminated union for the panel's mode:

```typescript
type PanelMode =
  | { _tag: "closed" }
  | { _tag: "open"; halftime: boolean }
  | { _tag: "injury-prompt"; severity: "red" | "orange" }
  | { _tag: "injury-decision" }
  | { _tag: "sub-draft" }
```

This makes illegal states unrepresentable and eliminates the conditional matrix.

### 2.2 `MatchState`, 4 booleans

**File:** `match/MatchProvider.tsx:45`

```typescript
readonly starting: boolean;
readonly isComplete: boolean;
readonly paused: boolean;
readonly hydrated: boolean;
```

**Recommendation:** A status enum covers this better:

```typescript
type MatchPhase = "hydrating" | "selecting-opponent" | "starting" | "live" | "paused" | "complete";
```

### 2.3 `TablePanelProps`, 3 booleans

**File:** `table/TablePanel.tsx:29`

```typescript
enableNameSearch: boolean;
enablePositionFilter: boolean;
busy: boolean;
```

**Recommendation:** `enableNameSearch` and `enablePositionFilter` suggest the panel should be composed differently per table variant rather than toggling features with booleans.

---

## 3. React 19 Migration Gaps (MEDIUM)

The codebase targets React 19.2.0 but has incomplete migration from React 18 APIs.

### 3.1 `forwardRef`, 1 occurrence

**File:** `components/ui/liquid-glass.tsx:142`

```typescript
export const LiquidGlass = forwardRef<HTMLDivElement, LiquidGlassProps>(function LiquidGlass(
  { ... },
  ref,
) { ... });
```

**Fix:** In React 19, `ref` is a regular prop. Replace with:

```typescript
export function LiquidGlass({ ref, ...props }: LiquidGlassProps & { ref?: React.Ref<HTMLDivElement> }) {
  // ...
}
```

### 3.2 `useContext` instead of `use()`, 6 call sites

| File | Line | Context |
|------|------|---------|
| `router/createFlow.tsx` | 79 | `CreateSessionContext` |
| `activeLeagues/ActiveLeaguesProvider.tsx` | 79 | `ActiveLeaguesContext` |
| `match/MatchProvider.tsx` | 390 | `MatchContext` |
| `match/MatchControlPanel.tsx` | 87 | `MatchControlContext` |
| `activeLeagues/ActiveLeaguesScreen.tsx` | 173 | `CreateSessionContext` |
| `LeagueSelectionScreen.tsx` | 116 | `CreateSessionContext` |

**Note:** `sidebar.tsx` and `toggle-group.tsx` have already been migrated to `use()`. The remaining 6 call sites should be updated for consistency.

---

## 4. Complex Conditional Chains (MEDIUM)

Nested ternaries driven by multiple booleans are hard to read and maintain.

### 4.1 `KeyboardSpine.tsx:194`

```typescript
const topLayer: OverlayLayer =
  splashActive ? "splash"
    : layer !== "none" ? layer
      : panelOpen ? "panel"
        : "none";
```

Triple-nested ternary. Could be a `resolveTopLayer()` helper with early returns.

### 4.2 `SquadScreen.tsx:187`

```typescript
blockingFailure ? "failure" : view !== undefined ? "success" : "loading"
```

### 4.3 `MatchControlPanel.tsx:353–356`

```typescript
{state.injuryPrompt && (
  <Badge variant={state.hasRedInjury ? "destructive" : "warning"}>
```

Multiple boolean combinations in `SubstitutionControl` (lines 218–228) and `PanelHeader` (lines 341–362).

---

## 5. Render Props (LOW)

**No render prop anti-patterns found.** The codebase does not use custom `renderX` props or children-as-function patterns. TanStack Table's `cell`/`header` function properties are framework-standard, not custom render props.

---

## 6. Well-Factored Counterexamples

These components demonstrate good patterns the rest of the codebase should follow:

| Component | Lines | Pattern |
|-----------|-------|---------|
| `MatchDayScreen.tsx` | ~75 | Thin composition shell, delegates to `MatchProvider` + `OpponentPicker` + `MatchCommentaryStream` + `MatchControlPanel` |
| `components/ui/toggle-group.tsx` | — | Already uses `use()` instead of `useContext` |
| `components/ui/sidebar.tsx` | — | Already uses `use()` (compound component pattern) |
| **MatchControlPanel.tsx** | — | Uses `state/actions/meta` context interface pattern (the right idea, just boolean-heavy state) |
| `table/features/` directory | — | Modular table features (sorting, filtering, visibility) extracted into separate files |

---

## 7. Recommended Refactoring Priority

| Priority | Component | Effort | Impact |
|----------|-----------|--------|--------|
| P0 | `TransfersScreen` | High | Decouple bid-draft lifecycle into provider; split market/free-agent tables |
| P0 | `MatchProvider` | Medium | Extract commentary streaming into separate provider |
| P1 | `MatchControlState` | Low | Replace 7 booleans with discriminated union |
| P1 | `MatchState` | Low | Replace 4 booleans with `MatchPhase` enum |
| P2 | `SquadScreen` | Medium | Extract data + session state into provider; thin composition shell |
| P2 | `KeyboardSpine` | Low | Extract overlay resolution into helper |
| P3 | React 19 migration | Low | `forwardRef` → ref prop, `useContext` → `use()` (6 sites + 1 file) |

---

## Appendix: Full File Size Distribution

| Lines | Files | % of total |
|-------|-------|-----------|
| 600+ | 6 | 29% |
| 300–599 | 8 | 22% |
| 100–299 | 25 | 30% |
| <100 | 57 | 19% |

The codebase is top-heavy: 14 files over 300 lines contain ~60% of all renderer code.
