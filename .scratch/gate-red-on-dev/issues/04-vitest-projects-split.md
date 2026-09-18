# 04: The vitest config documents the wrong default — 104 files spell the split out by hand

Filed from ticket 02's findings, 2026-09-18. Not a gate fix: the gate is green on this axis. This is
the durable fix for the *class* of failure ticket 02 cleaned up.

## The observation

`apps/desktop/vitest.config.ts` declares no `environment`, so the default is `node`, and renderer
tests opt into jsdom with a per-file `// @vitest-environment jsdom` pragma. Counted:

- **104 of 144** renderer test files carry the pragma (105 occurrences in total; the extra one sits
  in the non-test helper `test/renderer/chrome/career-harness.tsx`, where it was always inert)
- **0 of 63** main-process test files do

So the renderer/main environment split already exists in practice. It is simply written out by hand
104 times, and silently absent on the 105th. That absence is undetectable until a renderer helper
happens to reach for `window` or `document` — which is exactly how ticket 02 was born, when §10.1
scroll preservation made `navigate()` touch `window.history` and five existing tests started failing
without having changed.

Scroll preservation will not be the last thing to reach for the DOM.

## What to do

Declare `projects` in `apps/desktop/vitest.config.ts` — `test/renderer/**` → `jsdom`,
`test/main/**` → `node` — and strip the now-redundant pragmas.

## Why this is its own ticket and not part of ticket 02

It flips 40 renderer files from node to jsdom in one move. At least one of them,
`test/renderer/level1-a11y.test.tsx`, carries three failures that ticket 03 is diagnosing and is
plausibly environment-sensitive. Riding this along on a red-gate repair would mean a new failure could
not be attributed cleanly to either change. It wants its own full-suite run against a known-green
baseline.

**Sequence it after [03](03-assertion-failures.md)**, so the baseline it moves against has no
outstanding assertion failures to confuse the diff.

Acceptance:
- [x] `vitest.config.ts` declares the two projects; renderer defaults to jsdom, main to node
- [x] Redundant per-file pragmas removed
- [x] A renderer test file added with no pragma gets a DOM — proved by a test, not by inspection
- [x] Full desktop suite run before and after, with the set-diff of failing files stated; no file that
      passed before fails after

**Blocked by:** [03 — assertion failures](03-assertion-failures.md)

**Status:** resolved
