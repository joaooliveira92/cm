# 15 — Screen 2: New Game, Database Initialization

Type: task
Status: resolved
Blocked by: 03

## Question

Screen 2 (`02_new_game.md`, 29 sections, 1,141 lines) describes a database-initialization screen with a progress/checklist/status region. The implementation has no dedicated screen — entry is a "Start New Career" button on the Save List (`saveList.tsx:64-76`), and orchestration lives in `createFlow.tsx` (`handleBeginCareer`) and `main/saves.ts` (`beginCareer`).

Sections §4.2–§4.5 (progress/checklist/status region) are absent: nothing renders. The "Task checklist/Details panel" is absent. World/schema/economy init runs invisibly inside the `beginCareer` RPC when the player moves from step-1 to step-2.

The blanket-trim rows (ticket 03) are in the ledger. This ticket performs the `Reviewed` pass: read the implementation, write ledger rows for every section the implementation does not follow. No `unscheduled` rows.

Note: this screen shares `beginCareer` backend with Screen 6 and the creation flow with Screens 11/12. The audit follows the implementation, not the spec's boundary — it registers rows only for Screen 2's sections.

## Done when

Screen 2 has a `Reviewed` status in `RECONCILIATION.md` with rows for every section the implementation does not follow, and no `unscheduled` rows remain.

## Answer

**Screen 2 audited; all 28 content sections contradict the implementation, no new design decisions made.** See [New-game flow sequence and screens](../../../.agents/notes/proposed/feature/2026-08-29-new-game-flow-sequence.md).

The implementation follows a three-step creation flow (`createFlow.tsx`: Manager → Club → Review) instead of a dedicated Database Initialization screen. `beginCareer` (`saves.ts:58-71`) runs `createSchema` + `generateWorld` + `initializeSeasonEconomy(1)` synchronously inside `runAtEdge`, with no progress reporting, caching, manifest validation, or security checks matching the spec.

Rows written in `RECONCILIATION.md` for every section §1–§28 that the implementation does not follow, each `contradicted` and anchored to the existing flow-sequence note. §29 remains `out-of-scope` as non-normative scaffolding. No rows introduced use `unscheduled` as an anchor.

Key contradictions:
- §1–§3, §10: No database initialization screen exists; world generation runs *underneath* the manager step (Step 1 → Step 2), not as a pre-league-selection phase.
- §4.2–§4.5: Step 2 renders only "Generating the world…" — no status region, progress bar, task checklist, or details panel.
- §5–§7: No database discovery, manifest validation, integrity checks, index building, modification discovery, or system estimation.
- §8: No `InitializationTask` type or weight calculation.
- §9: Cancel navigates via `navigate({ type: "saveList" })` without cooperative cancellation.
- §13–§14: No worker threads, no `AbortSignal`, no safe-boundary cleanup; `beginCareer` blocks the UI.
- §21: The spec's IDLE→DISCOVERING→⋯→LEAGUE_SELECTION state machine is replaced by `CreationStatus` ("idle"→"generating"→"ready"→"committing"→"committed").
- §16: No path-traversal or archive-security validation.
- §17–§18: No ARIA infrastructure, no i18n layer — hardcoded English strings throughout.
- §19–§20: No audio system, no analytics/metrics.
- §24–§28: No persistence of setup state, no 250ms activity indicator, no edge-case recovery, partial acceptance-criteria coverage (6 of 15), no test suite for any of it.

Status flipped to `Reviewed` (from `Not yet audited`). The trim note about internal worker threads surviving into the audit is moot: `beginCareer` has no workers at all — it runs in a single `Effect.gen` block.