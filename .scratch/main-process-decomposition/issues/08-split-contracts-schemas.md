# 08: Split `packages/contracts/src/schemas.ts` (1099 lines)

Type: task
Status: resolved

**What to build:** the second-largest source file in the repo, and unlike `main/db/schema.ts` it
has no whole-file invariant forcing it to stay whole. It is already sectioned by banner comments
along clean domain seams: branded ids, saves, clubs, manager profile, club selection, squad,
tactics, season/fixtures/table, board objectives, match, transfers, scouting, news.

Every screen in the app imports from here, so this file is on the hot path of nearly every agent
task -- 1099 lines of unrelated domains get pulled into context to read one view type.

Split into `packages/contracts/src/schemas/<domain>.ts` with `schemas/index.ts` re-exporting the
exact previous surface. Branded ids (`ClubId`, `PlayerId`, ...) go in `schemas/ids.ts`, which the
rest import from.

**Blocked by:** None. Confined to `packages/contracts/`.

- [ ] `packages/contracts/src/index.ts` exports the identical symbol set as before -- diff the
      exported names, do not eyeball it.
- [ ] No file outside `packages/contracts/` changed. The barrel is what makes this true.
- [ ] `packages/contracts/test/roundtrip.test.ts` passes.
- [ ] `pnpm check:all` is green at this commit.

## Answer

Landed in `07ee010` as fifteen files under `packages/contracts/src/schemas/` plus a barrel.
134 exported symbols, diff-clean against the original.

One thing the ticket did not anticipate: three files inside the package
(`src/index.ts`, `src/rpc.ts`, `test/roundtrip.test.ts`) still had to have their
`"./schemas.js"` specifier repointed to `"./schemas/index.js"`. The repo is
`moduleResolution: nodenext`, which does not resolve a directory to its index. The
"no importer changes" property held only outside the package -- worth knowing for tickets
09 and 10, which use the same barrel pattern.
