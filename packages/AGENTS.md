# AGENTS.md — packages

These package rules supplement the repo-wide [conventions](../AGENTS.md). They apply to
`packages/*`; `apps/desktop` follows the same stack but is the Electron shell (see
[docs/development.md](../docs/development.md)).

## Roles

- [contracts/](contracts/) — the `@effect/rpc`-shaped `AppRpcs` contract and every
  `Schema.Class` payload/view/error shared between renderer and main process. The wire shape's
  single source of truth: when a wire field changes, this package changes in the same commit as the
  callers.
- [game-engine/](game-engine/) — pure, DB-agnostic decider/projector/match-sim logic. No Electron,
  no SQLite. Unit-testable in isolation.
- [shared/](shared/) — game-design constants and pure functions with **no Effect/Node dependency**:
  Position/Role taxonomy, Attribute weights, ratings math, world generation. Imported directly by
  both the main process and the renderer.

Keep business logic in `game-engine` and `shared` wherever it can live there, so it stays
unit-testable without Electron; `apps/desktop/src/main` is the wiring layer (SQLite + RPC channel),
not a logic home. If a derivation is shared, it belongs in `shared`, not duplicated beside a reflex
chart — one home per meaning.

## Effect v4

Code uses Effect v4 (release-candidate). Follow the conventions in
[effect-code](../.agents/skills/effect-code/SKILL.md); use
[effect-v4-migration](../.agents/skills/effect-v4-migration/SKILL.md) when incrementally migrating.
`pnpm run effect-lint` enforces the anti-patterns (no `Effect.ignore`, no `Effect.asVoid`, no
`Effect.catchAllCause`, no `Effect.serviceOption`, no `disableValidation`, no void expressions, no
nested `Layer.provide`). Schema contracts live in `contracts`, not inline in handler code.

## Domain vocabulary

Name domain concepts with the vocabulary in [CONTEXT.md](../CONTEXT.md), never drifted synonyms;
flag rather than override an [ADR](../docs/adr/) when they contradict. See
[docs/agents/domain.md](../docs/agents/domain.md) for how to consume the domain docs before
exploring.

## Tests

Each package runs `vitest` (`@effect/vitest` for Effect-based tests) via `pnpm -r test`. Test what
you changed: a `shared` change rarely needs the e2e suite; a wire-shape change in `contracts` needs
its round-trip test updated in the same commit; a renderer or main-process change usually needs
[docs/e2e.md](../docs/e2e.md) coverage.

## Gates

Run `pnpm run check:all` (typecheck, lint, effect-lint, verify-md-links, test) after every task,
and `git diff --check` for whitespace. A package change that alters a promise, a convention, or a
durable rationale earns an Agent Note per [docs/agents/notes.md](../docs/agents/notes.md) —
proposed first, promoted to `implemented/` in the same commit that ships it.