# cm-clone Engineering Contract

## Status

Mandatory. This contract binds every code, data, persistence, and architecture change in the
cm-clone repository. It is the standards half of the autonomous workflow; the procedural half is
[IMPLEMENTATION-PROMPT.md](IMPLEMENTATION-PROMPT.md).

Where this contract and [AGENTS.md](../AGENTS.md) overlap, AGENTS.md wins — it is the repo-wide
instruction file that every agent reads, contract or no contract. This file exists to say what
AGENTS.md leaves implicit.

## Canonical authority

- [CONTEXT.md](../CONTEXT.md) is binding for **domain language**. A term defined there means exactly
  what it says there, in code, tests, tickets, and UI copy. Never silently redefine one, never use a
  listed _Avoid_ synonym, and never introduce a competing name for a modeled concept.
- [docs/adr/](../docs/adr/) is binding for **structural decisions**. An ADR is overturned by a new
  ADR, not by an implementation that quietly diverges.
- [README.md](../README.md) orients a reader to the stack and layout. It is descriptive, not binding.

When two plausible readings of the domain produce different game behavior, stop and write a decision
request ([templates/decision-request.md](templates/decision-request.md)) rather than picking one.

## Technology and repository

- pnpm workspaces + TypeScript project references. Strict TypeScript; no `any` escape hatches at
  seams, no `@ts-expect-error` without an adjacent reason.
- [Effect](https://effect.website/) v4 is the domain layer's execution model. See the
  [effect-code](../.agents/skills/effect-code/SKILL.md) skill for the conventions; it is the
  implementer-facing source of truth, and repeat review findings get routed into it per AGENTS.md.
- `@effect/rpc` is the **only** channel between renderer and main process.
- `@effect/sql-sqlite-node` for persistence. Vitest for unit tests, Playwright for desktop e2e.
- Node `>=22.18.0` per [package.json](../package.json). Do not widen the engine range casually.

## Package graph

Dependencies point one way. `packages/shared` (domain logic + game-design data) is the base;
`packages/game-engine` (match simulation) and `packages/contracts` build on it; `apps/desktop`
consumes all three.

- No cycles, no reaching into another package's internal source path — import the package entry.
- `packages/shared` and `packages/game-engine` stay pure: no Node builtins, no filesystem, no SQLite,
  no Electron, no React, no IPC. If a rule needs the outside world, it takes it as an argument.
- Renderer code never imports `packages/game-engine` or a filesystem capability. It talks to main
  through `packages/contracts` and nothing else.
- Do not add a package per entity, and do not add a package speculatively.

## Authority and state

Game state is event-sourced. That is a load-bearing claim, not a description:

- Commands never mutate state directly. A command goes to a **decider** ([ADR-0007](../docs/adr/0007-domain-bounded-deciders-and-chunked-match-resimulation.md)),
  which validates it and returns events; state is the fold of events.
- React state and component state are **never** authoritative. A screen may hold selection, focus,
  and draft input; it may not hold the truth about a squad, a match, or a transfer.
- Distinguish authoritative persisted state (e.g. **Potential Ability**), derived read-time
  projections (**Position Rating**, **Overall Rating**, **Transfer Value** — see
  [ADR-0001](../docs/adr/0001-derived-player-ratings-and-value.md)), and ephemeral UI state. A
  projection is recomputed, never persisted as a cache that can disagree with its inputs.
- CONTEXT.md's rejection of a persisted Current Ability aggregate is a contract, not a preference.
  Do not reintroduce a hidden scalar that must be kept in sync with Attributes.

## Determinism

Identical save state, inputs, and seed must produce identical game outcomes across runs, processes,
and machines.

- Match simulation is seeded ([ADR-0002](../docs/adr/0002-three-phase-match-strength-and-deterministic-seed.md)).
  Chunked resimulation must reproduce the same match from the same seed — resuming a match is
  replaying it, so anything that consumes randomness must be a pure function of (seed, position).
- Player Development is deterministic *without* a seed ([ADR-0011](../docs/adr/0011-deterministic-fractional-player-development.md)).
  Do not introduce randomness into it to make numbers feel better.
- `packages/shared` and `packages/game-engine` must not read `Math.random()`, `Date.now()`, random
  UUID APIs, `process.env`, system locale or timezone, filesystem enumeration order, or mutable
  module-level singleton state. Those enter as explicit arguments from the edge that owns them.
- UI interaction must not consume simulation randomness. Opening a screen twice cannot change a
  result.

## Effect discipline

- Domain and main-process seams are typed `Effect<A, E, R>` with **tagged errors**. A seam that can
  fail says so in its type; it does not throw across a boundary or return `null` to mean failure.
- `Effect.run*` belongs at edges only — the RPC handler, the Electron main entry, a test. Never in
  the middle of domain logic.
- The banned-combinator list lives in [scripts/effect-lint.ts](../scripts/effect-lint.ts) and is
  enforced, not advisory. When a review raises the same Effect finding a third time, route it per
  AGENTS.md — mechanical findings become lint rules, judgement findings become fenced lines in the
  `effect-code` skill. Do not fix it in place a fourth time.
- Every `Effect.all` / `Effect.forEach` declares concurrency explicitly.

## Boundaries: RPC and Electron

- Every renderer↔main call is an `@effect/rpc` procedure declared in `packages/contracts`, with a
  schema on both request and response, covered by the roundtrip tests in
  `packages/contracts/test/`.
- Errors crossing the boundary are typed and intentional. Raw internal errors, stack traces, and
  filesystem paths do not reach the renderer.
- `contextIsolation` on, renderer Node integration off, preload exposes narrow named capabilities —
  never a generic invoke, arbitrary channel, shell access, or broad filesystem handle.
- Restrictive navigation and window-open policy; no remote code loading.

## Persistence

- Saves are SQLite. A schema change ships with its migration, in the same commit.
- Writes that span rows are transactional: a crash mid-save leaves the previous save loadable.
- Load-then-continue must preserve future outcomes — a save reloaded before a match produces the
  same match. Prove it with a test, not by inspection.

## Tests and acceptance

Prefer the smallest test that can actually fail for the right reason. By risk class:

| Risk | Test that proves it |
|---|---|
| Domain rule | Focused unit test in the owning package, incl. boundary and invalid input |
| Derived projection | Property or table test over representative inputs |
| Determinism | Same seed twice → identical result; resimulate a chunked match → identical result |
| Save compatibility | Save → load → continue preserves future outcomes |
| RPC contract | Roundtrip test in `packages/contracts/test/` |
| Reachable UI path | Playwright spec in `apps/desktop/e2e/` |

A green build is not evidence of correctness. Do not skip, loosen, or delete a test to go green; do
not regenerate a fixture without stating the cause.

## Quality gates

`pnpm check:all` is the gate, defined once in [scripts/run-gates.ts](../scripts/run-gates.ts):
typecheck, `oxlint`, `effect-lint`, `verify-md-links`, tests. `pnpm check:ci` is the same set minus
e2e's OS setup. Run the gate — do not hand-run a subset and call it passed.

## Decision records

Two homes, per [docs/agents/notes.md](../docs/agents/notes.md):

- **ADR** ([docs/adr/](../docs/adr/)) — repo-wide, durable, structural. Package boundaries, the
  event model, determinism and seeding, persistence and migrations, the RPC/Electron boundary, a
  major dependency, or an approved deviation from this contract.
- **Agent Note** (`.agents/notes/{lifecycle}/{class}/`) — a decision scoped to one effort: why this
  design, what was given up. `cm-wayfinder` writes it `proposed/`; `cm-implement` promotes it to
  `implemented/` in the commit that ships the code.

If you cannot tell which, ask whether a future contributor would need it *without* the effort's
context. Yes → ADR.

## Documentation

Any Markdown change follows the [doc-standards](../.agents/skills/doc-standards/SKILL.md) skill and
the prose rules in [docs/agents/unslop.md](../docs/agents/unslop.md). Links must resolve —
`verify-md-links` is in the gate.

## Delivery contract

Every completed increment includes:

- implementation plus the tests that prove each acceptance criterion;
- ADRs or Agent Notes where the threshold above is met, and note promotion where code shipped;
- the exact gate commands run and their observed results;
- determinism or save-compatibility evidence where the change touches either;
- known limitations and anything deliberately deferred;
- a changed-file summary;
- small Conventional Commits on a feature branch, clean tree at the end.

Do not self-merge. Do not force-push. Do not weaken a gate to make CI green.
