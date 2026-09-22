# 42: Quick result skips the live reveal, as the glossary says

Split from the review of [37](37-match-day-resumes-a-started-match-after-a-restart.md), 2026-09-21, orchestrator.

**What to fix:** CONTEXT.md's **Quick result** "skips only the live reveal", and the `startMatch` contract
comment says `quick` "runs straight to full time without a live reveal". The renderer sends the mode, main
ignores it (`_mode`, correctly, since the mode is presentation), and then the renderer's
`startMatch("quick")` enters the same paced live reveal as Play. Make a Quick result go straight to full
time in the renderer.

**Open question, to settle before building:** a quick-started match left unaccepted across an app restart is
restored by 37 as a live replay, because the mode is persisted nowhere. Either persist the mode with the
match (a schema change) or accept a live replay after a restart. Raise it as a decision request if it is not
routine.

**Blocked by:** None

**Status:** needs-triage

- [ ] Quick result reaches full time with no paced reveal; Play is unchanged
- [ ] The restart case follows whatever the open question settles
- [ ] `pnpm check:all` green, and e2e
