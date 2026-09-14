# Group G: Match Day and Match Review — Reconciled Spec

Status: ready-for-slicing

## Problem Statement

The match day and match review screens (screens 91–104) cover the full match lifecycle from pre-match preview through post-match reporting. The match engine, RPC layer, and core match day experience (screen 93) are functionally built, but 10 of the 14 screens are partial stubs or absent. The existing spec files at `docs/specs/group_g_match_day_and_match_review/` define each screen in detail but are unconciled with the current codebase state. The gap between spec and codebase must be mapped so implementation tickets can target only what actually needs building.

## Solution

Produce a reconciled spec that states per screen what is already built and what needs new surfaces, ordered by dependency so the 8 partial screens can be built in priority sequence. Three screens are out of scope for Group G (98/102/104) and will be noted as deferred. The existing spec files serve as the authoritative screen-level specification; this document reconciles them with codebase reality.

## User Stories

1. As a manager, I want to see a match preview before kickoff, so that I know the fixture context, team news, and opposition. (Screen 91)
2. As a manager, I want to see the confirmed lineups before a match, so that I know which players are starting. (Screen 92)
3. As a manager, I want a live match overview showing score, clock, and key events, so that I can follow the match as it happens. (Screen 93 — already built)
4. As a manager, I want to see a dedicated live commentary feed, so that I can follow match events in detail. (Screen 94)
5. As a manager, I want to see live match statistics, so that I can evaluate how the match is progressing. (Screen 95)
6. As a manager, I want to see live player ratings, so that I can assess individual performances. (Screen 96)
7. As a manager, I want to make tactical changes and substitutions during a live match, so that I can influence the result. (Screen 97)
8. As a manager, I want a post-match summary with the final result, so that I can see the outcome. (Screen 99)
9. As a manager, I want to see full post-match statistics, so that I can analyze the completed match. (Screen 100)
10. As a manager, I want to see post-match player ratings, so that I can review individual performances after the match. (Screen 101)
11. As a manager, I want to see a match report, so that I can review a narrative of events. (Screen 103)

## Implementation Decisions

- **Screen 93 (Live Match Overview) is built** — `MatchDayScreen.tsx` is a functional, stateful screen with commentary streaming, kickoff flow, score display, substitution status, match controls, and result commitment. No additional work needed.

- **Screen 94 (Live Commentary) uses the existing engine** — `packages/game-engine/src/match/commentary.ts` has a full template system; `resumeSimulation` already returns `CommentaryLineView[]`. The standalone `MatchCommentaryScreen.tsx` stub needs a real component that renders the commentary stream the engine already produces.

- **Screens 95/100 (Statistics) share a component** — Both live and post-match statistics render the same data. A single `MatchStatsView` component should be built, driven by a new statistics aggregation view model. Current simulation events (Goal, ShotOnTarget, ShotMissed, etc.) provide the raw data, but no aggregation exists yet.

- **Screens 96/101 (Player Ratings) share a component** — A single `MatchRatingsView` component for both live and post-match contexts. No ratings computation exists yet; this needs a new ratings projection in the domain layer.

- **Screen 97 (Tactics/Substitutions) backend is built** — `submitMatchCommand` handles ChangeTactics, MakeSubstitution, and ForceOff commands. Command journaling and resimulation are wired. Only the UI components (`MatchMatchTacticsScreen.tsx`, `MatchSubstitutionsScreen.tsx`) need implementation.

- **Screens 98/102 (Team Talks) deferred** — Require a morale/team-talk domain model that does not exist (per SPEC-ROADMAP.md: "Team Talks have no morale model to act on"). Noted in spec; out of scope for this effort.

- **Screen 104 (Disciplinary Review) out of scope** — Disciplinary authority is cut from v1 per CONTEXT.md. Documented for future reference only.

- **Screen 103 (Match Report) needs new logic** — No report generation model exists. Requires defining what a match report contains and building the aggregation logic.

- **Build priority** follows dependency order: (1) Team Sheet, (2) Match Preview, (3) Commentary standalone, (4) Tactics/Subs UI, (5) Post-Match Summary, (6) Stats (shared), (7) Ratings (shared), (8) Match Report. Screens 1–5 use existing data with no new engine work.

## Testing Decisions

- Screen-level tests follow the existing pattern: Playwright e2e specs in `apps/desktop/e2e/` for reachable UI paths, and focused unit tests in the owning package for any new domain logic (statistics aggregation, ratings computation, report generation).
- RPC roundtrip tests in `packages/contracts/test/` for any new RPC endpoints.
- Match determinism tests if new simulation-adjacent logic is added.

## Out of Scope

- Screens 98 and 102 (Half-Time and Post-Match Team Talk) — deferred; require a new morale/team-talk domain model.
- Screen 104 (Match Incidents and Disciplinary Review) — cut from v1 per CONTEXT.md.
- Post-match flow integration with Season Summary and Continue (Group H scope).
- Multiplayer, worker pools, telemetry, non-normative scaffolding (inherited from Group A; not part of Group G work).

## Further Notes

The authoritative per-screen specifications live at `docs/specs/group_g_match_day_and_match_review/`. Each screen's detailed requirements (data model, interactions, accessibility, edge cases) are defined in its individual spec file. Implementation tickets should reference those files for screen-level detail while using this spec for build priority and scope guidance.