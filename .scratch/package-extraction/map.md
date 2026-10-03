# Map: Package extraction

Label: `wayfinder:map`

## Destination

Move the code that is genuinely a library out of `apps/desktop/src` into `packages/*`, in the repo's
stated order of preference: fill the existing pure packages first, add a package only where a real
seam exists, and never break the documented package posture or the pinned paths.

## Notes

The starting survey (2026-10-03) found five candidates. Two of them collide with mandatory rules in
`apps/desktop/AGENTS.md`, so they are **not** straight moves:

- **Candidate: `@cm-clone/db`.** `apps/desktop/AGENTS.md` says "`db/schema.ts` must not move or be
  split" — `drizzle.config.ts` pins its exact path and its docstring asserts whole-schema invariants.
  A `db` package would move that file, force `pnpm db:generate`, and break the effect-lint allowlist
  keyed on `db/schema.ts`. **Blocked pending an explicit decision to override that rule.**
- **Candidate: `@cm-clone/ui`.** `apps/desktop/AGENTS.md` says "`components/ui/` is vendored
  shadcn/Base UI, customized in place. Do not reorganize." Extraction also introduces a React package,
  which `packages/AGENTS.md` does not currently admit (packages are pure libraries). **Blocked pending
  an explicit posture decision.**
- **Candidate: fill `@cm-clone/game-engine`.** Directly supported by `packages/AGENTS.md` ("pure,
  DB-free logic belongs in `game-engine` or `shared`") and the engine-boundary-lift convention. No new
  package. **Proceed.**
- **Candidate: `@cm-clone/content`.** Splits data from math inside `shared`; keeps both pure. No app
  coupling. **Proceed.**
- **Candidate: `@cm-clone/rpc-client`.** A renderer-only package. Introduces a package that no main
  process imports, which is a smaller posture change than `ui` but still one. **Proceed with a note.**

## Decisions so far

- [01 — Lift pure match projections](issues/01-lift-match-projections-into-game-engine.md): resolved 2026-10-03. `stream`, `pitch`, `substitutions` and `StreamEvent` moved into `packages/game-engine`; the mock seam in `committed-timeline.test.ts` retargeted to `deriveMatchEvents`.
- [02 — Extract content package](issues/02-extract-content-package.md): resolved 2026-10-03. `@cm-clone/content` owns the catalogue (content/*, `order.ts`, `leagueSetup.ts`); `shared` depends on it and re-exports it. The planned `leagueSetup.ts` type/logic split was dropped — the whole file moved.
- [03 — Extract rpc-client package](issues/03-extract-rpc-client-package.md): _open_.
- [04 — DB package](issues/04-extract-db-package.md): **blocked** by the `db/schema.ts` rule.
- [05 — UI package](issues/05-extract-ui-package.md): **blocked** by the `components/ui` rule and the pure-packages posture.

## Not yet specified

- Whether `@cm-clone/content` should be depended on by `shared` (inverting the current layering) or
  sit beside it, with `shared` re-exporting for compatibility. Ticket 02 decides.
- Whether a renderer-only package is admissible under `packages/AGENTS.md`; ticket 03 carries a
  proposed Agent Note for it.
- Whether to override the pinned-schema rule for `@cm-clone/db`, which is a prerequisite for ticket 04.

## Out of scope

- Moving `apps/desktop/src/main/index.ts` (pinned by `vite.main.config.ts`).
- Reorganising or reformatting `components/ui/` in place.
- Any behaviour change to the game.
