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

**Status:** resolved

- [x] The advisory shows when the human club's Tactic names no substitute, and not when it names at least one
- [x] Play and Quick result stay available with it showing
- [x] `pnpm check:all` green, and e2e since a screen changes

## Answer

Resolved 2026-09-21. `assessMatchReadiness` returns `advisories` beside `blockers`; its one advisory,
`no-substitutes-named`, fires when the human club's Tactic names no substitute still at the club, and never
changes `canPlay`. `PendingFixtureView` carries the advisories (a new required field, never persisted),
and Match day's Kickoff panel lists them under "Before kickoff": "No substitutes named. Name a bench on the
Squad screen, or no one can come on during the match, not even to replace an injured player." Play and
Quick result stay available. The Tactics Overview's issue list shows it too, with a Squad link.

**Surface: the Kickoff panel, not Continue's outstanding list.** An orchestrator call from review: the
bench freezes at kickoff, so that is when the manager needs to hear it, and on Continue it would repeat
every day of the career.

Left (lows): the advisory severity is stated in a doc comment rather than narrowed in the schema; the
Kickoff panel lists the advisory as prose, not a link; a bench of unavailable players still counts as
named, which matches "names no substitute"; CONTEXT.md has no term for a readiness advisory.
Report: [group-g-match-day](../../../.ai/reports/group-g-match-day.md).
