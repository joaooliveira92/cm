# 08: The before-matchday seed no longer offers a fixture, so Match Day has no `Start match`

**What to fix:** four e2e tests reach Match Day and then fail waiting for a `Start match` button:
`router.spec.ts:184`, `journeys.spec.ts:92` and `:158`, and `keyboard.spec.ts:158`. The page snapshot
the navbar-keyboard-intent 03 implementator read showed "Calendar: Season 1 · Pre-season" and "No
Fixture is waiting. Continue the career to reach your next one." The review of that ticket did not
find this cause in the saved logs, so re-observe it first.

`router.spec.ts:184` enters with `enterCareer`, the other three with `seedBeforeMatchday`. Check
whether both seeds changed, or whether the match-day screen changed what it needs. Repo memory notes
that Continue now costs a played Matchday and that advance loops in tests must go through
`boundary-helpers.ts`. That is a likely suspect.

**Blocked by:** None

**Status:** ready-for-agent

- [ ] The cause is observed in a page snapshot, not inferred
- [ ] The four tests reach a startable match again, without loosening what they assert afterwards
