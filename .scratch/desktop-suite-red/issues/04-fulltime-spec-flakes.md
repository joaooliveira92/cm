# 04: `screen-fulltime.test.tsx` fails about one run in three, without load

Type: bug
Status: ready-for-agent

**Blocked by:** none.

## Symptom

`apps/desktop/test/renderer/match/screen-fulltime.test.tsx > MatchDayScreen at full time … >
keeps the scoreboard, the Full time status, the revealed feed and the final score row` fails with:

```
TestingLibraryElementError: Unable to find an element with the text: /Final score: Home FC 2 - 1 Away FC/.
```

Observed 2026-09-10 at `8f95c8f` with no diff applied, running the file alone from `apps/desktop`
(`npx vitest run test/renderer/match/screen-fulltime.test.tsx`): passed, passed, failed. It also
failed once inside a full `pnpm check:all` and once more running alone. Each failure took about
1s, so this is not the load-sensitive timeout from
[ticket 01](01-select-primitive-breaks-filter-tests.md). It fails on a fast, quiet run too.
Three earlier full suites passed it that day, which is why a single green run proves nothing.

## Hypothesis (unverified)

The spec awaits `findByText("Full time")` and then asserts the final-score row synchronously with
`getByText`. That row renders from `MatchDayScreen.tsx:42` after the `isComplete → MatchComplete`
swap. If "Full time" can appear a render before that row commits, the synchronous assertion races
the swap. Confirm the order before choosing a fix. If the row is meant to appear in the same commit
as "Full time", the bug is in the screen, not the spec.

## Acceptance criteria

- [ ] The cause is named with evidence, e.g. a reproduction that fails every time.
- [ ] The fix holds over at least 20 isolated runs of the file, each asserting the same row. Do not
      loosen the assertion or raise `testTimeout`.
- [ ] `pnpm check:all` passes.
