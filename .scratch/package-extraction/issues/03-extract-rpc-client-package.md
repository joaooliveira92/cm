# 03 — Extract `@cm-clone/rpc-client` from `renderer/rpc`

Type: task
Status: ready-for-agent

**What to build:** Move the renderer's typed data-access layer (`apps/desktop/src/renderer/rpc/*`,
already hidden behind the `renderer/rpc.ts` barrel) into a package, `@cm-clone/rpc-client`: the
`call` seam that decodes both wire branches, the typed errors, `readState`, the key factories, the
read policy and the domain atom modules.

**Why:** It is a self-contained layer over the `AppRpcs` contract with no screen knowledge. A package
makes the seam explicit and reusable by a future second renderer. The barrel at `renderer/rpc.ts`
already proves the cut is clean.

**Posture caveat:** this is the first package no `main` process imports, and the first that needs the
DOM (`window.cmClone`). `packages/AGENTS.md` currently describes packages as pure libraries imported
by both processes. This ticket carries a proposed Agent Note recording that a browser-side package is
admitted, with its dependency rule (contracts + `effect` + `@effect/atom-react`, and the
`window.cmClone` global typed via `window.d.ts`).

**Constraint found while triaging (2026-10-03):** larger than it reads, and worth confirming the
value before starting:

- **84 test files** import `src/renderer/rpc/<module>.js` by path, and ~96 renderer files import the
  `renderer/rpc.ts` barrel. Keeping the barrel as a thin re-export covers the screens, but the 84
  direct test imports must be repointed (or the old `rpc/` kept as shims, which defeats the move).
- **A back-edge:** `rpc/playerComparisonQueries.ts` imports `playerComparisonKey` from
  `renderer/navigation/params.ts`. A package cannot import the app, so that helper must move (to
  `@cm-clone/contracts`, the natural shared home for a canonical id/slug) with its `navigation`
  caller updated.
- **The DOM global:** only `rpc/call.ts` reads `window.cmClone`; its type lives in
  `renderer/window.d.ts`. The package needs the bridge type, so define it once (contracts or the
  package) and have `window.d.ts` reference it.
- **The lint seam:** `scripts/effect-lint.ts` keys the renderer RPC boundary on file path
  (`isBoundaryEnforced`, exempting `/rpc.` and `/rpc/`). Once the files leave the renderer they are
  no longer scanned, which is fine, but the message text and
  `apps/desktop/test/shared/renderer-boundary-lint.test.ts` refer to the seam and should be checked.
  Given the move's modest value and this churn, decide deliberately before starting.

## Acceptance criteria

- [ ] `packages/rpc-client` exists with a row in `packages/README.md`, and `renderer/rpc.ts` becomes a
      thin re-export or is deleted with screens importing the package.
- [ ] `apps/desktop/src/renderer/rpc/` no longer holds the moved modules.
- [ ] The effect-lint renderer boundary (screens reach RPC only through the seam) still applies;
      `test/renderer-boundary-lint.test.ts` passes with its asserted paths updated if needed.
- [ ] An Agent Note records the browser-side package posture as proposed.
- [ ] `pnpm -r typecheck`, `pnpm run effect-lint`, and `pnpm -r test` are green.

**Blocked by:** None.

## Answer

_(filled in on resolution)_
