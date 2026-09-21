# 39: An empty bench is flagged before kickoff

Split from the review of [26](26-forced-substitution-picks-any-squad-player.md), 2026-09-21, orchestrator.

**What to build:** since 26, a forced substitution comes only from the named bench, and the default
human Tactic's bench is empty (`emptyBench()`). A manager who never names substitutes now plays with 10
after every severe Injury, with nothing telling them why. Show a readiness advisory (not a Readiness
Blocker; the match stays playable) when the human club's Tactic names no substitute, beside the existing
advisories (see [gate-red-on-dev 08](../../gate-red-on-dev/issues/08-short-squad-advisory.md) for the
pattern). The rule is pure, in `@cm-clone/shared`, with `apps/desktop/src/main/club/matchReadiness.ts`
reading the fact.

**Decisions:** [decision request 04](../decision-request-04-who-may-come-on-as-a-substitute.md), Option A:
"picking the bench before kickoff matters". An advisory rather than a blocker, because a benchless side is
a legal choice. Orchestrator call, recorded here.

**Blocked by:** None

**Status:** ready-for-agent

- [ ] The advisory shows when the human club's Tactic names no substitute, and not when it names at least one
- [ ] Play and Quick result stay available with it showing
- [ ] `pnpm check:all` green, and e2e since a screen changes
