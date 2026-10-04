# Spec: match engine records decided involvement

Status: ready-for-agent

Source map: [map.md](map.md). Every decision below was settled there.

## Problem Statement

The CM 03/04 per-player table wants columns this engine cannot fill: passes and completions, tackles
and tackles won, headers and headers won, interceptions, fouls suffered, and a real possession figure.
The match screen effort had to leave every one of them off, because no Match Event records them, and
its fold rule forbids a screen inventing a number the stream lacks. The engine already decides most of
the facts privately and discards them: it rolls which side has the ball every Minute-Slice, it knows
when the side in possession fails to create an attack, it already names the fouling player, and the
header classifier already knows a shot was headed. What it does not decide, it must not fake.

The constraint is that the engine is deterministic and event-sourced. One extra random draw anywhere
shifts every later draw, so every seed would produce a different match, `calibrate.test.ts` would need
retuning for a change that adds no mechanic, and a live match interrupted by an upgrade would rewrite
the play the manager already watched. Committed matches keep their stored timeline, so an engine
change only affects new matches — but a recording change must never change a result, and the stored
timelines still have to decode the new kinds.

## Solution

The engine records the facts it already decides and attributes already-decided team-level facts to
named players; it simulates nothing new. Every new figure either comes from an event the engine chose
to emit, or does not exist.

- **Possession** is recorded as the share of Minute-Slices a side had the ball, carried as a
  cumulative `PossessionTally` so the live statistics cut stays exact at any revealed position. It
  takes the bottom bar; Attacks remains a Statistics row.
- **Tackles won, interceptions, headers and fouls suffered** are recorded per player. A tackle or
  interception is the defence winning a ball on a slice where the side in possession created no
  attack, credited to one defending player at a rate tuned to the researched targets. A `HeaderDuel`
  carries the header shooter as winner and his challenger as loser. The fouled player is a
  possession-side player named on the existing `Foul`.
- **Passes and completion do not exist.** Nothing in the engine decides a pass, and a figure with no
  event behind it is the invented number the standing rule forbids; they return only with a
  possession-chain model, a different engine granularity.
- **Attribution draws from a second random source** derived from the match seed, and its events are
  appended after the slice's set pieces, so the main source's draw order is untouched and every
  existing seed produces byte-identical play. The new timeline is the old one plus the new events.
- **The new events are silent in commentary**: each still produces exactly one Commentary Line, marked
  silent with no text and no delay, so the one-line-per-event invariant the live cut depends on holds
  and a match does not slow down.
- **The Match Player Line fold, the stored timeline union, the player-match-lines table and the Match
  Rating** extend to the new kinds in the same change, so the live table, the post-match table and the
  stored Form line still call one fold and can never disagree. Calibration asserts the new totals
  against the researched ranges, each naming its source and method.

## User Stories

1. As a manager watching a live match, I want the bottom bar to show Possession, so that I can see who has had the ball.
2. As a manager, I want the possession figure defined on screen as "Share of minutes with the ball", so that I know what the percentage measures.
3. As a manager, I want possession to read as unavailable before the first tally and never as 50–50, so that an early match is not invented.
4. As a manager, I want the Statistics tab to show Possession as a counted row, live and post-match, so that the figure is in the table as well as the bar.
5. As a manager, I want Attacks to remain a Statistics row, so that I can still see who creates chances.
6. As a manager, I want each player's tackles won, so that I can credit the defenders doing the work.
7. As a manager, I want each player's interceptions, so that I can see who reads the game.
8. As a manager, I want each player's headers attempted and won, so that I can judge aerial contribution.
9. As a manager, I want each player's fouls suffered, so that I can see who is being targeted.
10. As a manager, I want a player's tackles attempted derived as tackles won plus fouls committed, so that the Won column has a matching attempt count without a new event.
11. As a manager, I want the new columns in CM order between Key and Off, so that the table reads like the reference.
12. As a manager, I want Run counted from the already-recorded RunWithBall creator, so that a driving run is credited without a new engine action.
13. As a manager, I want the new per-player figures to read "-" on a match recorded before this change, never 0, so that old records are not misread.
14. As a manager, I want the Form season block to gain tackles and fouls suffered, so that a player's season reads across competitions.
15. As a manager, I want the Match Rating to reward tackles won, interceptions, headers won and fouls suffered, so that defenders and midfielders rate as the match went.
16. As a manager, I want a header lost and the derived tackle attempt to carry no rating weight, so that the least reliable facts do not move the number.
17. As a manager, I want the defence phase's goals-against share reduced, because recorded defending now carries part of what the proxy stood in for.
18. As a manager, I want the same Match Rating on the ratings tab, the stats table and the Form tab, so that the numbers never disagree.
19. As a manager, I want every new per-player figure to trace to a fact the engine actually decided in the same slice, so that no number is invented.
20. As a manager, I want no passes or completion anywhere, so that the table never claims a fact the model lacks.
21. As a manager, I want possession's spread to match the researched ranges, so that the figure is plausible.
22. As a manager, I want tackles won and interceptions to land in the researched per-team ranges, so that defensive numbers feel real.
23. As a manager, I want headers calibrated only against this engine's own cross and corner volume, so that we never inflate them to a real-football count.
24. As a player, I want existing seeds to produce byte-identical results, so that no save's history changes when this recording ships.
25. As a player, I want a live match interrupted by an upgrade to replay the same play with only the new events added, so that what I already watched is unchanged.
26. As a developer, I want a second random source for attribution, so that recording never shifts the main draw order.
27. As a developer, I want a guarantee test that strips the attribution and recovers the old timeline, so that any future recording change is caught.
28. As a manager, I want no feed text for tackles, interceptions, header duels and possession tallies, so that a denser, faster simulation stays readable.
29. As a manager, I want a match's live duration not to grow from silent events, so that watching a match is no slower.
30. As a manager, I want the Foul and Penalty lines to name the player brought down when known, so that commentary can say who was fouled and who will take it.
31. As a manager, I want possession and the new figures counted at the moment of play I have seen, so that live stats never reveal the future.
32. As a developer, I want committed timelines to store the new event kinds and the fouled-player field, so that committed matches keep their account of the match.
33. As a developer, I want player match lines to gain nullable counts for the new figures, so that a save schema bump refuses old saves and old rows read "-".
34. As a developer, I want the event volume within three times today's count and the stored timeline within its size budget, so that saves and commit time stay manageable.
35. As a developer, I want every AI fixture to simulate the full engine, so that player match lines fold from the same events as the user's match.
36. As a developer, I want the live table, the stored line and the Form read to call one fold, so that the three can never disagree.
37. As a manager, I want no new screen for any of this, so that the match screens I know keep their shape.
38. As a developer, I want the engine work sequenced after the match-screen fold and line-table tickets, so that it extends them rather than races them.

## Implementation Decisions

- **Recording rule.** A statistic is recorded only when the engine decided the fact behind it; recording a already-decided fact and attributing an already-decided team-level fact to one named player are both allowed, and simulating a new action that can change play is not part of this effort. Tackles won and interceptions are credited from slices where the side in possession created no attack, typed by the credited defender's tackling against his positioning and anticipation, at a credit rate tuned to the calibration targets so totals land in range; the attacker's header is the already-decided shot kind, so a `HeaderDuel` is emitted with the header shooter as winner; fouls suffered are attributed to a possession-side player. Passes, pass completion and key headers are ruled out. **Record decided facts and attribute decided team-level facts; simulate nothing new. Passes, completion and key headers are ruled out because nothing in the engine decides them.** See [Agent Note](../../.agents/notes/proposed/feature/2026-10-03-the-engine-records-decided-facts-not-new-actions.md).
- **Attribution source and placement.** Attribution is a pass at the end of each Minute-Slice, after set pieces resolve, drawing every pick and credit-rate roll from a second random source seeded by a distinct derivation of the match seed; nothing else draws from it and the main source's draw sequence is unchanged. None of its tags is a set-piece trigger or a stoppage-causing tag; the fouled player is a field filled on the existing `Foul` event at the same point, not a new event. The live match re-derives from the seed on every command, so both sources are recreated and consumed in the same fixed order. **Attribution draws from its own random stream derived from the match seed and appends its events after the slice's set pieces, so every existing seed produces the same result.** See [Agent Note](../../.agents/notes/proposed/architecture/2026-10-03-attribution-draws-from-its-own-stream.md).
- **Possession.** A cumulative `PossessionTally` event carries each side's slice count so far, emitted at the end of every slice that emitted any other event and always at half time and full time — about 40–50 a match, not 92. The live statistics cut reads the last tally at or before the revealed position; the figure is the home share of total slices as a whole percentage, null before the first tally and never 50–50. A timeline stored before tallies existed has none, so possession stays unavailable for that match. It replaces Attacks on the bottom bar; Attacks remains a Statistics row. **Possession is the share of minute-slices with the ball, carried as a cumulative `PossessionTally` event; it replaces Attacks on the bar, and Attacks stays as a Statistics row.** See [Agent Note](../../.agents/notes/implemented/feature/2026-10-03-possession-is-the-share-of-minutes-with-the-ball.md).
- **New Match Events.** Four kinds join the timeline with fields beyond the usual minute, half and team: `Tackle` (the credited winning defender), `Interception` (the credited defender), `HeaderDuel` (winner, loser, and whether the winner is the attacking header shooter — attempted for both, won for the winner), and `PossessionTally` (cumulative slice counts). `Foul` gains an optional `fouledPlayerId`. These are individual events, never per-player tallies, so every per-player figure stays a plain count and the live cut stays exact. Tackles attempted is derived as tackles won plus fouls committed, with no separate event. A cross or saved shot that produces a corner credits a defending player with a won defensive header. The classifier that decides a shot is a header moves out of commentary into one engine rule read by both commentary and attribution.
- **Event volume and cost budget.** Baseline measured on the current engine, 200 seeded matches: 59.8 Match Events and 6.7 KB of JSON per match. Expected additions are about 150–160 events and 16 KB per match. Budget, asserted in the implementing tickets: at most three times the baseline event count (≤180) averaged over 200 seeds; a stored timeline's JSON at most 20 KB on average; Matchday commit time grows by at most 25%, measured before and after on a seeded save and recorded in the commit body. Every AI fixture simulates the full engine with no cheaper path, because its player match line folds the same events. See [ticket 06](issues/06-event-volume-and-the-timeline.md).
- **Naming the fouled player.** The fouled player is a player of the side in possession, picked on the attribution stream weighted by dribbling plus flair and preferring attack-phase players as the fouler pick does, recorded as `fouledPlayerId` on `Foul`. The field is optional so stored timelines without it decode, and the fold counts fouls suffered only where it is present. A `Penalty` keeps naming its taker; the player brought down is the preceding `Foul`'s `fouledPlayerId`, so commentary may name both and no `Penalty` field is added. Who takes free kicks and penalties is unchanged, chosen from the set-piece taker lists on the main stream. See [ticket 07](issues/07-naming-the-fouled-player.md).
- **Calibration targets.** New assertions join the existing calibration targets for tackles, interceptions, headers and fouls suffered, each naming its source and method. Per team per match: tackles attempted 17–21 at about 60% won (10–13), interceptions 8–12, and fouls suffered about the opponent's fouls committed. Headers are asserted only against this engine's own cross and corner volume, never the real 27–44 aerial-duel range. Possession targets about 70% of team-matches in 40–60%, a side topping 60% in roughly 30–35% and 70% in under 10%. Passes are not modelled. The researched ranges and their provider definitions live in [the calibration research](../../docs/research/match-engine-calibration-figures.md); CM 03/04's one recoverable screen is low-confidence feel, not a target. The existing goal, card and foul figures in the calibration test are unchanged to the last digit. See [ticket 05](issues/05-cm-calibration-figures.md).
- **Commentary.** Every new event still produces exactly one Commentary Line, flagged silent: no commentary key, no text, delay zero. The pacer reveals a silent line at once and immediately takes the next, so a match's live duration does not grow; the feed and commentary screens skip silent lines; highlight levels never show or count them. The line count stays equal to the event count, which the revealed-position cut and the command stamp depend on. The commentary file gains no sections for the new kinds; giving one a voice later is a file change that clears its silent flag. The existing `Foul` and `Penalty` lines gain a `{fouled}` token, filled when the foul carries `fouledPlayerId`, with a line without the token used when it is absent. See [ticket 08](issues/08-commentary-for-new-events.md).
- **Rating weights.** The Match Rating's event weights gain: tackle won +0.10, interception +0.10, header won +0.05, foul suffered +0.03. A header lost and the derived tackles-attempted carry no weight, because losing an attributed duel is the least reliable fact in the line and a failed tackle is already the foul's penalty. The defence phase's goals-against share drops from -0.4 to -0.3, because recorded defending now carries part of what the proxy stood in for, but the result still dominates. Counts, not rates, are weighted, so every input remains a recorded event. This is the tuning of the structure fixed by [the Match Rating reads recorded involvement](../../.agents/notes/proposed/feature/2026-10-03-the-match-rating-reads-recorded-involvement.md); the weights live in the one rating module and nowhere else. See [ticket 09](issues/09-rating-weights-for-new-involvement.md).
- **The Match Player Line fold extends.** The existing pure fold over a timeline, cut at a revealed-event count or uncut, gains, in CM order between Key and Off, Tck, Won (tackles), Hea, Won (headers), Int, Run and Fld; the Form season block gains tackles and fouls suffered. Run needs no engine change: it is the already-recorded RunWithBall creator. Pas, Cmp and headers-keyed columns stay absent, and the table caption states once that only what the match records is shown. The live table, the post-match table and the stored line behind the Form tab still call this one fold, so the three can never disagree. This extends [the match player line folds only recorded events](../../.agents/notes/proposed/feature/2026-10-03-the-match-player-line-folds-only-recorded-events.md).
- **Player match lines.** The `player_match_lines` table gains nullable count columns for tackles, interceptions, headers attempted and won, and fouls suffered; it stores counts and never a rating, which is recomputed on read. Rows are written at resolution in the Matchday commit transaction for the user's fixture and every squad-bearing AI fixture, so a Matchday never has results without lines or lines without results; a `results-only` fixture has no engine timeline and gets no rows. Because the columns are DDL, the save schema version moves and older saves are refused with the existing mismatch error; pre-change rows read "-". See [player match lines are written at resolution](../../.agents/notes/proposed/architecture/2026-10-03-player-match-lines-are-written-at-resolution.md).
- **Stored timelines and matches in progress.** The stored timeline decodes against an explicit union of event schemas; the four new kinds join it and `Foul` gains its optional field in the same change as the engine, or committed timelines silently drop them. A timeline with no `PossessionTally` predates the change: its possession stays unavailable and its new per-player figures render "-", never 0, marked by the absence of any tally checked once per timeline. Because outcomes are byte-identical, a match in progress across an upgrade re-derives the same play with the new events added, and the existing restart-from-kickoff behaviour after an app restart is unchanged and needs no new notice. This respects [a committed match stores its timeline](../../.agents/notes/implemented/architecture/2026-09-19-committed-matches-store-their-timeline.md). See [ticket 10](issues/10-saves-and-in-progress-matches.md).
- **Screen follow-through.** The new figures extend the match-screen fold and reads; no new screen and no new match-screen decision. The per-player table and the Form rows gain the columns above; the Statistics tab gains Possession as a counted row plus tackles, interceptions and headers won per side, with possession leaving the unavailable line; the bottom bar shows Possession and Attacks stays a Statistics row. Old data reads "-". The engine work is sequenced after the match-screen fold and column-list ticket and its line-table ticket, extending them rather than racing them. See [ticket 11](issues/11-screen-follow-through.md).
- **Standing rules.** No screen invents what the stream lacks, and the engine gains only facts it decided; possession becoming available is the one previously unavailable statistic that moves. The engine stays a pure function of the match seed, and any later mechanic that draws randomness inside a match must consume a source derived from the same seed. See [the match model shows only what it produces](../../.agents/notes/implemented/architecture/2026-09-19-the-match-model-shows-only-what-it-produces.md) and [the three-phase engine and deterministic seed](../../.agents/notes/implemented/architecture/2026-08-27-match-engine-three-phase-and-deterministic-seed.md).
- **Pinned test seeds.** Attribution draws only from its own source, so the pinned match seeds the test suite relies on are unaffected; if a pinned constant's property is invalidated by the engine's new draw order, the implementing change repins it and names it, per the seed-seam guard. See [a deterministic match seed seam](../../.agents/notes/proposed/testing/2026-09-06-deterministic-match-seed-seam.md).

## Testing Decisions

Good tests observe behaviour at a seam: the engine's emitted events for a seed, a fold's output for a constructed timeline, a main-process read over a seeded save, a committed match read back, or a rendered screen's text and roles. They never assert on private helpers. Prefer the highest existing seam; the fewest seams win.

- **Seam 1 — the engine's attribution rule** (`packages/game-engine`): simulate a match for a spread of seeds and assert the new events, their fields, the credit typing, the derivation of tackles attempted, and that the header duel credits both players. Prior art: the engine simulate specs and `calibrate.test.ts`.
- **Seam 2 — the shared Match Player Line fold** (shared rules package): one test per counting rule and per new column, and the three-reads-agree test. Prior art: the existing match-rating and statistics-aggregation tests, and the fold's own counting-rule tests.
- **Seam 3 — the main-process statistics and Form reads** over a seeded save: possession live-cut and uncut, the new side totals, old-data "-" handling, and the bar. Prior art: the statistics and report read tests in the desktop main-process match tests, built on the seeded-save helper.
- **Seam 4 — the Matchday commit and the stored-timeline union**: after one commit, every new tag and the optional field read back; player-match-lines rows carry the new counts; a failed commit leaves neither results nor rows. Prior art: the committed-timeline tests.
- **Seam 5 — renderer components**: the stats table's new columns, the Possession bar ("not tracked" versus a figure, no 50–50 placeholder), and silent lines never drawn. Prior art: the match-stats and match-report screen tests.
- **Seam 6 — the RPC contract**, only if a new statistic key or event kind changes a request/response or event schema that crosses the renderer↔main boundary; then a roundtrip test in the contracts package covers it. Nothing else crosses.
- **E2E**: one Playwright pass through a live and a post-match Statistics tab and the Possession bar, run through pnpm so the bundle is rebuilt.

### Acceptance criteria → proving test

| Acceptance criterion | Proving test (risk class) |
|---|---|
| No new event changes a scoreline, card, injury or set piece for any seed; committed goal/card/foul figures unchanged to the last digit | Determinism: attribution guarantee test over ≥200 seeds, live-command and uncommanded; the calibration test's goal/card/foul assertions unchanged |
| Attribution picks draw only from the second source | Determinism: source assertion that no attribution draw touches the main source |
| Possession roll outcomes equal the tally increments | Determinism/domain unit test counting both |
| The live cut returns the last tally at or before the revealed position | Determinism unit test at several positions |
| A stored timeline without tallies shows possession unavailable, never 0 or 50 | Save compatibility: read a pre-change timeline |
| Tackles, interceptions and fouls suffered land in the researched ranges, headers against this engine's own volume, each naming its method | Property/table test over 200 seeded matches (calibration) |
| Tackles attempted equals tackles won plus fouls committed | Domain unit test |
| `HeaderDuel` credits attempted for both and won for the winner; a corner credits a defending header | Domain unit test |
| `fouledPlayerId` is a possession-side player; optional so old timelines decode; Fld counted only when present; takers unchanged | Domain unit test + save compatibility decode |
| Every new per-player figure traces to a team-level fact in the same slice; no pass or completion figure exists anywhere | Domain unit test per credit rule; a source assertion that no pass/completion figure exists |
| One fold fills the line; live, post-match and stored-line reads agree | Domain fold test; one seeded match read three ways |
| Rating weights move the rating by their constants; header lost and derived attempts carry none; defence share is -0.3 | Domain unit test per weight |
| The rating screen, the table's Rat column and the Form tab show the same number | Derived-projection agreement test |
| Commentary line count equals event count with every new kind present; silent lines carry no text or delay; feed and highlight filtering skip them | Domain unit test + renderer component test |
| Event count ≤180 and timeline ≤20 KB averaged over 200 seeds; commit time +≤25% | Property/measurement test; the commit-time measurement recorded in the commit body |
| Committed timelines decode every new tag and the optional field | Save compatibility: commit and read every tag back |
| `player_match_lines` carries the new nullable counts; old saves refused; pre-change rows read "-" | Save compatibility test; the schema gate |
| New statistics rows and Possession on the bar, live-cut and post-match; old data reads "-" | Main-process read test; Playwright pass |
| A live match interrupted by an upgrade replays the same play with the new events | Determinism + load-then-continue test |
| Any new statistic key or event schema crossing to the renderer is covered | RPC roundtrip test in the contracts package (only if the schema changes) |

## Definition of Done

- [ ] All four new Match Event kinds and the optional `Foul.fouledPlayerId` exist in the engine, attributed from the second source, with no change to any seed's scoreline, cards, injuries or set pieces.
- [ ] The attribution guarantee test passes for ≥200 seeds and the calibration test's goal/card/foul figures are unchanged to the last digit.
- [ ] Calibration asserts tackles won, interceptions, headers and fouls suffered, each naming its source and method, with headers bounded by the engine's own cross and corner volume.
- [ ] Event count ≤180 and stored-timeline JSON ≤20 KB, averaged over 200 seeds; Matchday commit time growth ≤25%, measured and recorded in the commit body.
- [ ] Commentary line count equals event count for a seeded match with every new kind; silent lines carry no text or delay and are skipped by the feed and highlight filtering.
- [ ] The Match Player Line fold, the stored line and the live table agree; the new columns and their "-" handling are in place; Run counts from the RunWithBall creator; no pass or completion figure exists anywhere.
- [ ] The Match Rating weights are added in the one rating module, the defence share is -0.3, and the rating screen, the table and the Form tab agree.
- [ ] The stored-timeline union decodes every new tag and field, with a commit-and-read-back test.
- [ ] `player_match_lines` gains the new nullable counts; the save schema version moves with its migration and old saves are refused; pre-change rows read "-".
- [ ] The match-screen Statistics tab, per-player table, Form block and Possession bar extend as described, with no new screen.
- [ ] `CONTEXT.md` is updated in the same change: the **Match Event** enumeration gains the four kinds and the `Foul` field, the **Match Player Line** term loses its "tackles/headers/interceptions are not drawn" premise, and a **Possession** term is added (definition: share of minutes with the ball).
- [ ] The one-line pointer to this map is added to [the match-screen spec](../match-screen-cm-layout/spec.md)'s Further Notes.
- [ ] Full gate green, clean tree, small Conventional Commits on `dev`.

## Validation commands

- `pnpm check:all` — the full gate: typecheck, `oxlint`, `effect-lint`, `verify-md-links`, `verify-db-schema`, and all unit tests (including the attribution guarantee and calibration tests).
- `pnpm check:ci` — the same set minus e2e OS setup.
- `pnpm -r test` — when isolating a package failure before the full gate.
- The Matchday commit-time before/after measurement is a manual measurement on a seeded save, recorded in the commit body, not a gate command.

## Out of Scope

- **Re-calibrating goals and fouls.** No decision here changes an outcome. The engine test fixtures measure 4.2 goals and 3.6 fouls per match against calibration targets of 2.5–2.8 and 20–26; that gap predates this effort and is its own balance pass. Until it closes, fouls suffered will be small.
- **Passes, completion and key headers.** Nothing decides a pass; they return only with a possession-chain model.
- A spatial model (Action Zones, a 2D pitch, positions on the pitch): a different engine, not more detail on this one.
- Referee, weather and attendance.
- Live scores from other fixtures: Matchday resolution, not the engine.
- Non Competitive and International Form rows, and Player History.
- Backfilling the new figures into existing saves.

## Further Notes

- Every map decision was settled without a human in the loop at the user's request, and the user approved the full set of recommendations on 2026-10-03.
- **`CONTEXT.md` needs a domain-modeling update** in the same change: the **Match Event** term's enumeration and the **Match Player Line** term's "not drawn" premise are now false, and **Possession** is a concept `CONTEXT.md` does not yet name. The map settled the naming and the shown definition; the glossary edit must ride with the implementation.
- **One artifact conflict to resolve before implementation.** The fold note [the match player line folds only recorded events](../../.agents/notes/proposed/feature/2026-10-03-the-match-player-line-folds-only-recorded-events.md) lists `Run` among its absent columns (it says RunWithBall names the finisher and creator, not a runner), while [ticket 11](issues/11-screen-follow-through.md) and the engine note behind [ticket 02](issues/02-record-or-simulate.md) count Run from the RunWithBall creator. This spec follows the map's ticket 11; the fold note's absent-column list must be amended, or that ticket revisited, before the fold changes.
- The match-screen spec currently lists passes, tackles, headers, interceptions, runs and fouls suffered as out of scope "until new engine events exist"; when this spec ships, that paragraph and the fold note's absent list become stale and are updated in the change that makes them stale.
- Rating weights and the credit-rate dial are first guesses; plan a tuning pass after playing several matches with the new columns. The rating module is their only home.
- Credited tackles and interceptions are a weighted distribution, not a record of who really made the play; a defender's tally reflects his attributes and minutes more than any single match, which is why they carry low rating weights.
- Headers will run far below real football because only crosses and set pieces decide one here; inflating them would be the invented-figure case, so they are calibrated only against this engine's own volume.
- A timeline stored before tallies or the new kinds reads "-" for the new figures and unavailable for possession; the marker is the absence of a tally, checked once per timeline.
