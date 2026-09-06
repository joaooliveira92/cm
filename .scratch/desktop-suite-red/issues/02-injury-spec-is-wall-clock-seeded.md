# 02: `matchCommands.test.ts` retries against a wall-clock seed and flakes

Type: bug
Status: resolved

**Symptom:** `test/matchCommands.test.ts > an Injury event's chunk lists the injured club in
injuredClubIds` fails intermittently with
`no Injury event occurred in 40 attempts — investigate INJURY_PROBABILITY`. Observed 2026-09-05
across three consecutive runs of unchanged code: 2 failures, then 1, then 0.

**Cause:** `startMatch` seeds each match from `Date.now()` and exposes no test hook to pin it — the
file says so in its own header comment. The spec compensates by starting up to 40 fresh matches and
asserting that at least one produced an Injury, a ~0.4% per-slice roll. That is a probabilistic
assertion with no seed, so it has a real failure rate rather than a deterministic outcome. Two
sibling helpers in the same file have the same shape and throw
`could not find an Injury-free match seed after 25 attempts`.

This is not new and is not caused by a refactor. It is the same trial-and-error pattern that
[2026-08-28-match-day-structural-extension.md](../../../.agents/notes/implemented/testing/2026-08-28-match-day-structural-extension.md)
explicitly **rejected at the e2e level** for being flaky and slow — it simply landed at the unit
level instead, where the reliability contract that rejected it does not apply.

**What to build:** a test-only seam that pins the match seed, and the three retry loops rewritten
to use it. That Agent Note's own follow-up line already anticipates this: "if a future deterministic
match seed becomes available, the force-off decision should be revisited". Making the seed
injectable settles both.

Do not fix this by raising `MAX_ATTEMPTS`. That trades a visible flake for a slower, rarer one.

- [x] `startMatch` accepts an explicit seed in tests without changing its production signature.
- [x] The Injury spec asserts against a seed known to produce an Injury, with no retry loop.
- [x] The two `Injury-free`/`clean match` helpers pin their seeds the same way.
- [x] 20 consecutive runs of `test/matchCommands.test.ts` are green.

## Comments

Built 2026-09-06. The seam is `MatchSeedSource`, a `Context.Reference<() => number>` in
`apps/desktop/src/main/match/start.ts`: a service *with a default*, so `startMatch`'s production
signature and requirements are unchanged and tests override it with `Effect.provideService`. The
spec also pins its world seed via `beginCareer`, because whether a seed injures anybody depends on
the squads as well as the match seed. The three retry loops are gone; the file now runs in ~1.3s
instead of hundreds of simulated matches. 20 consecutive runs green.

Rationale and rejected alternatives:
[.agents/notes/proposed/testing/2026-09-06-deterministic-match-seed-seam.md](../../../.agents/notes/proposed/testing/2026-09-06-deterministic-match-seed-seam.md).

The paths in this ticket predate the test-tree split: the spec is
`apps/desktop/test/main/match/commands.test.ts`.

## Resolved 2026-09-06

`MatchSeedSource`, a `Context.Reference<() => number>` on `main/match/start.ts` whose default is the
clock draw the line always was. `startMatch`'s signature, its `R`, and every production call site
are unchanged; a test pins a match with `Effect.provideService(MatchSeedSource, () => 3)`. It holds
a *function* rather than a number because a `Context.Reference`'s default is computed once and
cached — a `Reference<number>` defaulting to the clock would hand every match in a process the same
seed, which is a production behaviour change wearing a test seam's clothes. See
[the Agent Note](../../../.agents/notes/proposed/testing/2026-09-06-deterministic-match-seed-seam.md)
for the four alternatives rejected.

Pinning the match seed alone was not enough: whether a seed injures anyone depends on the squads
too, and `createSave` draws a fresh world seed every call. The spec now builds its career through
`beginCareer`/`commitCareer` at a pinned `WORLD_SEED`. All three retry loops are gone; the two
sibling helpers keep a drain-and-check as a guard that says "repin `<CONSTANT>`" rather than
retrying. **20 consecutive runs green**, and the spec went from hundreds of simulated matches to
~1.2s.

One correction to this ticket's premise: it quoted ~0.4% as the injury chance. That is the
*per-slice* roll — compounded over a match it comes out near 40% of matches, which is why 40
attempts usually but not always found one. The diagnosis was right; only the arithmetic in the
framing was loose.

The force-off e2e coverage this unblocks is **not** done — see ticket 03.
