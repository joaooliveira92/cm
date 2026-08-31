# 16 — Screen 6: Game Loading and World Generation

Type: task
Status: open
Blocked by: 03

## Question

Screen 6 (`06_game_loading_and_world_generation.md`, 40 sections, 1,725 lines) describes a loading screen with progress, generation status, and retry/cancel affordances. The implementation is thin: generation is a **masked wait** running underneath the manager step (step 1), per the new-game-flow sequence note. The renderer shows "Generating the world…" as an indeterminate label (`createFlow.tsx:91-92`), and the backend lives in `main/saves.ts` (`beginCareer`), `main/worldGeneration.ts`, and `main/schema.ts`.

No progress bar, no honest-progress count, no Cancel/Retry-on-failure UI (failures route to the session `error` string). "Loading" on the career side is just a click that navigates to Squad — no loading screen at all.

The blanket-trim rows (ticket 03) are in the ledger. This ticket performs the `Reviewed` pass: read the implementation, write ledger rows for every section the implementation does not follow. No `unscheduled` rows.

Note: §18 (worker and memory-budget performance requirements) and §19 (resource-pressure behaviour) were already trimmed by ticket 03 but the ledger carries them as `out-of-scope`. This audit confirms the disposition.

## Done when

Screen 6 has a `Reviewed` status in `RECONCILIATION.md` with rows for every section the implementation does not follow, and no `unscheduled` rows remain.