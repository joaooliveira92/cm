# Validation Report: group-g-match-day

## Sprint

- Effort: `.scratch/group-g-match-day/`
- Tickets closed: `07-tactics-substitutions-ui` (Screen 97)
- Branch: `dev`
- Commits: see `git log` for `feat(match): live tactics and substitutions screens` (ticket 07)

Tickets 04–06 were committed before this report existed and are not covered here.

## Acceptance criteria → evidence

| # | Criterion | Proving test | Result |
|---|---|---|---|
| 1 | Tactics screen shows current formation and allows adjustments | `test/renderer/match/live-command-screens.test.tsx` "shows the formation in play and submits a changed instruction as ChangeTactics" | pass |
| 2 | Substitutions screen shows available substitutes and allows changes | same file, "submits the substitution for the controlled club at the revealed minute and shows it applied"; "starts from the line-up the Match day panel last sent…" | pass |
| 3 | Commands go through `submitMatchCommand` | same tests assert the `submitMatchCommand` payload (away club id, revealed minute) | pass |
| 4 | Command status (pending, accepted, applied, rejected) displayed | `test/renderer/match/command-status.test.ts`; screen tests for applied, rejected (engine refused), rejected (transport failure), accepted | pass |
| 5 | Substitution cap respected | screen test "disables the controls once the match reports the cap reached" | pass |
| 6 | Accessible via live-match tab navigation | not met: the tab bar is mounted nowhere. Reached from Match day buttons instead; `test/renderer/navigation/adapter-coverage.test.ts` covers both new destinations | deviation, ticket 13 |
| 7 | Loading and error states handled | screen tests "shows a loading state…", "surfaces a failed load with Retry…", "says no match is in play…" | pass |
| — | Panel and screens share one live line-up (review H2) | `test/renderer/match/live-keyboard.test.tsx` "Screen 97 — the panel and the standalone screens share one live line-up" (fails with the fix reverted) | pass |
| — | Halftime instruction only at half time (review M1) | screen test "offers the halftime instruction only while the reveal stands at half time" | pass |

## Gate

| Gate | Command | Result |
|---|---|---|
| check:all | `pnpm check:all` | exit 1, pre-existing failures only. typecheck ✓, oxlint (errors only in untouched `main/career/player.ts`, `matchPreview/MatchPreviewScreen.tsx`), effect-lint ✓ (748 files), verify-db-schema ✓, verify-md-links ✗ (pre-existing, below). Tests: shared 451/451, contracts 63/63, game-engine 50/50, desktop 65 failed / 1516 passed across 20 files |
| baseline | the 20 failing desktop files run with this diff stashed (`git stash push -u`), `pnpm exec vitest run <files>` | 20 files failed, 65 failed / 112 passed — identical failure count, so no regression |
| e2e | `pnpm --filter @cm-clone/desktop test:e2e` | 10 failed / 24 passed. Every failure stops before match-day code: at `g <letter>` navigation (`pressPrefix(page, "a")` → no Tactics heading), the tactics editor, or "Start match" enablement. Page snapshot for `keyboard.spec.ts:30` shows Squad still on screen after `g a`; bindings became number keys in `860d429`. The new journey `journeys.spec.ts:157` fails at the same drifted `openTacticsEditor` step, so it is written but **not yet proven** |
| determinism | — | not applicable: no simulation, seeding or engine change; commands use the existing journal path |
| save compatibility | — | not applicable: no persistence or schema change |

## Behavior changes

- Match Tactics and Match Substitutions screens replace WIP stubs and submit live commands.
- The Match day panel now seeds its tactic from the last tactic any live surface sent (in-memory,
  per save, cleared when the match completes) instead of always the pre-match tactic. No save impact.
- Match day's live section gains buttons to both screens.

## Decision records

- ADRs added: none
- Agent Notes written (`proposed/`): none — the ticket cites none, and the shared live tactic is an
  in-memory renderer seam recorded in the ticket's Comments
- Agent Notes promoted (`implemented/`): none
- Decision request: `.scratch/group-g-match-day/decision-request-01-live-change-tactics-scope.md`

## Pre-existing failures

- Desktop unit tests: the 20 files listed by the gate, incl. `managerProfile/screen.test.tsx`,
  `router/main-menu.test.tsx`, `navigation/navbar.test.tsx`, `navigation/route-index.test.ts`,
  `discoverability/*`, `main/season/rollover-*`, `match/live-keyboard.test.tsx` (7 cases),
  `match/screen-fulltime.test.tsx`.
- `verify-md-links`: 17 links in `.scratch/group-c-club-information/RECONCILIATION.md`, 1 in
  `.scratch/group-d-player-and-staff-records/issues/02-staff-screens-scope.md`.
- e2e: `g <letter>` helpers drifted from the number-key bindings of `860d429`.

## Deferred and known limitations

- Live `ChangeTactics` rebuilds the line-up and can return a dismissed player — decision request 01.
- Panel commands the home club when the controlled club is away, and writes the shared tactic before
  its commands resolve — ticket 12.
- Live-match tab bar unmounted — ticket 13.
- No backend request id for idempotent commands (spec §9); duplicate presses are guarded client-side.

## Review

- Pass 1: NEEDS_REWORK. H1 score/head-count read from the first chunk; H2 panel and screens kept
  separate tactics; H3 engine resurrects dismissed players (pre-existing → decision request 01);
  M1 halftime toggle usable at any minute; M2 missing e2e; lows L1–L5. All in-scope items repaired.
- Pass 2: APPROVE. Two new lows on the panel's early/optimistic shared-tactic writes, filed on ticket 12.

---

# Ticket 08 — Post-Match Summary (Screen 99)

## Acceptance criteria → evidence

| # | Criterion | Proving test | Result |
|---|---|---|---|
| 1 | Final score with goalscorers | `apps/desktop/test/main/match/commands.test.ts` "getPostMatchSummary lists every goal…" (goal count = final score, credited to the scoring side — fails when every goal is credited home); `test/renderer/match/post-match-summary.test.tsx` per-side scorer lists | pass |
| 2 | Key match events (cards, injuries) | same main test (per-kind counts equal the commentary timeline, match order); renderer test lists cards and injuries in words | pass |
| 3 | Navigation to statistics, ratings, report | renderer test "links to statistics, player ratings and the match report"; `adapter-coverage.test.ts` for the three destinations | pass (shown only after commit) |
| 4 | Accessible via post-match tab navigation | not met: tab bar unmounted — ticket 13 | deviation |
| 5 | Loading and error states | renderer test loading text, failed read with Retry | pass |
| — | Summary and links withheld until the result is accepted | renderer tests at `complete` (fails with the gate removed) and after Accept | pass |
| — | An accepted result stays accepted, Continue unlocks, no stale session | renderer test "keeps an accepted result accepted…" (fails with the phase guard or the committed cleanup removed) | pass |
| — | Summary readable after `commitMatchday` | main test re-reads after commit | pass |
| — | Contract | `packages/contracts/test/post-match-summary.test.ts` roundtrip + rejects an unlisted event kind | pass |

## Gate

| Gate | Command | Result |
|---|---|---|
| check:all | `pnpm check:all` | exit 1. typecheck ✓, verify-db-schema ✓; lint ✗ (errors only in untouched files, also failing at ticket 07); verify-md-links ✗ (same pre-existing links); effect-lint ✗ **caused by this ticket** — `packages/contracts/test/roundtrip.test.ts` reached 635 lines. Tests: shared 451/451, contracts 65/65, game-engine 50/50, desktop 62 failed / 1531 passed across 17 files |
| repair | tests moved to `packages/contracts/test/post-match-summary.test.ts`; `tsx scripts/effect-lint.ts` → no violations (752 files); `pnpm exec vitest run` in contracts → 65 passed; `vitest run test/shared/max-file-length-lint.test.ts` → 7 passed | pass. Full `check:all` not re-run after this test-file move |
| failures vs baseline | the 17 failing files = the ticket 07 baseline list, minus the four `test/main/season/rollover-*`/`retention-*` files (passing in this run), plus `max-file-length-lint.test.ts` (the effect-lint regression above, now passing) | no product regression |
| e2e | not re-run | the ticket 07 run showed every match journey stopping at drifted `g <letter>` helpers before Match day; no signal available for this screen until those are fixed |
| determinism / save compatibility | — | not applicable: a read over the existing stream; no schema change |

## Behavior changes

- Match day shows the Post-Match Summary after Accept result.
- Fix: an accepted result no longer flips back to Accept result; Continue unlocks after Accept, and no
  match session survives the commit.

## Review

Pass 1 NEEDS_REWORK (high: review links before commit strand the Matchday). Pass 2 NEEDS_REWORK
(high: Continue stayed suspended once `committed` held). Pass 3 APPROVE; its low finding (stale
Kick off after returning post-commit) is on ticket 15.

---

# Ticket 09 — Match Statistics (Screens 95/100)

Committed as `447b49c` (commit made from the shared worktree while this report was pending; its
contents are the reviewed diff — 25 files, tree clean afterwards).

## Acceptance criteria → evidence

| # | Criterion | Proving test | Result |
|---|---|---|---|
| 1 | Aggregation computes shots, shots on target, possession, corners, fouls, cards, offsides | `apps/desktop/test/main/match/statistics.test.ts` (table, reconciliation); `commands.test.ts` "getMatchStatistics reconciles…" (goals = final score, substitutions by side = `homeSubs`/`awaySubs.used`, cards/injuries = commentary tags) | partial: possession, corners, fouls, offsides not simulated — decision request 02 |
| 2 | Aggregated stats via RPC | `packages/contracts/test/match-statistics.test.ts`; integration test incl. `MatchNotFoundError` | pass |
| 3 | `MatchStatsView` renders both teams | `test/renderer/match/match-stats-screen.test.tsx` (table cells per side, unavailable line) | pass |
| 4 | Live and post-match contexts | screen tests: live payload `revealedEvents`, full time before Accept, restart mid-match (cut at 0 — fails without the guard), last played; unit test for stoppage time and shared minutes (fails without the cut) | pass |
| 5 | Loading and error states | screen tests: loading text, failed read with Retry, "No match played yet" | pass |

## Gate

| Gate | Command | Result |
|---|---|---|
| check:all | `pnpm check:all` | exit 1. typecheck ✓, effect-lint ✓ (757 files), verify-db-schema ✓; lint ✗ and verify-md-links ✗ only in files this ticket did not touch. Tests: shared 451/451, contracts 68/68, game-engine 50/50, desktop 61 failed / 1544 passed across 16 files |
| failures vs baseline | failing files diffed against the ticket 07 clean-HEAD baseline list | 16 files, all in the baseline; the four `main/season` rollover/retention files pass in this run — no new failure |
| e2e | not run | helpers drifted (ticket 07 section); no signal for this screen |
| determinism / save compatibility | — | not applicable: pure read over the existing stream, no schema change |

## Review

Pass 1 NEEDS_REWORK (high: live cut by minute wrong around stoppage and half time). Pass 2
NEEDS_REWORK (medium: restart mid-match leaked full totals). Both repaired with tests; the reviewer's
approval conditions (fix the leak, record the route deviation on the ticket) are met.

---

# Ticket 10 — Match Player Ratings (Screens 96/101): parked

Not built. No rating formula exists in CONTEXT.md, the Agent Notes or the engine, and the Match Events
name no goalkeeper or defender contribution. Options and a recommendation are in
[decision request 03](../../.scratch/group-g-match-day/decision-request-03-match-player-rating-formula.md).
Ticket set to `needs-info`, committed as `6287ffa`.

---

# Ticket 11 — Match Report (Screen 103)

## Acceptance criteria → evidence

| # | Criterion | Proving test | Result |
|---|---|---|---|
| 1 | Structured summary of all key events | `apps/desktop/test/main/match/commands.test.ts` "getMatchReport records…": for each kind (Goal, cards, Injury, Substitution), the count matches the commentary timeline; a manager substitution is driven through `submitMatchCommand` | pass |
| 2 | Goalscorers, cards, substitutions, injuries, final score | same test: final score = last chunk, half-time score = first-half goals per side, substitutions per side = `homeSubs`/`awaySubs.used`, every name resolved; `packages/contracts/test/match-report.test.ts` round-trip | pass |
| 3 | Screen renders the narrative summary | `test/renderer/match/match-report-screen.test.tsx`: result sentence for home win, away win and draw; goalscorers; ordered timeline; statistics shown as "Full match" | pass |
| 4 | Reachable from post-match navigation | `post-match-summary.test.tsx` (link resolves to `/career/$saveId/match-report/$matchId` with the match id); `match-report-route.test.tsx` (app router registers the path; screen reads the match named in the URL) | pass |
| 5 | Loading and error states | screen test: loading text; `MatchNotCompleteError` shows its own message without Retry; failed read with Retry | pass |

## Gate

| Gate | Command | Result |
|---|---|---|
| check:all | `pnpm check:all` | exit 1. typecheck ✓, effect-lint ✓ (762 files), verify-db-schema ✓. lint ✗: 6 errors, all in files this ticket did not touch (`PlayerDevelopmentScreen`, `PlayerContractScreen`, `MatchHomeTeamScreen`, `PlayerProfileScreen`, `MatchPreviewScreen`). verify-md-links ✗: the same 18 pre-existing links. Tests: shared 451/451, contracts 71/71, game-engine 50/50, desktop 62 failed / 1550 passed across 17 files |
| failures vs baseline | the 16 files failing in the first gate run were rerun on clean HEAD (`git stash -u`) and with the change applied | identical 61 failing test names; no new failure |
| extra file in the final run | `npx vitest run test/main/transfers/incoming-bids.test.ts` | 19/19 pass alone; failed in the full run only (load-sensitive, outside this change) |
| e2e | not run | helpers drifted (ticket 07 section); no signal for this screen |
| determinism / save compatibility | — | not applicable: a read over the existing stream; no schema change |

## Behavior changes

- The Match Report screen replaces the placeholder. It is refused until the result is committed.
- The `matchReport` destination and route carry `matchId`.
- Fix: whole-match statistics show "Full match" rather than "Up to 0'" (`throughMinute` is `null`).

## Review

Pass 1 APPROVE. In-scope lows repaired: route test added, "available" copy, half-time assertion made
direct, a substitution driven so the substitution checks cannot pass without testing anything, primary-key
fixture lookup, heading levels. The ambiguous stoppage-minute display is filed as
[ticket 17](../../.scratch/group-g-match-day/issues/17-stoppage-minutes-read-as-second-half.md).
