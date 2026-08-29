# Map: cm-clone → Effect v4, green seam-by-seam

## Destination

The cm-clone monorepo runs on Effect v4 rc: desktop main-process logic declares `Effect<A, E, R>`
with tagged expected errors (no bare throws in program logic), every entry point runs its program at
the edge, `run*` appears only at process/IPC edges, and the pure engine/shared packages and the
React renderer sit behind an agreed, written interop convention that a later `/cm-to-spec` +
`/cm-to-tickets` handoff can execute.

## Notes

- Pinned land: `effect@4.0.0-rc.112` (pnpm catalog, rc.112 for `@effect/platform-node`,
  `@effect/sql-sqlite-node`, `@effect/vitest`), TypeScript 7.0.2, `tsconfig.json` has
  `"strict": true` and the `@effect/tsgo` toolchain. The knowledge base notes
  (`.agents/notes/effect-v4-getting-started.md`) track the rc API; they agree with the pinned
  version, but flag drift when a ticket hits code that disagrees.
- Each session loads the `effect-code` skill; charting reviews stop at tickets, they never edit code.
- Green gate every slice: `pnpm -r typecheck` (tsc --noEmit, strict) + `pnpm -r test`.
- Standing rules: one ticket per session; never widen a slice's blast radius; a conversion is green
  when its interop boundaries are explicit `Effect.tryPromise`/`Effect.runPromise` lifts or runs.
- A resolved ticket whose answer asserts a decision writes an Agent Note atomically with its
  resolution, per the `/cm-wayfinder` resolution step.

## Decisions so far

<!-- the index: one line per closed ticket, then zoom the link for the detail the ticket holds -->

- [01: Pure packages posture](issues/01-pure-packages-posture.md): keep engine/shared pure, lift with
  `Effect.sync`/`Effect.try` at the desktop boundary; interior throws are defects, not remapped;
  drop the unused `effect` dep from game-engine. ([Agent Note](../../.agents/notes/proposed/architecture/2026-08-28-pure-packages-posture.md))
- [02: Desktop domain throws → tagged Effect failures](issues/02-desktop-throws-to-tagged-errors.md):
  three bare throws in desktop main-process logic (`FixtureGenerationError`,
  `FullTimeWhistleMissingError`, `SquadTooSmallError`) now fail through the Effect typed channel
  as local `Data.TaggedError` classes, not added to contracts RPC schema.
- [03: Engine boundary lift convention](issues/03-engine-boundary-lift-convention.md):
  throw-capable engine calls lift via `Effect.sync` (throw → defect, never a tagged failure) at the
  two `simulateMatch*` call sites in `season.ts`/`match.ts`; total engine/shared calls stay plain;
  `RandomSource` stays a param. ([Agent Note](../../.agents/notes/proposed/architecture/2026-08-28-engine-boundary-lift-convention.md))
- [04: run* audit — edge-only](issues/04-runstar-audit.md): confirmed `Effect.runPromise` only at
  `rpcServer.ts` (IPC edge) and `e2e/seedSaves.ts` (script edge); no `runSync`, no mid-program
  `run*`, renderer/preload clean.
- [05: Renderer boundary posture](issues/05-renderer-boundary-posture.md): keep promise-based IPC
  seam; no Effect runtime in the renderer; the typed-error loss is a preload bridge bug, not a
  renderer-convention problem. ([Agent Note](../../.agents/notes/proposed/architecture/2026-08-28-renderer-boundary-posture.md))
- [06: Preload bridge typed-error preservation](issues/06-preload-typed-error-preservation.md):
  preload now returns `Promise<RpcResult<M>>` (no throw); all 16 renderer call sites discriminate
  `result._tag` instead of catching a stringified error; typed error schemas preserved end-to-end.

## Not yet specified

- **Main-process persistence layer.** `apps/desktop/src/main/saves.ts` and the `@effect/sql-sqlite-node` /
  `@effect/platform-node` usage look already-Effect; whether they need consistency tickets only
  becomes visible once the frontier reaches them.
- **The remaining async/await files.** 10 files in `apps/desktop` still use `async`/`await` across
  main, preload, and edge adapters. Which ones are genuine seams (un-lifted IO adapters) vs already-
  satisfied boundary code lands once tickets 03 and 05 pin the lift conventions.
- **Renderer state shape.** Renderer screens keep the promise-based IPC seam exactly as-is (per
  ticket 05). Any future refactoring (React hooks, data-loading lib) is out of this effort's scope.

## Out of scope

- **`reference-project/`** — a separate upstream mirror (147 files, heavy `async`/`throw`), not part
  of the cm-clone app. Out of this effort, never graduates.
- **`packages/contracts` residuals** — `rpc.ts` and `schemas.ts` are already on `Effect.Schema`; the
  non-Effect files are a re-export barrel (`index.ts`) and a vitest config. No seam.
- **Test-helper throws** ("no clean seed found", "no injury found in sweep") — idiomatic in tests,
  not program logic.
- **`scripts/run-gates.ts` top-level throw** — CLI argument validation at the process edge.