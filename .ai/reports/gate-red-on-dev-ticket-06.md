# gate-red-on-dev ticket 06 — the environment pragma rule

**Outcome:** resolved. gate-red-on-dev is now complete — all six tickets.

## What it was for

Ticket 04 moved the renderer/main environment split into `apps/desktop/vitest.config.ts` and deleted
all 105 per-file `@vitest-environment` pragmas. Nothing stopped the 106th.

The trap is sharper than a stray pragma. Vitest scans a test file's leading comment block for the
string and matches it wherever it appears there — including inside prose explaining why the file
deliberately has none. Ticket 04's own regression guard was written that way: vitest matched the
quoted text, applied jsdom regardless of config, and the guard silently stopped guarding. It was
caught only because a forced-node run went green when it was expected to go red.

## Changes

- **`lintVitestEnvironmentPragma` in `scripts/effect-lint.ts`**, rule `vitest-environment-pragma`.
  Non-AST, like the 600-line ceiling: the pragma is comment trivia, so an AST rule would read the
  same raw text anyway. Scope is `apps/*/test/**` by path predicate.
- **`apps/desktop/test/shared/vitest-environment-pragma-lint.test.ts`** — 8 cases.
- **`apps/desktop/test/renderer/chrome/career-harness.tsx`** resolves via `import.meta.dirname`,
  matching `test/renderer/rpc/seam.test.ts`, with its comment corrected.
- **`AGENTS.md`** effect-lint row updated; it enumerates the rules and must stay in step.

## Two decisions

**It fires on a mention, not only on a use.** A rule that told the two apart would have let the
original bug through, since the original bug *was* a mention. There is likewise no "leading comment
block" test: vitest's matching is loose enough that asking the next author to decide whether their
comment counts as leading is asking them to re-derive the bug. The message says all of this, so the
rule explains itself at the point it fires.

**Every occurrence is reported**, not just the first, so one pass fixes the whole file.

The ticket asked to confirm the rule cannot self-trip. `sourceDirs` is `["packages", "apps"]` and
excludes `scripts/`, so the script's own text is outside the linted set — confirmed, and written at
the rule site so it is re-checked if `sourceDirs` ever changes. The **spec** is inside the policed
tree, so it assembles the literal from two halves, as the rule does.

## Validation

- **Self-test**: 8 cases — applies it, merely mentions it, two occurrences on separate lines, the
  message names the config, and three silence cases (`src/`, `packages/*/test/`, a clean file) so the
  rule cannot pass by always firing. All green.
- **Demonstrated red run**: pragma temporarily added to `test/main/season/retention.test.ts`;
  `effect-lint` reported `retention.test.ts:2 vitest-environment-pragma` and exited 1. Removed:
  `no violations found (877 files)`.
- `continue-control.test.tsx`, the only consumer of the changed harness path, green (16 tests).
- `pnpm check:all` green.
