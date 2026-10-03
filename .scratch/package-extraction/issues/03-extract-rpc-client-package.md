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
