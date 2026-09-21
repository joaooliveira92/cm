# 33: A live match replayed after a restart says so

Split from [31](31-committed-matches-store-their-timeline.md), 2026-09-21.

**What to build:** when the app reopens a Fixture whose match was started but not committed, the match
screen tells the manager it has restarted from kickoff, rather than replaying revealed play silently.
A live match re-derives from its seed and command journal under the current engine, so after an
upgrade the replay can differ from what the manager was shown; saying so is what keeps that honest.

**Decisions:** [revealed play is immutable](../../../.agents/notes/proposed/feature/2026-09-19-revealed-play-is-immutable.md),
point 3 (the revealed position is persisted), and decision request 05. If point 3 lands first, the
restart resumes at the revealed position under the same engine, and the message is only owed when the
engine has changed.

**Blocked by:** 31

**Status:** ready-for-agent

- [ ] Opening a started, uncommitted match after an app restart shows one sentence saying it restarted
      from kickoff
- [ ] A match opened in the same session it was started in shows no such sentence
- [ ] `pnpm check:all` green, and e2e if the match screen changed
