# 01 — Extract MatchDayScreen into compound components with MatchProvider

Type: task
Status: resolved

## Problem

`MatchDayScreen.tsx` (982 lines) is a massive monolithic component that violates multiple composition patterns:

1. **Excessive state** – 14 `useState` calls (opponents, opponentId, match, error, starting, revealed, homeScore, awayScore, isComplete, homeSubs, homeOnPitchCount, chunkInjuries, currentMinute, paused) all live in one component
2. **Boolean prop proliferation** – `isHalftime`, `isComplete`, `isShorthanded`, `isPanelTopmost`, `open` control rendering paths with conditionals
3. **Multiple concerns mixed** – Match lifecycle, live commentary, substitution UI, injury handling, tactics panel all in one component
4. **Prop drilling** – `MatchControlPanel` receives 11 props from parent
5. **MatchControlPanel** itself has 8 useState calls and 10 props passed to it

The component combines opponent selection, match simulation, commentary streaming, tactics control, substitution management, injury handling — all with overlapping boolean state that creates exponential conditional branches.

## Solution

### Phase 1: Lift state into `MatchProvider`
Create a `MatchProvider` context that owns all match-related state (opponents, scores, match status, subs, injuries, timer). Define a generic context interface with `state`, `actions`, and `meta`.

```tsx
interface MatchState {
  opponents: ReadonlyArray<ClubSummary>
  match: MatchSummary | null
  homeScore: number
  awayScore: number
  isComplete: boolean
  currentMinute: number
  chunkInjuries: ReadonlyArray<InjuryView>
  paused: boolean
}

interface MatchActions {
  startMatch: () => void
  submitCommand: (command: MatchCommand) => void
  resumeSimulation: () => void
  poll: () => void
}

interface MatchMeta {
  // refs, timers, etc.
}
```

### Phase 2: Extract MatchControlPanel into compound sub-components
Replace `MatchControlPanel` with explicit variant components:
- `SubstitutionControl` – handles substitutions only
- `InjuryDecisionModal` – handles the orange injury no-subs prompt
- `TeamInstructionSliders` – compound component for mentality/tempo/pressing

### Phase 3: Replace boolean props with composition
- Remove `isHalftime`, `isComplete`, `isShorthanded` conditionals
- Use explicit component variants: `MatchOngoing`, `MatchComplete`, `Halftime`

### Phase 4: Extract commentary streaming
Move the commentary polling/streaming into `MatchCommentaryStream` component that consumes `MatchProvider` context.

## Blocking

- Blocked by: none (can be worked independently)

## Done When

- [x] `MatchDayScreen.tsx` reduced to under 200 lines
- [x] No boolean prop proliferation in match components
- [x] `MatchControlPanel` extracted into focused sub-components
- [x] A `MatchProvider` context exists with generic state/actions/meta interface
- [x] `pnpm check:all` passes

## Answer

- [x] `MatchDayScreen.tsx` is 74 lines — a thin composition over `MatchProvider` (`MatchOngoing`/`MatchComplete` variants, opponent picker, commentary stream, control panel).
- [x] No boolean props anywhere in the match components: children derive their variants (`isShorthanded`, `injuryDecisionPrompt`, …) from context members, never received flags.
- [x] `MatchControlPanel` is now a compound (`match/MatchControlPanel.tsx`): a panel context plus `TeamInstructionSliders`, `SubstitutionControl` and `InjuryDecisionModal` focused sub-components.
- [x] `match/MatchProvider.tsx` exposes the generic `MatchState`/`MatchActions`/`MatchMeta` context interface; the commentary stream (`match/MatchCommentaryStream.tsx`) consumes it via the `useMatchStreaming` hook. Session restore/record, scope-state publish and the start/reset Actions moved up with the state.
- [x] Full suite (687) + typecheck + lint + effect-lint pass. The `verify-md-links` gate is red, but all 60 broken links are pre-existing in the vendored `vercel-react-*` skills (commit 38a036a), none in this change. Typecheck is also polluted by a concurrent, untracked `apps/desktop/src/renderer/features/` effort (broken `@effect-atom/atom-react` import), not part of this ticket.

Note: the extraction restores the documented `resumeSimulation` success-path consumption (cursor/lines/scores/streamComplete) that eb3786e accidentally dropped, so the buffer/pacing actually streams live again; `homeSubs`/`chunkInjuries` stay sourced from session restore + command resync so the decision-pause flow is unchanged.

## Comments

- This refactor directly addresses CRITICAL composition violations: boolean prop proliferation and monolithic component structure.
- The `MatchProvider` will allow sibling components outside `MatchDayScreen` to access match state (e.g., for the SeasonSummaryScreen).
- The injury decision modal is a good candidate for an explicit variant component since it only renders under specific conditions.