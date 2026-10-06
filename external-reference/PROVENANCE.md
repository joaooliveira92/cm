# external-reference

A read-only copy of the renderer from **Bluewave**, a separate naval-strategy project by the
same author. It is kept here as a UI reference: the shadcn/Base UI primitives, glass-card
styling, shell/header composition and screen layouts in this repo were derived from it, and
`.scratch/vendor-quarantine/` holds files copied out of it verbatim.

## It is not part of this project

Nothing in `apps/` or `packages/` imports from this directory, and nothing here is built,
shipped, typechecked, linted or tested. It is excluded from every gate:

| Gate | Where it is excluded |
|---|---|
| lint | `.oxlintrc.json` -> `ignorePatterns` |
| typecheck | each `tsconfig.json` uses an explicit `include`, none of which covers this path |
| effect-lint | `scripts/effect-lint.ts` scans only `packages` and `apps` |
| verify-md-links | `scripts/verify-md-links.ts` -> `IGNORED_DIRS` |
| test | each `vitest.config.ts` includes only its own package's `test/` |
| package | `vite.main.config.ts` / `vite.renderer.config.ts` build from `apps/desktop/src` entries |

## Reading it

Treat every path, ticket reference and instruction inside as belonging to Bluewave, not to this
repo. In particular `renderer/screens/map-prototype/README.md` cites
`.scratch/bluewave-milestone-6/...`, which does not exist here. Copy patterns out of it
deliberately; do not follow its links.

## Removing it

It is roughly 30 MB, most of it PNG ship art, and it is two-thirds of this repo's tracked byte
weight. If the reference is no longer wanted:

```bash
git rm -r external-reference
```

That leaves the content in history (added in commit `fe06f4e`), so it stays recoverable with
`git checkout fe06f4e -- external-reference`. Reclaiming the bytes from `.git` would need a
history rewrite, which is a separate decision.
