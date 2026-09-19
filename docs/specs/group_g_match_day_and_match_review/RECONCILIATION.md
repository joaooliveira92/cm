# Group G reconciliation ledger

The specs in this directory are an **import**, not a set of requirements. This ledger records, per
screen, every place the import is knowingly not followed, and why. The format is the one the
[Group A ledger](../group_a_application_shell_and_game_lifecycle_remaining/RECONCILIATION.md) pilots,
with the same four kinds and status vocabulary. The import files are never edited.

## Transcribed 2026-09-19 — the last group in the M1 sweep, and the least typical

Milestone [M1](../../../.ai/MILESTONES.md) step 1, completing it. Group G is unlike the other nine.
Every other group's story is *what did we decide not to build*. Group G's is **what did building it
reveal**: nine screens shipped, and they generated nineteen follow-up tickets and eight decision
requests, five of which are still open.

So this ledger's centre of gravity is not the disposal table — there are only three disposed screens.
It is § The engine questions, below, which records what the live match turned out not to have settled.

**One correction in transcription.** Ticket 02 ruled Screen 104 "out of scope (cut from v1)" and
Screens 98 and 102 "out of scope for Group G (deferred)". Under
[the completed rule](../../../.agents/notes/proposed/process/2026-09-19-a-v1-exclusion-is-deferred-not-out-of-scope.md),
all three are `deferred`: 98 and 102 for an absent morale model, 104 for an absent discipline model and
a v1 cut. A version cut is a version boundary, not a statement that the thing should never exist.
**No screen in Group G is `out-of-scope`.**

## What each status asserts

| Status | What silence about a section asserts |
|---|---|
| `Reviewed` | Nothing. The rows are what a whole-file pass found; no section was individually checked. |
| `Deferred in full` | The screen is wanted and not built. Its one row covers every section. |
| `Parked` | Built work was deliberately not started or not shipped, pending a named decision. Distinct from `deferred`: someone is waiting on an answer, not on a model. |

## Coverage

| Screen | Import file | Status |
|---|---|---|
| 91 Match Preview | [091_match_preview.md](091_match_preview.md) | Reviewed — implemented |
| 92 Match Day Team Sheet | [092_match_day_team_sheet.md](092_match_day_team_sheet.md) | Reviewed — implemented |
| 93 Live Match Overview | [093_live_match_overview.md](093_live_match_overview.md) | Reviewed — implemented |
| 94 Live Match Commentary | [094_live_match_commentary.md](094_live_match_commentary.md) | Reviewed — implemented |
| 95 Live Match Statistics | [095_live_match_statistics.md](095_live_match_statistics.md) | Reviewed — implemented, partial |
| 96 Live Match Player Ratings | [096_live_match_player_ratings.md](096_live_match_player_ratings.md) | **Parked** — no rating formula |
| 97 Live Match Tactics and Substitutions | [097_live_match_tactics_and_substitutions.md](097_live_match_tactics_and_substitutions.md) | Reviewed — implemented |
| 98 Half-Time Team Talk | [098_half_time_team_talk.md](098_half_time_team_talk.md) | Deferred in full |
| 99 Post-Match Summary | [099_post_match_summary.md](099_post_match_summary.md) | Reviewed — implemented |
| 100 Post-Match Statistics | [100_post_match_statistics.md](100_post_match_statistics.md) | Reviewed — implemented, partial |
| 101 Post-Match Player Ratings | [101_post_match_player_ratings.md](101_post_match_player_ratings.md) | **Parked** — no rating formula |
| 102 Post-Match Team Talk | [102_post_match_team_talk.md](102_post_match_team_talk.md) | Deferred in full |
| 103 Match Report | [103_match_report.md](103_match_report.md) | Reviewed — implemented |
| 104 Match Incidents and Disciplinary Review | [104_match_incidents_and_disciplinary_review.md](104_match_incidents_and_disciplinary_review.md) | Deferred in full |

Ticket references below are deliberately unlinked: they live under `.scratch/`, which is cleared when
an effort is archived, and this ledger outlives the effort that produced it.

## Deferred in full

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| [098_half_time_team_talk.md](098_half_time_team_talk.md), whole file | `deferred` | A half-time team talk whose tone affects the players. | No morale model to act on. The half-time *window* exists and carries tactical instruction; what is missing is anything for a talk to change. | `unscheduled` — no morale model, and the manager-to-player axis additionally rests on `v1 exclusion — CONTEXT.md:753`. Ticket 02. Same ground as [Group D 58](../group_d_player_and_staff_records/58_player_happiness.md). |
| [102_post_match_team_talk.md](102_post_match_team_talk.md), whole file | `deferred` | A post-match team talk responding to the result. | Same absent model. | `unscheduled`. Ticket 02. |
| [104_match_incidents_and_disciplinary_review.md](104_match_incidents_and_disciplinary_review.md), whole file | `deferred` | Reviewing incidents and their disciplinary consequences: cards, bans, appeals. | Cut from v1. Cards are **Match Event**s inside one match; nothing accumulates them, nobody is suspended, and no appeal exists. | `unscheduled`. Ticket 02 ruled it "out of scope (cut from v1)"; re-kinded 2026-09-19. The same absent model defers [Group D 60](../group_d_player_and_staff_records/60_player_discipline.md) and Group E 77's eligibility half. |

## Parked: the two player-ratings screens

Screens 96 and 101 are the only `Parked` rows in the corpus, and the distinction is worth keeping:
they are not waiting on a model the game lacks, they are waiting on **a formula nobody has chosen**.

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| [096_live_match_player_ratings.md](096_live_match_player_ratings.md), [101_post_match_player_ratings.md](101_post_match_player_ratings.md), whole files | `deferred` | A per-player rating for the match, live and final. | **Not built**, and now buildable. Ticket 10 was parked rather than attempted: no rating formula existed, and the **Match Event** stream names no goalkeeper or defender contribution, so an event-only rating would systematically under-rate half the team. | **Answered 2026-09-19** — [the match model shows only what it produces](../../../.agents/notes/proposed/architecture/2026-09-19-the-match-model-shows-only-what-it-produces.md). A **Match Rating** is an event rating plus a share of the phase result, read from the stored timeline, so it depends on ticket 31. |

The event-stream gap is the substantive finding: this is a data-model question wearing a formula's
clothes. A rating cannot be fair until the engine records what defenders and goalkeepers did.

## Divergences in what shipped

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| [095_live_match_statistics.md](095_live_match_statistics.md), [100_post_match_statistics.md](100_post_match_statistics.md), possession, corners, fouls, offsides | `deferred` | A full statistics panel. | Those four are **unavailable**, because the engine does not simulate them — it produces the events it produces, and a statistic it never generates cannot be shown without fabrication. The rest ships, with live totals cut by revealed-event count. | group-g decision request 02 (unsimulated match statistics), **open**. Ticket 09. |
| [093_live_match_overview.md](093_live_match_overview.md) and all live screens, revealed position | `contradicted` | The screen shows the match state. | Every live surface shows **the revealed position**, never the engine's true position. Score, head-count, commentary, statistics and substitution counts all stop where the reveal has reached. A response carrying state ahead of the reveal is a defect, and was one (ticket 22). | The reveal is the game's contract with the viewer. Tickets 18, 21, 22, 25, 27. |
| [097_live_match_tactics_and_substitutions.md](097_live_match_tactics_and_substitutions.md), scope of live change | `deferred` | Tactics may be changed freely during the match. | What a live Change Tactics may alter is unsettled — the head-count visibly disagrees with the engine after one (ticket 22). | group-g decision request 01, **open**. Ticket 07. |
| [099_post_match_summary.md](099_post_match_summary.md), [103_match_report.md](103_match_report.md), availability | `contradicted` | The summary and report are available at full time. | Both are **refused until the result is committed**. `getPostMatchSummary` and `getMatchReport` will not serve an uncommitted match, because an uncommitted result is not yet a fact about the world. | The one-transaction `commitMatchday` — [human fixture pre-match boundary](../../../.agents/notes/implemented/architecture/2026-08-29-human-fixture-pre-match-boundary.md). Tickets 08 and 11. |
| [103_match_report.md](103_match_report.md), goalkeeper changes | `renamed` | Substitutions are listed as substitutions. | A goalkeeper stand-in is listed as a **move into goal**, and the incident list agrees with the substitutions statistic. | Ticket 30. Opened by decision request 06 (red-carded goalkeeper). |

## The engine questions

Eight decision requests came out of this group. **Five are open, and they are the largest cluster of
unanswered questions in the corpus.** They are recorded here because they are not Group G's alone —
decision request 07 in particular governs how *any* engine rule may ever change.

| # | Question | State | What it holds |
|---|---|---|---|
| 01 | What may a live Change Tactics alter? | **Answered** | Team Instructions only. Never the line-up. |
| 02 | Should unsimulated statistics be shown, and how? | **Answered** | No. The four stay named as unavailable. |
| 03 | What is the match player rating formula? | **Answered** | Event rating plus phase share, from the stored timeline. |
| 04 | Who may come on as a substitute? | **Answered** | Only a bench player who has not yet played. |
| 05 | What survives a restart of the revealed position? | **Answered** | The revealed position is durable. |
| 06 | What happens to a red-carded goalkeeper? | **Answered** | An outfield stand-in, as with an injury. |
| 07 | **How may engine rules change without rewriting saved matches?** | **Answered** | A committed match stores its timeline. See below. |
| 08 | When does a live command take effect relative to revealed play? | **Answered** | At M+1. Never at a revealed minute. |

**All eight were answered on 2026-09-19.** Four of them — 01, 04, 05 and 08 — turned out to be one
question, and are settled together as
[revealed play is immutable](../../../.agents/notes/proposed/feature/2026-09-19-revealed-play-is-immutable.md): what the manager has
been shown is a fact about the match and nothing may change it. That is why nineteen tickets patched the
same family of defect without the pattern closing — the rule had never been stated.

The others: 02 and 03 by
[the match model shows only what it produces](../../../.agents/notes/proposed/architecture/2026-09-19-the-match-model-shows-only-what-it-produces.md)
— a screen may derive from the stream, never invent what the stream lacks; 06 by
[a keeper leaving always drags a stand-in](../../../.agents/notes/proposed/feature/2026-09-19-a-keeper-leaving-always-drags-a-stand-in.md);
07 below.

**Almost all of it is gated on ticket 31.** Requests 01, 03, 04, 06 and 08 change what a seed produces or
need a stored timeline to read. The backfill is the gate on the whole group's remaining work.

### Decision request 07 was the one that mattered, and it is answered

Match history **re-derives from seed and journal on every read**. That is what makes the simulation
deterministic and saves small — and it meant an engine rule change retroactively altered every saved
match that rule touched. A fix to a rule was therefore a rewrite of history.

Ticket 26 hit this directly: the engine lets a forced substitution bring back a dismissed player, the
fix is known, and shipping it would make saved Match Reports contradict their stored results. The
ticket was parked and the fix kept as a patch; ticket 29 was blocked the same way. Until 07 was
answered, **every engine-rule fix in this codebase was blocked**, not only Group G's.

**Answered 2026-09-19: a committed match stores its derived timeline.** Committed matches are frozen;
live matches still re-derive, so chunked resimulation and seed determinism are untouched. Recorded as
[a committed match stores its timeline](../../../.agents/notes/proposed/architecture/2026-09-19-committed-matches-store-their-timeline.md) and filed as group-g ticket 31.

The part of the answer that is easy to miss: **the backfill is time-critical.** Existing committed
matches must be backfilled under the *current* engine, so no engine-rule fix may land before ticket 31
— including the patch already written for ticket 26. Ship a rule change first and those timelines are
gone in practice. Tickets 26 and 29 are re-pointed at 31: blocked on a ticket now, not on a question.

## What this ledger leaves owed

- ~~**Five open decision requests.**~~ **All eight are answered as of 2026-09-19.** Group G has no open
  decision request, having had the largest cluster in the corpus.
- **Ticket 31 is the gate on all engine-rule work, and is itself now blocked.** Starting it on
  2026-09-19 found that **saves have no migration path at all** — `createSchema` runs once at career
  creation, `loadSave` does no DDL, and the repo contains zero `ALTER TABLE` statements and no
  `schema_version`. Every schema change so far has been an implicit "new saves only" that nothing makes
  visible, and the gate's "name the migration" step has been satisfiable by silence. Filed as ticket 32
  and written up in
  [saves have no migration path](../../../.agents/notes/proposed/architecture/2026-09-19-saves-have-no-migration-path.md).
  It needs a human call on whether a save survives a schema change.
- **Three tickets are not resolved**: 20 (`needs-info`, a command rewrites seen play), 26 (fix held as
  a patch, blocked on 31), 29 (blocked on 31).
- **A tracker defect, now fixed in the ticket but not at the source.** Ticket 29 read
  `ready-for-agent` while carrying a `Blocked by:` line. The frontier scan takes the lowest-numbered
  open, unblocked, unclaimed ticket — it reads the *status*, so it would have claimed 29 and an agent
  would then have discovered it could not proceed. 29's status is corrected to `blocked`. **Nothing in
  the tracker's own rules stops the pair recurring**, which is the part still owed: either the two
  fields should be one, or something should check them against each other.
- **Six match placeholders remain routed** — `matchRatings`, `matchPlayerStats`, `matchReplays`,
  `matchLatestScores`, `matchLiveTable`, `matchOppositionInstructions`. Screens 96 and 101 are `Parked`
  rather than disposed, so their placeholders should stay; the others need a ruling under M1 step 5.
  **Note that `matchReplays` and `matchOppositionInstructions` answer to no screen in this import**,
  the same mismatch Group D's `staff*` folders show.
