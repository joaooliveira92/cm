# 20: The calibration harness asserts nothing, and the engine is far off its targets

Found 2026-10-05 while collapsing the tactic adapter
([formations-and-instructions 35](../../formations-and-instructions/issues/35-player-instructions-reach-real-matches.md)),
which measured balance to decide whether real player instructions needed a retune.

**What's wrong:** `packages/game-engine/test/match/calibrate.test.ts` simulates 100 matches and
asserts nothing. Its header still names the targets — goals 2.5–2.8, yellows 3–4, fouls 20–26 — but
`03d6a928` removed the results print and the `allMet` assertion, leaving the accumulation loop and
`countEvents` dead. Measured on 2026-10-05 with the harness exactly as written: **goals 4.76, yellows
0.60, fouls 3.58**. Goals are ~1.7× the ceiling; yellows and fouls are far below their floors. A
balance regression now ships with a green suite.

**To decide:** whether those three are still the targets. Ticket [05](05-cm-calibration-figures.md)
replaced the fouls figure with sourced per-team ranges (fouls 11–13, tackles 17–21, interceptions
8–12) and left the goals band as CM "feel", so the header may be stale rather than the engine wrong.
Restoring assertions before that decision only makes the suite red.

**What to build:** settle the targets, then restore the harness's print and assertion. If the engine
is genuinely off, retune the constants or split that into its own balance ticket — but do not leave
the harness simulating a hundred matches and checking none of them.

**Blocked by:** None

**Status:** needs-triage