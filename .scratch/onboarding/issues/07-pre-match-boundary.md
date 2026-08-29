# 07: Pre-match boundary + Play/Quick result + delete fallback tactics

**What to build:** When Continue reaches a Matchday containing the human club, it resolves zero Fixtures and stops at a persisted pre-match boundary (`season.awaiting_fixture_id`, `season.awaiting_match_id`). Repeated Continue presses mutate nothing. `synthesizeDefaultTactic` is deleted; the `getTacticForClub` fallback to `pickBestFormationTactic` is removed for every club. Once readiness passes, the player chooses Play or Quick result — both run `runSimulation` through the same `PersistedMatchStarted` stream, differing only by command journal and live reveal. An explicit idempotent completion command commits the human result + nine AI Fixtures + Condition write-backs in one transaction. Match seeds derive from `SeasonStarted.seed` + `fixtureId`. `startMatch` is Fixture-bound (no free-opponent exhibition mode). `PersistedMatchStarted` carries the full four-value Pillar snapshot.

**Decisions:**

- Continue stops at a persisted pre-match boundary before resolving any of the human's Matchday; the player then chooses Play or Quick result, both running the same simulation through the same match stream, committed by an explicit idempotent completion command. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-08-29-human-fixture-pre-match-boundary.md).
- `startMatch` becomes Fixture-bound and takes the human club's home or away role from the Fixture; the free-opponent exhibition path is removed from v1. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-08-29-human-fixture-pre-match-boundary.md).
- `synthesizeDefaultTactic` is deleted; `getTacticForClub` returns a typed error when no persisted Tactic exists; `pickBestFormationTactic` remains only for `assignAiTactics`. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-08-29-human-fixture-pre-match-boundary.md).

**Blocked by:** 06 (needs Continue result surface + shell control to consume boundary)

**Status:** ready-for-agent

- [ ] Continue press reaching human's Matchday resolves zero Fixtures; boundary persisted as `season.awaiting_fixture_id` (+ `awaiting_match_id`); phase stays `in_season`
- [ ] Repeated Continue at the boundary mutates nothing; pre-boundary hooks (Transfer Window) do not re-run while `awaiting_fixture_id` is set
- [ ] `PersistedMatchStarted` emitted only after authoritative readiness validation succeeds
- [ ] Play and Quick result produce same match stream shape; Quick result uses empty command journal, differs only by presentation
- [ ] Seed derived from `SeasonStarted.seed` + `fixtureId`; rejected start emits no event, creates no link
- [ ] `resumeSimulation` never implicitly commits Fixture or Matchday state
- [ ] Explicit idempotent completion command: human result from persisted stream + nine AI Fixtures + Condition write-backs + `MatchdayResolved` + `current_matchday` increment + clear boundary columns — one transaction
- [ ] `synthesizeDefaultTactic` deleted; `getTacticForClub` returns typed error for missing tactic (any club, not only human)
- [ ] `startMatch` is Fixture-bound (takes pending fixture identity + mode); exhibition mode removed
- [ ] Match day derives active match from authoritative season state, never React component state; navigating away and restarting resume the same stream
- [ ] Integrious violations (two streams per fixture, match id without fixture id, etc.) fail with typed errors, never repaired heuristically
- [ ] No AI fixture seed persistence added; no ruleset versioning introduced
- [ ] Tests: no-fallback refusal (assert on `advanceCalendar` + match-entry command), idempotence, seed determinism across quit-and-reload, boundary persistence, integrity violations