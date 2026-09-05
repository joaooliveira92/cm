# 02: `matchCommands.test.ts` retries against a wall-clock seed and flakes

Type: bug
Status: ready-for-agent

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

- [ ] `startMatch` accepts an explicit seed in tests without changing its production signature.
- [ ] The Injury spec asserts against a seed known to produce an Injury, with no retry loop.
- [ ] The two `Injury-free`/`clean match` helpers pin their seeds the same way.
- [ ] 20 consecutive runs of `test/matchCommands.test.ts` are green.
