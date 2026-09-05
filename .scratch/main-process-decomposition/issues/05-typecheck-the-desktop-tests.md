# 05: Bring `apps/desktop/test/` into the typecheck scope

**What to build:** `apps/desktop/tsconfig.json` currently has `"include": ["src", "vite.*.config.ts"]`.
The ~100 files in `test/` and the specs in `e2e/` are therefore never typechecked, while
`pnpm -r typecheck` reports "Done". The three `packages/*` tsconfigs do not have this gap.

This is a real hole in the gate, not a cosmetic one. During the 2026-09-05 audit, moving
`nextCalendarBoundary` out of `main/season.ts` broke its import in `test/season.test.ts` and a full
green typecheck said nothing; only a ~15-minute vitest run surfaced it. Every ticket in this effort
is a file move, which is exactly the class of change this gap hides.

Expect adding `test` to the `include` to surface a backlog of pre-existing type errors on the first
run. Triage them in this ticket rather than suppressing them -- if the count is large, land the
config change behind a fixed allowlist and burn it down, but do not leave the gap open.

## Findings from a 2026-09-05 spike (read before starting)

The naive fix was attempted and reverted. Widening `include` to `["src", "test", "e2e", ...]`
surfaces **281 pre-existing errors across 33 files**. The other ~77 spec files are already clean.

Concentration -- the top five are 40% of the total:

| File | Errors |
|---|---|
| `test/development.test.ts` | 35 |
| `test/transfers.test.ts` | 22 |
| `test/season.test.ts` | 18 |
| `test/world-determinism.test.ts` | 17 |
| `test/incoming-bids.test.ts` | 16 |

Almost all of them are three repeating shapes, so this is far less work than 281 suggests:

1. `Effect<..., ..., SqlClient>` passed where `Effect<..., ..., never>` is expected -- an
   `it.effect` block that never provides `SqlClient`. By far the most common.
2. A bare `string` passed where a branded id (`ClubId`, `BidId`, `PlayerId`) is expected.
3. `unknown` not narrowed, mostly in `world-determinism.test.ts`'s row helpers.

**The exclusion-list approach does not work cleanly.** Adding the 29 dirty files to `exclude` drops
the count to ~13, but it also makes `test/aiClubs.test.ts` -- previously clean -- start failing with
the same `SqlClient` context errors. `exclude` only prunes the initial file set; which files are in
the program still changes how the Effect service context resolves in the ones that remain. A
partial landing is therefore not a stable ratchet, and chasing it is a rabbit hole.

**Recommended approach:** fix the three error shapes across all 33 files in one pass, then widen
`include` with no `exclude` at all. Shape 1 is likely a single shared test helper that provides
`SqlClient` to `it.effect`; fixing that helper may clear most of the 281 on its own. Start there
and re-measure before touching anything by hand.

Note the nine `src/` diagnostics that also appear are `suggestion`-level Effect language-service
hints, tolerated by `ignoreEffectSuggestionsInTscExitCode: true` in the root `tsconfig.json`. They
do not fail the gate and are not part of this ticket.

**Blocked by:** None (independent of 01-04, and most useful before them).

**Status:** ready-for-agent

- [ ] `apps/desktop/tsconfig.json` covers `test/` (and `e2e/`, or a stated reason why not).
- [ ] `pnpm -r typecheck` is green with the wider scope, with any pre-existing errors fixed rather
      than ignored.
- [ ] `AGENTS.md`'s gate table still describes what the gates actually check.
- [ ] `pnpm check:all` is green at this commit.
