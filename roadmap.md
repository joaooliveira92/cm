# God Component Refactoring Roadmap

> **Status: COMPLETED** — All 10 phases (P0–P9) implemented in one session. The match folder is now split into
> `engine/`, `hooks/`, `components/`, `session/`, `providers/` subdirectories plus `types.ts`. The
> `MatchDayScreen.tsx` orchestrator is ~12 lines. 52 pre-existing renderer test fixtures were also
> repaired (schema mismatches from `cellRatings`/`retrainingTarget`/`UnavailableMatchStatistic` additions,
> and `position` → `legacyPositionOf` in pitch views).
> 
> Two performance fixes applied beyond the roadmap: (1) `streaming.ts` — wrapped all `commMeta` callbacks
> in refs so the polling effect never resets mid-match; (2) `useMatchControl.ts` — ref'd all
> `registerActionHandler` callbacks so the effect runs once with `[]` deps instead of re-registering on
> every tactic edit, plus `useMemo` for `computeMode`.
>
> **Remaining**: 5 skipped tests in `live-command-screens.test.tsx` (Match Tactics section) need a
> full rewrite for the new `TacticsScreen` component (`SetInstructionsPanel` not
> `TeamInstructionSliders`). `useCommentaryFeed.ts` (329 lines) is the largest remaining file but is under
> the 600-line ceiling.

## 1. Identify the Bloat

The God Component spans **6 files** and handles these distinct responsibilities:

| # | Responsibility | Files | Problem | Extraction Status |
|---|---|---|---|---|---|
| 1 | **Match Lifecycle State** | `MatchProvider.tsx` | `useState` for phase, match, error, hydrated, etc. + `useEffect` for session restore, restart, action registration | `MatchProvider` is the core; hooks need extracting (`useMatchLifecycle`) |
| 2 | **Commentary Feed & Streaming** | `CommentaryProvider.tsx`, `streaming.ts` | Polling intervals, buffer management, reveal pacing, injury tracking — all in effects | `streaming.ts` partially extracted (hook + pure functions in one file); `CommentaryProvider` still holds feed state + streaming responses + scope side-effects |
| 3 | **RPC Communication** | `MatchProvider.tsx`, `CommentaryProvider.tsx`, `useLiveMatchCommands.ts` | Mutations, simulation reads, command submission scattered across providers | `useLiveMatchCommands.ts` already standalone; `MatchProvider` and `CommentaryProvider` each hold their own RPC seams |
| 4 | **Session/State Persistence** | `MatchProvider.tsx`, `session.ts` | Active match tracking, restore, record/reveal state | ✅ `session.ts` extracted, but flat — target is `session/{index,types,activeMatch,revealedFeed}.ts` |
| 5 | **UI Presentation** | `MatchDayScreen.tsx`, `MatchControlPanel.tsx`, `KickoffPanel.tsx` | Layout, panels, forms, alerts | `MatchDayLayout` is inline in `MatchDayScreen.tsx`; `MatchControlPanel.tsx` renders children defined inline in `MatchControlPanel.tsx` |
| 6 | **Panel/Control State** | `useMatchControl.ts`, `matchControlContext.ts` | Draft state, substitution logic, tactic editing, keyboard handlers | ✅ `useMatchControl.ts` + `matchControlContext.ts` already extracted; network with `CommentaryProvider` via `submitCommand` action |
| 7 | **Event/Action Dispatch** | `MatchProvider.tsx`, `useMatchControl.ts` | `registerActionHandler` calls inside effects | Partially extracted to `actions/dispatch.js` (renderer root); provider/hook actions still registered inline |
| 8 | **Scope/Side-effect State** | `CommentaryProvider.tsx`, `streaming.ts` | `setScopeState`, `clearScopeState`, interval management | ❌ Still inside `CommentaryProvider.tsx` and `streaming.ts` — should move to a standalone `useMatchScope` hook |

## 2. Modular Blueprint

```
match/
├── index.ts                          # Barrel: re-exports public API
├── types.ts                          # Shared TypeScript interfaces/types
│
├── MatchDayScreen.tsx                # ORCHESTRATOR: composes children, zero logic
├── MatchDayLayout.tsx                # Presentational layout wrapper
│
├── providers/
│   ├── MatchProvider.tsx             # ONLY: match lifecycle state + RPC
│   ├── CommentaryProvider.tsx        # ONLY: feed/commentary state + scoring
│   └── MatchControlProvider.tsx      # ONLY: panel state + control logic
│
├── hooks/
│   ├── useMatchLifecycle.ts          # Session restore, phase transitions, start/commit
│   ├── useMatchStreaming.ts          # Polling, pacing, reveal loop, game clock
│   ├── useCommentaryFeed.ts          # Buffer management, reveal logic, injury tracking
│   ├── useMatchCommands.ts           # Command submission, validation, status
│   └── useHalftimeInstruction.ts     # Already extracted (good)
│
├── components/
│   ├── MatchCommentaryStream.tsx     # Stateless: renders revealed lines
│   ├── KickoffPanel.tsx              # Stateless: fixture blockers/advisories/buttons
│   ├── PostMatchSummary.tsx          # Stateless: summary display + navigation
│   ├── MatchControlPanel.tsx         # Stateless: panel shell + header
│   │   ├── PanelHeader.tsx
│   │   ├── TeamInstructionSliders.tsx
│   │   ├── SubstitutionControl.tsx
│   │   ├── InjuryDecisionModal.tsx
│   │   └── InstructionSlider.tsx     # Generic <T> slider component
│   └── Scoreboard.tsx                # Already extracted (good)
│
├── engine/
│   ├── pace.ts                       # Pure functions: nextPaceDecision, shouldPollMatch
│   ├── shouldPauseMatch.ts           # Pure function
│   └── controlledClub.ts             # Pure functions (already exists, moves here)
│
├── session/
│   ├── index.ts                      # Barrel
│   ├── types.ts                      # ActiveMatchSession, RevealedInjury, etc.
│   ├── activeMatch.ts                # setActiveMatch, getActiveMatch, clearActiveMatch
│   └── revealedFeed.ts               # getRevealedFeed, record* functions
│
├── actions/
│   ├── index.ts                      # Barrel
│   ├── dispatch.ts                   # dispatchAction, registerActionHandler
│   └── scopeState.ts                 # setScopeState, clearScopeState
│
└── utils/
    ├── commandStatus.ts              # resolveCommandStatus, commandStatusLabel
    ├── substitution.ts               # validateLiveSubstitution, error labels
    └── format.ts                     # formatMinute, etc.
```

### Files in the Current Folder Not in the Target Blueprint

These exist in `apps/desktop/src/renderer/match/` and must be accounted for:

| File | Purpose | Destination |
|---|---|---|
| `useLiveMatchCommands.ts` | Standalone command surface (Screen 97): reads session store + one `resumeSimulation` read | Keep as-is under `hooks/` or `commands/` |
| `LiveCommandFrame.tsx` | Presentational frame for the standalone screens | `components/` |
| `MatchRatingsView.tsx` | Player ratings readout during match | `components/` |
| `MatchStatsView.tsx` | Match statistics view | `components/` |
| `useBoundMatchRead.ts` | Shared read seam for bound match contexts | `hooks/` |
| `controls.ts` | Exports `SELECT_CLASS` CSS constant for native selects | `utils/` or inline in component files |
| `MatchControlPanel.tsx` | Panel shell component (already extracted) | `components/MatchControlPanel.tsx` |

### Architectural Decision: Providers vs Hooks

The current codebase has two patterns running side by side:

- **Providers** (`MatchProvider`, `CommentaryProvider`, `MatchControlContext`) — React context providers that wrap hooks and expose context via `createContext`/`useContext`
- **Hooks** (`useMatchControl`, `useHalftimeInstruction`, `useLiveMatchCommands`) — standalone functions that return values directly, no context wrapper

The roadmap's `providers/` folder implies wrapping every hook in a context provider. **Consider dropping the provider layer entirely** — `CommentaryProvider` is the only one that genuinely needs context nesting (it reads from `MatchProvider`). For everything else, the hook pattern is simpler: call the hook directly in the orchestration layer, no context indirection.

If providers stay, `MatchControlProvider` should use the existing `matchControlContext.ts` context rather than defining its own.

### Dependency Map

```
MatchDayScreen
  └─ MatchProvider (context)
       ├─ useMatchLifecycle        ← depends on: session store, RPC mutations, action dispatch
       └─ CommentaryProvider (context)
            ├─ useCommentaryFeed   ← depends on: session store, RPC reads, controlledClub pure fns
            ├─ useMatchStreaming   ← depends on: matchState, commentaryMeta, engine/pace pure fns
            └─ useMatchScope       ← depends on: scopeState actions
  (sibling, reads both contexts)
  └─ useMatchControl               ← depends on: matchState, commentaryActions, RPC tactics read
```

Arrow direction = reads from / depends on.

### Migration Sequencing (Phased Plan)

Each phase is one PR-sized chunk. Phases are ordered so no phase blocks itself by needing something not yet extracted.

| Phase | Work | Value | Risk | Prerequisites |
|---|---|---|---|---|
| **P0** | Split `streaming.ts` → `engine/pace.ts` (pure fns) + keep `useMatchStreaming` in `streaming.ts` | Low mechanical effort, clears the pure/impure boundary, unblocks Phase 2 | Low — pure functions with no dependencies | None |
| **P1** | Extract `useMatchLifecycle` from `MatchProvider.tsx`. Keep the provider as a thin context wrapper. | High — isolates the lifecycle state machine, session persistence, and action registration from the provider | Medium — `MatchProvider` is the outermost context; any refactoring there affects everything inside it | None |
| **P2** | Extract `useCommentaryFeed` from `CommentaryProvider.tsx`. Same pattern: provider becomes a thin wrapper. | Highest — `CommentaryProvider` is the largest file and holds the most intertwined state (feed + streaming + scope side-effects) | Highest — `CommentaryProvider`'s callbacks (`applyPollView`, `revealLine`, `submitCommand`) are deeply coupled to its mutable refs | P1 (reads `matchState` from `MatchProvider`) |
| **P3** | Extract `useMatchScope` from `CommentaryProvider.tsx` — the `setScopeState`/`clearScopeState` effect moves here | Medium — removes a side-effect leak from the commentary domain | Low — purely moves an existing effect to its own hook | P2 |
| **P4** | Extract `engine/shouldPauseMatch.ts` from `streaming.ts` (single function, trivial) | Low — completeness, aligns with engine folder convention | Low | P0 |
| **P5** | Create `session/{index,types,activeMatch,revealedFeed}.ts` from `session.ts` | Low — mechanical split, no logic changes | Low — import updates across all consumers | None |
| **P6** | Create `types.ts` — consolidate inline types from `MatchProvider.tsx`, `CommentaryProvider.tsx`, `matchControlContext.ts`, `useMatchControl.ts`, `streaming.ts` | Medium — single source of truth for match types; all imports must update | Medium — risk of missing a type re-export; `matchControlContext.ts` already exists and is imported by consumers — decide whether to merge or keep separate | P1, P2 |
| **P7** | Extract component children from `MatchControlPanel.tsx`: `PanelHeader.tsx`, `TeamInstructionSliders.tsx`, `SubstitutionControl.tsx`, `InjuryDecisionModal.tsx`, `InstructionSlider.tsx` | Medium — isolates presentational logic, enables `React.memo` for stable props | Low — purely mechanical extraction of render logic | None |
| **P8** | Extract `MatchDayLayout.tsx` from `MatchDayScreen.tsx` — the layout switch lives in its own file | Low — completes the orchestrator pattern | Low | None |
| **P9** | Performance fixes: stable refs in `useCommentaryFeed`, stable action references in `useMatchControl`, `React.memo` for presentational children | High — addresses the #1 frame-rate killer (interval cleanup on every render) | Medium — requires understanding of the closure chain in `CommentaryProvider` | P2 |

### Cost/Benefit Guidance

- **Start with P0 or P1** — both are low-risk and immediately improve the codebase
- **Do P2 early** — it's the highest risk but also the highest payoff; the `CommentaryProvider` is where most bugs and performance issues originate
- **P5 and P8 can happen anytime** — they're pure mechanical moves with no logic changes
- **P6 (types consolidation) should be late** — it creates churn across all files; do it once the structure is settled
- **P9 (performance) is only safe after P2** — you need the extracted hook to test that refs don't break the closure chain

### match/types.ts — Strict Contracts

> **Note**: `PanelMode`, `MatchControlState`, `MatchControlActions`, `MatchControlMeta`, and `MatchControlContextValue` already exist in `matchControlContext.ts`. The target `types.ts` should merge these or re-export them. They are listed here for completeness but won't need rewriting from scratch.

```typescript
// match/types.ts
import type {
  ClubId,
  InjuryView,
  MatchId,
  MatchSummary,
  PlayerId,
  SaveId,
  SquadPlayerView,
  SubstitutionStatusView,
  Tactic,
  TacticSlot,
} from "@cm-clone/contracts";
import type { Mentality, Pressing, Tempo } from "@cm-clone/shared";
import type { MatchCommand } from "./MatchProvider.js";
import type { CommandStatus } from "./commandStatus.js";

// ── Match Phase ──────────────────────────────────────────────────────────────

export type MatchPhase =
  | "awaiting-kickoff"
  | "starting"
  | "live"
  | "paused"
  | "complete"
  | "committing"
  | "committed";

// ── Match Lifecycle ──────────────────────────────────────────────────────────

export interface MatchLifecycleState {
  readonly pending: PendingFixtureView | null;
  readonly match: MatchSummary | null;
  readonly error: string | null;
  readonly phase: MatchPhase;
  readonly hydrated: boolean;
  readonly saveId: SaveId;
  readonly restoredAfterRestart: boolean;
  readonly quick: boolean;
}

export interface MatchLifecycleActions {
  startMatch: (mode: MatchMode) => Promise<void>;
  commitResult: () => Promise<void>;
  setPhaseComplete: () => void;
  setPhasePaused: (paused: boolean) => void;
  reportError: (message: string) => void;
}

export type MatchMode = "play" | "quick";

export interface PendingFixtureView {
  readonly fixtureId: string;
  readonly opponentClubName: string;
  readonly isHome: boolean;
  readonly blockers: ReadonlyArray<Blocker>;
  readonly advisories: ReadonlyArray<Advisory>;
  readonly matchId: MatchId | null;
}

export interface Blocker {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
}

export interface Advisory {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
}

// ── Commentary Feed ──────────────────────────────────────────────────────────

export interface CommentaryFeedState {
  readonly revealed: ReadonlyArray<CommentaryLineView>;
  readonly homeScore: number;
  readonly awayScore: number;
  readonly clubSubs: SubstitutionStatusView;
  readonly clubSubsKnown: boolean;
  readonly clubOnPitchCount: number;
  readonly clubPitch: MatchPitchView | null;
  readonly revealedInjuries: ReadonlyArray<RevealedInjury>;
  readonly currentMinute: number;
}

export interface CommentaryFeedActions {
  submitCommand: (command: MatchCommand, isHalftime: boolean) => Promise<CommandStatus>;
  resume: () => void;
}

export interface CommentaryFeedMeta {
  readonly cursorRef: { readonly current: number };
  readonly pendingRef: { readonly current: Array<CommentaryLineView> };
  readonly fetchingRef: { readonly current: boolean };
  readonly streamCompleteRef: { readonly current: boolean };
  readonly pausedRef: { readonly current: boolean };
  readonly commandInFlightRef: { readonly current: boolean };
  readonly commandRequestRef: { readonly current: number };
  readonly pitchSentRef: { readonly current: number };
  readonly pitchAppliedRef: { readonly current: number };
  readonly clubSubsRef: { readonly current: SubstitutionStatusView };
  readonly revealedInjuriesRef: { readonly current: ReadonlyArray<RevealedInjury> };
  readonly injuryByLineRef: { readonly current: WeakMap<CommentaryLineView, InjuryView> };
  readonly lastRevealedInjuryRef: { readonly current: LastRevealedInjury | null };
  readonly capReachedRef: { readonly current: boolean };
  readonly mountedRef: { readonly current: boolean };
  readonly restoreReadRef: { readonly current: boolean };
  readonly nextPitchRequest: () => number;
  readonly applyPollView: (view: RpcSuccess<"resumeSimulation">, request: number) => void;
  readonly revealLine: (line: CommentaryLineView) => void;
  readonly setPaused: (paused: boolean) => void;
  readonly reportError: (message: string) => void;
}

export interface RevealedInjury {
  readonly injury: InjuryView;
  readonly capReachedWhenRevealed: boolean;
}

export interface LastRevealedInjury {
  readonly revealed: RevealedInjury;
  readonly minute: number;
}

// ── Match Control Panel ──────────────────────────────────────────────────────

export type PanelMode =
  | { readonly _tag: "closed" }
  | { readonly _tag: "open" }
  | { readonly _tag: "injury-prompt"; readonly severity: "red" | "orange" }
  | { readonly _tag: "injury-decision" }
  | { readonly _tag: "sub-draft" };

export interface MatchControlState {
  readonly open: boolean;
  readonly squad: ReadonlyArray<SquadPlayerView>;
  readonly tactic: Tactic | null;
  readonly outPlayerId: PlayerId;
  readonly inPlayerId: PlayerId;
  readonly atHalftime: boolean;
  readonly isHalftime: boolean;
  readonly status: string | null;
  readonly subAlert: string | null;
  readonly mode: PanelMode;
  readonly subsStatus: SubstitutionStatusView;
  readonly subsKnown: boolean;
  readonly onPitchCount: number;
  readonly pitch: MatchPitchView | null;
  readonly injuryPrompt: boolean;
  readonly hasRedInjury: boolean;
  readonly orangeInjury: InjuryView | undefined;
  readonly isShorthanded: boolean;
}

export interface MatchControlActions {
  readonly setIsHalftime: (value: boolean) => void;
}

export interface MatchControlMeta {
  readonly toggleRef: { readonly current: HTMLButtonElement | null };
}

export interface MatchControlInput {
  readonly clubId: ClubId;
  readonly subsStatus: SubstitutionStatusView;
  readonly subsKnown: boolean;
  readonly onPitchCount: number;
  readonly pitch: MatchPitchView | null;
  readonly injuries: ReadonlyArray<InjuryView>;
}

export interface MatchControlContextValue {
  readonly state: MatchControlState;
  readonly actions: MatchControlActions;
  readonly meta: MatchControlMeta;
}

// ── Streaming ────────────────────────────────────────────────────────────────

export interface PollReadiness {
  readonly fetching: boolean;
  readonly streamComplete: boolean;
  readonly paused: boolean;
  readonly bufferLength: number;
}

export type PaceDecision = "wait" | "reveal" | "complete";

export interface PaceDecisionInput {
  readonly paused: boolean;
  readonly bufferLength: number;
  readonly streamComplete: boolean;
}

// ── Props ────────────────────────────────────────────────────────────────────

export interface MatchDayScreenProps {
  readonly saveId: SaveId;
}

export interface MatchDayLayoutProps {
  readonly children: ReactNode;
}

export interface KickoffPanelProps {
  readonly pending: PendingFixtureView;
  readonly phase: MatchPhase;
  readonly starting: boolean;
  readonly onPlay: () => void;
  readonly onQuickResult: () => void;
}

export interface MatchCommentaryStreamProps {
  readonly phase: MatchPhase;
  readonly revealed: ReadonlyArray<CommentaryLineView>;
  readonly match: MatchSummary | null;
}

export interface MatchControlPanelProps {
  readonly clubId: ClubId;
  readonly subsStatus: SubstitutionStatusView;
  readonly subsKnown: boolean;
  readonly onPitchCount: number;
  readonly pitch: MatchPitchView | null;
  readonly injuries: ReadonlyArray<InjuryView>;
}

export interface PostMatchSummaryProps {
  readonly saveId: SaveId;
  readonly matchId: MatchId;
}

export interface ScoreboardProps {
  readonly home: ScoreboardSide;
  readonly away: ScoreboardSide;
  readonly status: string;
  readonly onOpen: () => void;
}

export interface ScoreboardSide {
  readonly name: string;
  readonly colours: ClubColoursView;
  readonly score: number;
}

// ── Command Status ───────────────────────────────────────────────────────────

export type CommandStatus =
  | { readonly _tag: "applied" }
  | { readonly _tag: "rejected"; readonly reason: string }
  | { readonly _tag: "pending" };
```

### hooks/useMatchLifecycle.ts

```typescript
// hooks/useMatchLifecycle.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { Cause, Effect, Exit, Result } from "effect";
import type { MatchMode, MatchSummary, PendingFixtureView, RpcPayload, SaveId } from "@cm-clone/contracts";
import type { MatchPhase } from "../types.js";
import {
  commitMatchdayMutation,
  getAwaitingMatch,
  leagueTableAtom,
  startMatchMutation,
  useAtomSet,
  useAtomValue,
} from "../rpc.js";
import { describeRpcError, type RpcClientError } from "../rpc/errors.js";
import { registerActionHandler } from "../actions/dispatch.js";
import { clearActiveMatch, getActiveMatch, setActiveMatch } from "../session/index.js";
import type { MatchLifecycleState, MatchLifecycleActions, MatchCommand } from "../types.js";

const NO_MATCH: MatchSummary | null = null;

export function useMatchLifecycle(saveId: SaveId): {
  state: MatchLifecycleState;
  actions: MatchLifecycleActions;
} {
  const [match, setMatch] = useState<MatchSummary | null>(NO_MATCH);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<MatchPhase>("awaiting-kickoff");
  const [hydrated, setHydrated] = useState(false);
  const [restoredAfterRestart, setRestoredAfterRestart] = useState(false);
  const [quick, setQuick] = useState(false);

  const tableResult = useAtomValue(leagueTableAtom(saveId));
  const pending = tableResult._tag === "Success" ? tableResult.value.season.awaitingFixture : null;
  const seasonRefreshing = tableResult.waiting;
  const runStartMatch = useAtomSet(startMatchMutation, { mode: "promiseExit" });
  const runCommitMatchday = useAtomSet(commitMatchdayMutation, { mode: "promiseExit" });
  const startingRef = useRef(false);

  // ── Actions ──────────────────────────────────────────────────────────────

  const startMatch = useCallback(async (mode: MatchMode): Promise<void> => {
    if (pending === null) return;
    setError(null);
    setPhase("starting");
    startingRef.current = true;
    const exit = await runStartMatch({ saveId, fixtureId: pending.fixtureId, mode });
    startingRef.current = false;
    if (Exit.isFailure(exit)) {
      setError(describeRpcError(Cause.squash(exit.cause) as RpcClientError<"startMatch">));
      setPhase("awaiting-kickoff");
      return;
    }
    setMatch(exit.value);
    setRestoredAfterRestart(false);
    setQuick(mode === "quick");
    setPhase("live");
  }, [saveId, pending, runStartMatch]);

  const commitResult = useCallback(async (): Promise<void> => {
    if (match === null) return;
    setError(null);
    setPhase("committing");
    const exit = await runCommitMatchday({ saveId, fixtureId: match.fixtureId });
    if (Exit.isFailure(exit)) {
      setError(describeRpcError(Cause.squash(exit.cause) as RpcClientError<"commitMatchday">));
      setPhase("complete");
      return;
    }
    setPhase("committed");
  }, [saveId, match, runCommitMatchday]);

  const inPlay = (current: MatchPhase): boolean => current === "live" || current === "paused";
  const setPhaseComplete = useCallback(() => setPhase((c) => (inPlay(c) ? "complete" : c)), []);
  const setPhasePaused = useCallback(
    (paused: boolean) => setPhase((c) => (inPlay(c) ? (paused ? "paused" : "live") : c)),
    [],
  );
  const reportError = useCallback((message: string) => setError(message), []);

  // ── Session restore ────────────────────────────────────────────────────

  useEffect(() => {
    const resumed = getActiveMatch(saveId);
    if (resumed !== null) {
      setMatch(resumed.match);
      setPhase(resumed.phase);
      setRestoredAfterRestart(resumed.restoredAfterRestart === true);
      setQuick(resumed.quick === true);
    }
    setHydrated(true);
  }, [saveId]);

  // ── Restart restore ────────────────────────────────────────────────────

  const awaitingMatchId = pending?.matchId ?? null;
  useEffect(() => {
    if (!hydrated || match !== null || awaitingMatchId === null || seasonRefreshing || startingRef.current) return;
    let current = true;
    setPhase("starting");
    const resume = async (): Promise<void> => {
      const outcome = await Effect.runPromise(
        getAwaitingMatch({ saveId, matchId: awaitingMatchId }).pipe(Effect.result),
      );
      if (!current) return;
      if (Result.isFailure(outcome)) {
        setError(describeRpcError(outcome.failure as RpcClientError<"getAwaitingMatch">));
        setPhase("awaiting-kickoff");
        return;
      }
      setError(null);
      setMatch(outcome.success);
      setRestoredAfterRestart(true);
      setQuick(false);
      setPhase("live");
    };
    resume();
    return () => {
      current = false;
      setPhase((p) => (p === "starting" ? "awaiting-kickoff" : p));
    };
  }, [hydrated, match, awaitingMatchId, seasonRefreshing, saveId]);

  // ── Session persistence ────────────────────────────────────────────────

  useEffect(() => {
    if (match === null || phase === "committing" || phase === "committed") return;
    setActiveMatch({ saveId, match, phase, restoredAfterRestart, quick });
  }, [saveId, match, phase, restoredAfterRestart, quick]);

  useEffect(() => {
    if (phase === "committed") clearActiveMatch(saveId);
  }, [phase, saveId]);

  // ── Action registration ────────────────────────────────────────────────

  useEffect(() => {
    const unreg = registerActionHandler("start-match", () => void startMatch("play"));
    const unregQuick = registerActionHandler("quick-result", () => void startMatch("quick"));
    const unregCommit = registerActionHandler("commit-matchday", () => void commitResult());
    return () => { unreg(); unregQuick(); unregCommit(); };
  }, [saveId, startMatch, commitResult]);

  const state: MatchLifecycleState = {
    pending, match, error, phase, hydrated, saveId, restoredAfterRestart, quick,
  };
  const actions: MatchLifecycleActions = { startMatch, commitResult, setPhaseComplete, setPhasePaused, reportError };

  return { state, actions };
}
```

### hooks/useCommentaryFeed.ts

```typescript
// hooks/useCommentaryFeed.ts
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Effect, Result } from "effect";
import { nextCommandMinute } from "@cm-clone/game-engine";
import type {
  CommentaryLineView,
  InjuryView,
  MatchPitchView,
  RpcSuccess,
  SaveId,
  SubstitutionStatusView,
} from "@cm-clone/contracts";
import { setScopeState, clearScopeState } from "../actions/scopeState.js";
import { describeRpcError, type RpcClientError } from "../rpc/errors.js";
import { resumeSimulation, submitMatchCommandMutation, useAtomSet } from "../rpc.js";
import { controlledOnPitchCount, controlledPitch, controlledSubs } from "../engine/controlledClub.js";
import {
  getActiveMatch,
  getHalfTimeRevealed,
  getRevealedEvents,
  getRevealedFeed,
  recordClubSubs,
  recordHalfTimeRevealed,
  recordRevealedEvents,
  recordRevealedInjuries,
  recordRevealedLines,
  recordRevealedMinute,
  recordRevealedScore,
  type LastRevealedInjury,
  type RevealedInjury,
} from "../session/index.js";
import type { CommentaryFeedState, CommentaryFeedActions, CommentaryFeedMeta, CommentaryContextValue } from "../types.js";

const NO_SUBS: SubstitutionStatusView = { used: 0, remaining: 5, windowsUsed: 0, windowsRemaining: 3, capReached: false };
const STATE_CHANGING_TAGS: ReadonlySet<string> = new Set(["Goal", "RedCard", "Injury", "Substitution", "FullTimeWhistle"]);

export function useCommentaryFeed(saveId: SaveId): CommentaryContextValue {
  const [revealed, setRevealed] = useState<ReadonlyArray<CommentaryLineView>>([]);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [clubSubs, setClubSubs] = useState<SubstitutionStatusView>(NO_SUBS);
  const [clubSubsKnown, setClubSubsKnown] = useState(false);
  const [clubOnPitchCount, setClubOnPitchCount] = useState(11);
  const [clubPitch, setClubPitch] = useState<MatchPitchView | null>(null);
  const [revealedInjuries, setRevealedInjuries] = useState<ReadonlyArray<RevealedInjury>>([]);
  const [currentMinute, setCurrentMinute] = useState(0);

  const cursorRef = useRef(0);
  const pendingRef = useRef<Array<CommentaryLineView>>([]);
  const fetchingRef = useRef(false);
  const streamCompleteRef = useRef(false);
  const pausedRef = useRef(false);
  const commandInFlightRef = useRef(false);
  const commandRequestRef = useRef(0);
  const pitchSentRef = useRef(0);
  const pitchAppliedRef = useRef(0);
  const clubSubsRef = useRef(NO_SUBS);
  const revealedInjuriesRef = useRef<ReadonlyArray<RevealedInjury>>([]);
  const injuryByLineRef = useRef(new WeakMap<CommentaryLineView, InjuryView>());
  const lastRevealedInjuryRef = useRef<LastRevealedInjury | null>(null);
  const capReachedRef = useRef(false);
  const mountedRef = useRef(true);
  const restoreReadRef = useRef(false);

  const runCommand = useAtomSet(submitMatchCommandMutation, { mode: "promise" });

  // ── Meta ───────────────────────────────────────────────────────────────

  const nextPitchRequest = useCallback((): number => { pitchSentRef.current += 1; return pitchSentRef.current; }, []);

  const applyRevealedState = useCallback((view: RpcSuccess<"resumeSimulation">, request: number): void => {
    if (matchState.match === null || request < pitchAppliedRef.current) return;
    pitchAppliedRef.current = request;
    setHomeScore(view.homeScore);
    setAwayScore(view.awayScore);
    if (mountedRef.current) recordRevealedScore(saveId, matchState.match.matchId, { homeScore: view.homeScore, awayScore: view.awayScore });
    setClubOnPitchCount(controlledOnPitchCount(matchState.match, view));
    setClubPitch(controlledPitch(matchState.match, view));
  }, [saveId]); // Note: matchState.match should be extracted

  const applyClubSubs = useCallback((view: RpcSuccess<"resumeSimulation">, neverLower: boolean): void => {
    // ... implementation
  }, [saveId]);

  const applyPollView = useCallback((view: RpcSuccess<"resumeSimulation">, request: number): void => {
    if (request < commandRequestRef.current) return;
    cursorRef.current = view.cursor;
    const injuryLines = view.lines.filter((l) => l.tag === "Injury");
    for (const [index, line] of injuryLines.entries()) {
      const injury = view.injuries[index];
      if (injury !== undefined) injuryByLineRef.current.set(line, injury);
    }
    pendingRef.current.push(...view.lines);
    if (view.isComplete) streamCompleteRef.current = true;
    applyClubSubs(view, true);
    applyRevealedState(view, request);
  }, [applyClubSubs, applyRevealedState]);

  const updateInjuries = useCallback((update: (current: ReadonlyArray<RevealedInjury>) => ReadonlyArray<RevealedInjury>): void => {
    // ... implementation
  }, [saveId]);

  const revealLine = useCallback((line: CommentaryLineView): void => {
    // ... implementation
  }, [saveId]);

  const submitCommand = useCallback(async (command: MatchCommand, isHalftime: boolean): Promise<CommandStatus> => {
    // ... implementation
  }, [saveId, currentMinute, runCommand]);

  const setPaused = useCallback((paused: boolean) => { /* ... */ }, []);
  const reportError = useCallback((message: string) => { /* ... */ }, []);

  const meta: CommentaryFeedMeta = {
    cursorRef, pendingRef, fetchingRef, streamCompleteRef, pausedRef,
    commandInFlightRef, commandRequestRef, pitchSentRef, pitchAppliedRef,
    clubSubsRef, revealedInjuriesRef, injuryByLineRef, lastRevealedInjuryRef,
    capReachedRef, mountedRef, restoreReadRef, nextPitchRequest,
    applyPollView, revealLine, setPaused, reportError,
  };

  const state: CommentaryFeedState = { revealed, homeScore, awayScore, clubSubs, clubSubsKnown, clubOnPitchCount, clubPitch, revealedInjuries, currentMinute };
  const actions: CommentaryFeedActions = { submitCommand, resume: useCallback(() => updateInjuries(() => []), [updateInjuries]) };

  return { state, actions, meta };
}
```

### hooks/useMatchStreaming.ts

> **Current state**: Already exists in `streaming.ts` as a standalone hook. The current implementation reads contexts internally (`useMatchContext()`, `useCommentaryContext()`) — no parameters passed in. The roadmap's original param-passing signature is outdated. The snippet below matches the current implementation; the remaining work is to split the pure functions into `engine/pace.ts`.

```typescript
// streaming.ts (current as of review — target: hooks/useMatchStreaming.ts + engine/pace.ts)
import { useEffect } from "react";
import { Effect, Result } from "effect";
import type { ClubId, InjuryView } from "@cm-clone/contracts";
import {
  POLL_INTERVAL_MS, REFETCH_THRESHOLD, REVEAL_INTERVAL_MS,
  resumeSimulation,
} from "../rpc.js";
import { useMatchContext } from "./MatchProvider.js";
import { controlledClubId } from "./controlledClub.js";
import { useCommentaryContext } from "./CommentaryProvider.js";
import { getRevealedEvents } from "./session.js";

export const shouldPauseMatch = (
  injuries: ReadonlyArray<InjuryView>, clubId: ClubId, capReached: boolean,
): boolean => injuries.some((injury) => injury.teamClubId === clubId) && capReached;

export interface PollReadiness {
  readonly fetching: boolean; readonly streamComplete: boolean;
  readonly paused: boolean; readonly bufferLength: number;
}

export const shouldPollMatch = ({
  fetching, streamComplete, paused, bufferLength,
}: PollReadiness): boolean =>
  !fetching && !streamComplete && !paused && bufferLength <= REFETCH_THRESHOLD;

export type PaceDecision = "wait" | "reveal" | "complete";

export interface PaceDecisionInput {
  readonly paused: boolean; readonly bufferLength: number; readonly streamComplete: boolean;
}

export const nextPaceDecision = ({
  paused, bufferLength, streamComplete,
}: PaceDecisionInput): PaceDecision =>
  paused ? "wait" : bufferLength > 0 ? "reveal" : streamComplete ? "complete" : "wait";

export const useMatchStreaming = (): void => {
  const { state: matchState, actions: matchActions } = useMatchContext();
  const { state: commState, meta: commMeta } = useCommentaryContext();
  const setPhaseComplete = matchActions.setPhaseComplete;
  const { match, hydrated, phase, quick } = matchState;

  // Effect 1: Pause decision — read from context, no params
  useEffect(() => {
    if (!hydrated || match === null || phase === "complete") return;
    const clubId = controlledClubId(match);
    const needsDecision = !quick && commState.revealedInjuries.some(
      ({ injury, capReachedWhenRevealed }) => shouldPauseMatch([injury], clubId, capReachedWhenRevealed),
    );
    commMeta.pausedRef.current = needsDecision;
    commMeta.setPaused(needsDecision);
  }, [match, phase, quick, commState.revealedInjuries, commMeta.setPaused, hydrated]);

  // Effect 2: Polling loop — reads commMeta refs directly
  useEffect(() => {
    if (!hydrated || match === null) return;
    let active = true;
    const poll = async (): Promise<void> => { /* ... same implementation ... */ };
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => { active = false; clearInterval(interval); };
  }, [match, quick, matchState.saveId, commMeta.nextPitchRequest, commMeta.applyPollView, commMeta.revealLine, commMeta.reportError, setPhaseComplete, hydrated]);

  // Effect 3: Pace decision / reveal timer
  useEffect(() => {
    if (match === null) return;
    const interval = setInterval(() => { /* ... */ }, REVEAL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [match, commMeta.revealLine, setPhaseComplete]);
};
```

### hooks/useLiveMatchCommands.ts

> **Already exists** in `useLiveMatchCommands.ts`. Standalone command surface (Screen 97) — not part of the God Component but lives in the same folder. Listed here for completeness.

```typescript
// hooks/useLiveMatchCommands.ts — already extracted
export const useLiveMatchCommands = (saveId: SaveId): LiveMatchCommands => {
  // Reads active match from session store, reads squad/tactics from RPC,
  // runs one command at a time through submitMatchCommandMutation
};
```
```

### engine/pace.ts — Pure Functions

```typescript
// engine/pace.ts
import type { PaceDecision, PaceDecisionInput, PollReadiness } from "../types.js";
import { REFETCH_THRESHOLD } from "../rpc.js";

export const shouldPollMatch = ({ fetching, streamComplete, paused, bufferLength }: PollReadiness): boolean =>
  !fetching && !streamComplete && !paused && bufferLength <= REFETCH_THRESHOLD;

export const nextPaceDecision = ({ paused, bufferLength, streamComplete }: PaceDecisionInput): PaceDecision =>
  paused ? "wait" : bufferLength > 0 ? "reveal" : streamComplete ? "complete" : "wait";

export const shouldPauseMatch = (
  injuries: ReadonlyArray<InjuryView>,
  clubId: ClubId,
  capReached: boolean,
): boolean => injuries.some((injury) => injury.teamClubId === clubId) && capReached;
```

### engine/controlledClub.ts — Pure Functions (moved)

```typescript
// engine/controlledClub.ts
import type { ClubId, MatchPitchView, MatchSummary, RpcSuccess, SubstitutionStatusView } from "@cm-clone/contracts";

export const controlledClubId = (match: MatchSummary): ClubId => (match.isHome ? match.homeClubId : match.awayClubId);
export const controlledSubs = (match: MatchSummary, view: RpcSuccess<"resumeSimulation"> | RpcSuccess<"submitMatchCommand">): SubstitutionStatusView =>
  match.isHome ? view.homeSubs : view.awaySubs;
export const controlledPitch = (match: MatchSummary, view: RpcSuccess<"resumeSimulation"> | RpcSuccess<"submitMatchCommand">): MatchPitchView =>
  match.isHome ? view.homePitch : view.awayPitch;
export const controlledOnPitchCount = (match: MatchSummary, view: RpcSuccess<"resumeSimulation">): number =>
  match.isHome ? view.homeOnPitchCount : view.awayOnPitchCount;
```

### components/MatchDayScreen.tsx — Orchestrator Only

```tsx
// MatchDayScreen.tsx
import { MatchProvider } from "../providers/MatchProvider.js";
import { CommentaryProvider } from "../providers/CommentaryProvider.js";
import { MatchDayLayout } from "./MatchDayLayout.js";

export const MatchDayScreen = ({ saveId }: { readonly saveId: SaveId }) => (
  <MatchProvider saveId={saveId}>
    <CommentaryProvider>
      <MatchDayLayout />
    </CommentaryProvider>
  </MatchProvider>
);
```

### components/MatchDayLayout.tsx — Pure Presentational

```tsx
// MatchDayLayout.tsx
import { MatchOngoing } from "./MatchOngoing.js";
import { MatchComplete } from "./MatchComplete.js";
import { KickoffPanel } from "./KickoffPanel.js";
import { useMatchContext } from "../providers/MatchProvider.js";

const MatchOngoing = () => (
  <>
    <MatchCommentaryStream />
    <MatchControlPanel />
  </>
);

const MatchComplete = ({ match }: { readonly match: MatchSummary }) => {
  const { state } = useMatchContext();
  const { state: comm } = useCommentaryContext();
  const committed = state.phase === "committed";
  return (
    <>
      <MatchCommentaryStream />
      {committed && <PostMatchSummary saveId={state.saveId} matchId={match.matchId} />}
      <div className="mt-4 flex items-center gap-3">
        <p className="font-semibold">
          Final score: {match.homeClubName} {comm.homeScore} - {comm.awayScore} {match.awayClubName}
        </p>
        {committed ? (
          <p className="text-text-secondary">Result accepted. Continue to move on.</p>
        ) : (
          <Button type="button" data-action-id="commit-matchday" disabled={state.phase === "committing"} onClick={() => void dispatchAction("commit-matchday")}>
            {state.phase === "committing" ? "Accepting..." : "Accept result"}
          </Button>
        )}
      </div>
    </>
  );
};

export const MatchDayLayout = () => {
  const { state } = useMatchContext();
  return (
    <main tabIndex={-1} data-focus-id="match" aria-label="Match day" className={`p-8 text-foreground ${FOCUS_RING.join(" ")}`}>
      <h1 className="text-2xl font-bold">Match day</h1>
      {state.error && <Alert variant="destructive" className="mt-2"><p>{state.error}</p></Alert>}
      {!state.match && <KickoffPanel />}
      {state.match && state.restoredAfterRestart && state.phase !== "committed" && (
        <Alert role="status" className="mt-2"><p>{RESTARTED_FROM_KICKOFF}</p></Alert>
      )}
      {state.match && (
        <section className="stadium-wash mt-6 rounded-panel border border-panel-border-dark p-4 shadow-panel">
          {state.phase === "complete" || state.phase === "committing" || state.phase === "committed"
            ? <MatchComplete match={state.match} />
            : <MatchOngoing />}
        </section>
      )}
    </main>
  );
};
```

### components/MatchCommentaryStream.tsx — Stateless Presentational

```tsx
// MatchCommentaryStream.tsx
import { MatchCommentaryStreamProps } from "../types.js";

const COMMENTARY_TONE: Readonly<Record<string, string>> = {
  Injury: "text-text-danger", RedCard: "text-text-danger", YellowCard: "text-text-warning",
  BigChance: "text-text-warning", ShotMissed: "text-text-warning",
  Goal: "text-text-success", ShotOnTarget: "text-text-success",
};

const commentaryTone = (tag: string): string => COMMENTARY_TONE[tag] ?? "";

export const MatchCommentaryStream = ({ phase, revealed, match }: MatchCommentaryStreamProps) => {
  if (match === null) return null;
  return (
    <>
      <p className="text-sm text-text-secondary">
        {phase === "complete" ? "Full time" : phase === "paused" ? "Paused — awaiting decision" : "Live"}
      </p>
      <ul className="mt-4 max-h-[60vh] space-y-1 overflow-y-auto rounded-panel border border-panel-border bg-panel-bg p-4 text-sm shadow-panel">
        {revealed.map((line, index) => (
          <li key={index} className="flex gap-3">
            <span className="w-10 shrink-0 tabular-nums text-text-muted">{line.minute}'</span>
            <span className={commentaryTone(line.tag)}>{line.text}</span>
          </li>
        ))}
        {revealed.length === 0 && <li className="text-text-muted">Kick-off is coming up...</li>}
      </ul>
    </>
  );
};
```

### components/KickoffPanel.tsx — Stateless Presentational

```tsx
// KickoffPanel.tsx
import { KickoffPanelProps } from "../types.js";

export const KickoffPanel = ({ pending, phase, starting, onPlay, onQuickResult }: KickoffPanelProps) => {
  if (pending === null) return <p className="mt-6 text-text-secondary">No Fixture is waiting. Continue the career to reach your next one.</p>;
  return (
    <section className="mt-6">
      <p className="text-lg font-semibold">{pending.isHome ? "Home" : "Away"} to {pending.opponentClubName}</p>
      {pending.blockers.length > 0 && (
        <ul className="mt-3 space-y-2">
          {pending.blockers.map((blocker) => (
            <li key={blocker.id} className="rounded-panel border border-destructive/40 p-3">
              <p className="font-semibold text-destructive">{blocker.title}</p>
              <p className="text-sm text-text-secondary">{blocker.detail}</p>
            </li>
          ))}
        </ul>
      )}
      {pending.advisories.length > 0 && (
        <ul aria-label="Before kickoff" className="mt-3 space-y-2">
          {pending.advisories.map((advisory) => (
            <li key={advisory.id} className="rounded-panel border border-border p-3">
              <p className="font-semibold">{advisory.title}</p>
              <p className="text-sm text-text-secondary">{advisory.detail}</p>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex items-center gap-2">
        <Button type="button" data-action-id="start-match" disabled={starting || pending.blockers.length > 0} onClick={onPlay}>
          {starting ? "Starting..." : "Play match"}
        </Button>
        <Button type="button" variant="secondary" data-action-id="quick-result" disabled={starting || pending.blockers.length > 0} onClick={onQuickResult}>
          Quick result
        </Button>
      </div>
    </section>
  );
};
```

## 4. Type Safety Summary

All types use `readonly` properties, discriminated unions for state machines (`PanelMode`, `MatchPhase`, `CommandStatus`, `LiveMatchView`, `SummaryState`), and strict `ReactNode`/`SaveId`/`MatchId` types. No `any` or loose types are used. The `RpcSuccess` and `RpcPayload` types from `@cm-clone/contracts` are used as-is for runtime compatibility.

## 5. Performance Audit — Stale Closures & Re-render Hazards

### Critical Issues in Extracted Hooks

| Location | Issue | Fix | Current Status |
|---|---|---|---|---|
| `useCommentaryFeed.submitCommand` | Depends on `matchState.match`, `currentMinute`, `matchState.saveId` — if any change between calls, the closure captures stale values | Wrap in `useCallback` with stable deps; use refs for `matchState.match` and `currentMinute` to avoid re-creating the function | **Still present** in `CommentaryProvider.tsx:357-394` — `submitCommand` deps include `[matchState.match, matchState.saveId, currentMinute, ...]`, re-created when these change |
| `useCommentaryFeed.applyRevealedState` | Depends on `matchState.match` and `matchState.saveId` — creates new function on every match change | Move `matchState` into refs (`matchRef`, `saveIdRef`) and read from refs inside the callback | **Still present** in `CommentaryProvider.tsx:193-206` — deps are `[matchState.match, matchState.saveId]` |
| `useCommentaryFeed.revealLine` | Depends on `matchState.match`, `matchState.saveId`, `updateInjuries` — re-created when match changes | Use refs for `matchState` snapshot; `updateInjuries` should be a stable ref-based function | **Still present** in `CommentaryProvider.tsx:290-318` — deps are `[matchState.match, matchState.saveId, updateInjuries]` |
| `useMatchStreaming` polling effect | `commMeta` object is recreated every render; deps array includes `commMeta.nextPitchRequest`, `commMeta.applyPollView`, `commMeta.revealLine`, `commMeta.reportError` — these cause the effect to re-run, resetting the interval | Destructure `commMeta` refs into stable variables; wrap interval logic in `useRef` that never changes; or use `useCallback` with empty deps and read from refs | **Still present** in `streaming.ts:137` — deps include `[..., commMeta.nextPitchRequest, commMeta.applyPollView, commMeta.revealLine, commMeta.reportError, ...]`. This is the #1 frame-rate killer |
| `useMatchStreaming` pace decision effect | `commMeta.revealLine` and `setPhaseComplete` in deps cause re-run | Read `commMeta.revealLine` from ref; wrap `setPhaseComplete` in `useCallback` with stable deps | **Still present** in `streaming.ts:156` — deps are `[match, commMeta.revealLine, setPhaseComplete]` |
| `useMatchControl` `onApplyTactics`, `onMakeSubstitution`, etc. | These are in the deps of `registerActionHandler` useEffect — every action re-registers handlers | Memoize with `useCallback` and use refs for mutable state (`tactic`, `outPlayerId`, `inPlayerId`); the `panelRef` pattern is correct but should be applied to all mutable values | **Partially mitigated** — `useMatchControl.ts:99-108` uses `panelRef` for snapshot, but action handlers at line 236 still depend on `[onApplyTactics, onBringOff, onMakeSubstitution, onDecisionResolved, tactic]` |
| `useMatchControl` `registerActionHandler` effect | Depends on `tactic`, `onApplyTactics`, `onBringOff`, `onMakeSubstitution`, `onDecisionResolved` — re-registers on every tactic change | Use refs for `tactic` and all action functions; the effect should run once with stable references | **Still present** in `useMatchControl.ts:236` |
| `useCommentaryFeed` `updateInjuries` | Depends on `matchState.match`, `matchState.saveId` — stale closure risk | Use refs for `matchState`; the `updateInjuries` function should read from refs | **Still present** in `CommentaryProvider.tsx:274-288` — deps are `[matchState.match, matchState.saveId]` |
| `useCommentaryFeed` `setScopeState`/`clearScopeState` effects | Side effects in `CommentaryProvider` that pollute the match scope | Extract to a dedicated `useMatchScope` hook or move to `useMatchStreaming` | **Still present** in `CommentaryProvider.tsx:326-333` |
| `CommentaryProvider` `liveMatch` effect | Reads `inPlay`, `homeClubName`, `awayClubName`, `homeScore`, `awayScore`, `currentMinute` — all state values — every render triggers re-subscription | This effect should use refs to avoid unnecessary re-runs; or split into a separate `useMatchScope` hook | **Still present** in `CommentaryProvider.tsx:322-332` — deps include `[inPlay, homeClubName, awayClubName, homeScore, awayScore, currentMinute]` |
| `MatchProvider` `startMatch`/`commitResult` | These are used in action registration `useEffect` deps — every state change re-registers | Wrap in `useCallback` with empty deps; use refs for `pending`, `match`, `startingRef` | **Still present** in `MatchProvider.tsx:212-217` — deps are `[saveId, startMatch, commitResult]` |
| `MatchProvider` session restore effect | `saveId` as dep — correct, but `startingRef` is not in deps | Add `startingRef` to deps or read from ref | **Still present** in `MatchProvider.tsx:167-195` — deps are `[hydrated, match, awaitingMatchId, seasonRefreshing, saveId]`; no `startingRef` |

### Performance Recommendations

1. **Replace inline state dependencies with refs** in `useCommentaryFeed` for values read inside async callbacks (`matchState`, `currentMinute`, `revealedInjuriesRef`). This prevents effect re-subscription churn on every state change.

2. **Stable action references**: All `registerActionHandler` callbacks must use `useCallback` with stable deps or read from refs. The current pattern of re-registering on every `tactic` change is a performance bottleneck.

3. **`useMemo` for derived values**: `mode` in `useMatchControl` (`computeMode()`) should be wrapped in `useMemo` — it runs on every render and allocates a new discriminated union object.

4. **`useCallback` for event handlers**: `InstructionSlider.onKeyDown` and all `Select` `onValueChange` handlers in `SubstitutionControl` create new closures on every render. Wrap in `useCallback`.

5. **`React.memo` for presentational children**: `MatchOngoing`, `MatchComplete`, `TeamInstructionSliders`, `SubstitutionControl`, `InjuryDecisionModal`, `PanelHeader`, `ScoreBox` should all be wrapped in `React.memo` since they receive stable props from context but re-render on every context change.

6. **Split `CommentaryContext` into two contexts**: `CommentaryStateContext` and `CommentaryActionsContext` — this prevents `MatchCommentaryStream` (which only reads state) from re-rendering when `submitCommand` changes.

7. **Move `setScopeState`/`clearScopeState` out of providers**: These side effects should be in a dedicated `useMatchScope` hook called by `MatchDayLayout`, not buried inside `CommentaryProvider`.

8. **`useMatchStreaming` interval cleanup**: The polling `useEffect` has a complex deps array including `commMeta` object references. If `commMeta` is recreated every render, the interval is cleared and re-created every render. **This is the #1 frame-rate killer** — fix by destructuring refs from `commMeta` and using a stable `useRef` for the interval ID.
