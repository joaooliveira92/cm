# 06: A per-file environment pragma silently overrides the projects split

Filed from [04](04-vitest-projects-split.md)'s review, 2026-09-18. Ticket 04 moved the
renderer/main environment split into `apps/desktop/vitest.config.ts` and deleted all 105 per-file
`@vitest-environment` pragmas. Nothing stops the 106th.

## The trap

Vitest scans a test file's **leading comment block** for the environment pragma. It matches the
string wherever it appears there — including inside prose that is explaining the pragma rather than
applying it.

This is not hypothetical. Ticket 04's own regression guard was written with the pragma quoted in its
docblock to explain why the file deliberately had none. Vitest matched the quoted text and applied
jsdom regardless of config, so the guard passed under a forced `environment: "node"` — it had
silently stopped guarding. It was caught only because a forced-node run went green when it was
expected to go red.

So the failure mode is worse than a stray pragma: a *comment about* the pragma re-enables it, and the
symptom is a test that quietly no longer tests what it claims.

## What to do

Add a rule to `scripts/effect-lint.ts` forbidding the literal `@vitest-environment` anywhere under
`apps/*/test/**`, with a message naming the config as the place the split lives.

- Non-AST, like the existing 600-line ceiling, which that script already documents as its one
  non-AST check. The pragma is a comment, so an AST rule would have to read comment trivia anyway.
- `findSourceFiles` already walks every `.ts`/`.tsx` under `apps` and `packages`, tests included, so
  the rule needs no new traversal.
- `sourceDirs` is `["packages", "apps"]`, which excludes `scripts/`, so the rule's own string
  literal cannot self-trip. Confirm that still holds when writing it.
- Both guard files (`test/renderer/test-environment.test.ts`, `test/main/test-environment.test.ts`)
  carry a warning comment that deliberately does **not** spell the pragma out. The rule replaces
  those comments as the actual enforcement; leave the comments in place as the explanation.

Per [AGENTS.md](../../../AGENTS.md) § Routing repeat review findings, this is the mechanical and
grep-detectable half, so it belongs in the linter rather than in review attention or a skill.

## Also in scope: one idiom for the jsdom path rewrite, not two

Under the jsdom environment, Vite's `assetImportMetaUrl` transform rewrites the static
`new URL("<literal>", import.meta.url)` pattern into an `http://localhost/@fs/...` asset URL, which
`fileURLToPath` then rejects. Ticket 04 hit this in `test/renderer/rpc/seam.test.ts` when that file
flipped from node to jsdom, and resolved it with `join(import.meta.dirname, ...)`.

`test/renderer/chrome/career-harness.tsx:30-35` already knew about this and resolves via
`process.cwd()` instead. Two things to fix there:

- Its comment says jsdom rewrites `import.meta.url`. Imprecise: `import.meta.url` is fine, the
  `new URL(...)` *pattern* is what gets transformed. The imprecise version sends the next reader
  looking in the wrong place.
- `process.cwd()` is correct only while vitest's cwd is the desktop package root.
  `import.meta.dirname` is not, so align it and leave one precedent instead of two.

Acceptance:
- [ ] `scripts/effect-lint.ts` fails on a test file containing `@vitest-environment` under `apps/*/test/**`
- [ ] The rule has a self-test or a demonstrated red run — a lint rule that never fired is not known to work
- [ ] `career-harness.tsx` resolves via `import.meta.dirname`, comment corrected
- [ ] `pnpm check:all` green

**Status:** ready-for-agent
