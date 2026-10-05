# 04: `react/todo` — resolve the compiler Todo-diagnostic sites

Type: task
Status: resolved

## Bucket

`react/todo` — 19 findings, `warn` in `.oxlintrc.json`.

## What it flags

Constructs the React Compiler accepts but only partially understands — the compiler emits a
"Todo" diagnostic for them, meaning they are in the port's unfinished-todo space rather than
memorized correctly. The oxc port centralises these as `Todo` diagnostics (57 constructors in
the vendored `oxc_react_compiler`).

## Exit criteria

- [x] `react/todo` graduates from `warn` to `error` in `.oxlintrc.json`, **or** the sites are
  confirmed as compiler-side TODOs we accept and the rule is documented as `warn` with that
  reasoning.

## Answer

The measured baseline was **14 findings**, not the 19 the ticket recorded (tickets 01–03 cleared
the rest as collateral). All are resolved or exempted, and `"react/todo"` is now `error`;
`pnpm exec oxlint --disable-nested-config .` reports **zero** `react(todo)`.

### Family 1 — `try/catch/finally` (8 sites), finalizer unsupported

Each `finally` moved to an explicit cleanup after the `try/catch`, with the control-flow edges
preserved:

- **No early exit** — `RenewContractPanel`, `useLiveMatchCommands`, `ScoutingAssignmentScreen`,
  `ScoutPlayerDialog`, `AssignScoutPanel`, `SaveGameAction`: the cleanup (`setPending(false)` /
  `setPending(null)` / `inFlight.current = false`) now runs unconditionally after the catch, which
  is exactly what the finalizer did.
- **Both branches return** — `useCommentaryCommands`: the status is assigned to a local in the
  `try`/`catch`, cleanup runs, then the local is returned. `resolveCommandStatus` throwing is still
  caught by the same `catch` (as before), not propagated.
- **Failure branch returns early** — `streaming.ts`: the failure case goes through an `else`
  instead of an early `return`, so `stream.endFetch()` always runs. The original `return` only
  skipped the recursive quick-poll tail, and a failed read has already called `stream.endStream()`
  (which sets `streamEnded()` true), so that tail is dead either way. New test
  `test/renderer/match/streaming-failure.test.tsx` proves a failed read reports and does not read
  again.

### Family 2 — `try/finally` without `catch` (3 sites), construct unsupported

The finalizer became a `catch` that cleans up and rethrows, plus the same cleanup on the success
path — exactly the `try/finally` semantics:

- `CommentaryScreen.load` — `fetchingRef`/`loading` reset on success, on a `Result` failure, and on
  a thrown defect (rethrow).
- `useMatchControl.runSubmission` — `inFlightRef` reset before the early `return` and in the
  rethrow catch.
- `useTacticDraft.autosave` — `autosaving` reset after the serial drain and in the rethrow catch.

### Family 3 — logical assignment `??=` (2 sites)

- `DiscardCareerDialog.tsx`: `openerRef.current ??= document.activeElement` became
  `if (openerRef.current === null) openerRef.current = document.activeElement`. The ref type is
  `Element | null`, so the null test is the whole of `??=`.
- `components/reui/event-calendar/event-calendar-time-grid.tsx`: **vendored**, left whole for
  upstream re-sync (see below).

### Family 4 — MemberExpression cannot be reordered (1 site)

- `useTacticDraft.save`: the default parameter `tactic: Tactic = tacticRef.current` read a member
  expression at call time. It is now an optional parameter with `const target = tactic ?? tacticRef.current`
  as the first body statement. No caller passes `null`, so `??` is the default's `undefined` check;
  callers `save()` (no arg) and `save(next)` are unchanged.

### Vendored policy and ticket 07

`components/reui/event-calendar/event-calendar-time-grid.tsx:461` carries the only remaining
compiler-visible `??=` (a second, in `event-calendar-lib.tsx:416`, sits inside a plain helper the
compiler does not analyse, so it emits no `react(todo)`). The repo keeps `components/reui/**` whole
so re-syncs are not hand merges
(`scripts/effect-lint.ts` `FILE_LENGTH_EXEMPTIONS`), so it is exempted rather than edited:

```json
{
  "files": ["apps/desktop/src/renderer/components/reui/**"],
  "rules": { "react/todo": "off" }
}
```

Ticket 07 owns the vendored `rule-suppression` sites and the `-next-line` suppressions deferred by
ticket 03; the config comment tells it to extend this same block. Scoping the override to
`components/reui/**` (rather than the one file) is deliberate: a future re-sync cannot reintroduce a
`react(todo)` failure. The alternative exit (leave the rule at `warn`) was rejected because only one
finding was vendored and the block is the established vendor-policy shape.

### Tests

The restructures are equivalence-preserving and the existing suites cover the primary paths
(`commentary-commands.test.tsx` already asserts `endCommand` fires on both remote failure and
transport throw; `live-command-screens.test.tsx` asserts a transport throw becomes a rejected
status; `match-day-bar.test.tsx` and `save-conflict.test.tsx` cover the tactic save paths). One gap
was added: `test/renderer/match/streaming-failure.test.tsx` proves the failed-poll path reports the
error, issues exactly one read, and does not read again. Adding it to `streaming-integration.test.tsx`
pushed that spec past the 600-line ceiling, so it is its own focused file per `apps/desktop/AGENTS.md`.

## Evidence

| Criterion | Command | Result |
|---|---|---|
| Rule graduates to `error` | `.oxlintrc.json` | `"react/todo": "error"` |
| Zero `react(todo)` | `pnpm exec oxlint --disable-nested-config . 2>&1 \| grep -c "react(todo)"` | baseline 14 → 0 |
| Behaviour unchanged | `pnpm check:all` | green — typecheck, lint, effect-lint, verify-md-links, verify-db-schema, test (336 files / 2825 passed / 5 skipped) |
| Reachable-UI path | `pnpm --filter @cm-clone/desktop test:e2e` | 22 failed / 76 passed — the pre-existing `.scratch/desktop-suite-red/` set, unchanged |

Determinism and save compatibility: not applicable — no simulation, seeding, persistence or schema
touched (the changes are renderer handler control flow and one lint config).
