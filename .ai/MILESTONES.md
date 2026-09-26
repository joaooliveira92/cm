# Milestones

A milestone is a coherent outcome several efforts share, with an exit criterion a command can check.
It sits between [SPEC-ROADMAP.md](SPEC-ROADMAP.md) (which group, in what order, and why) and
[SPRINT-PLAN.md](SPRINT-PLAN.md) (which ticket, right now): the roadmap says D comes before C, the
plan says ticket 04 is next, and this file says what the two of them are adding up to.

One milestone is current at a time. The orchestrator does not start work outside it — see
[/milestone](../.opencode/command/milestone.md) for the command that reports progress and routes the
next effort within it.

| # | Milestone | State |
|---|---|---|
| M0 | The core loop | Shipped |
| **M1** | **The world is readable** | **Current** — opened 2026-09-18 |
| M2 | A season concludes | Sketched |
| M3 | The club's systems | Sketched |

---

## M0 — The core loop (shipped)

Recorded retrospectively, because it was built before this file existed. Career setup → league and
club selection → calendar advance → a Fixture played at the pre-match boundary → Match Report →
squad, tactics, training, scouting and transfers around it. Roughly 40 screens, 69 RPC procedures,
and `pnpm check:all` green on `dev` for the first time on 2026-09-18.

Its capabilities are in [TRACEABILITY.md](TRACEABILITY.md). It is listed here only so M1 has a
predecessor to be measured against.

---

## M1 — The world is readable

**Every routed screen shows real data or is deliberately gone.**

### The problem it closes

Two numbers, both measured 2026-09-18:

- The renderer has 96 screen files. **56 of them are WIP placeholders** — a route, a `data-focus-id`,
  a title and a badge, no domain logic — shipped by the `placeholder-wip-screens` effort so that the
  `g`-keys and the palette would stop dead-ending. They are slots, not screens, and in a route list
  they are indistinguishable from the 40 real ones.
- The pipeline has charted 13 of the 19 spec groups, but **only 4 carry a durable ledger** under
  `docs/specs/`: A, B, C (screen 38 only) and R. The rulings for D, E, F, G, H, I, J, K, L and M
  exist solely inside `.scratch/<effort>/`, which
  [the Group A ledger](../docs/specs/group_a_application_shell_and_game_lifecycle_remaining/RECONCILIATION.md)
  states outright is cleared when an effort is archived. That charting is one `rm -rf` from gone, and
  nothing outside `.scratch/` records that screens 69–79 were disposed or that 176–178 were deferred.

M1 fixes both against the same body of screens.

### Why this milestone and not another

- Groups C, D and L are **read models over data that already exists** — SPEC-ROADMAP says so in
  tiers 2 and 3. No new engine model, no chance-quality model, no morale model, no persisted-history
  store except where §Open questions flags it.
- None of it is blocked on a human. Group G's remainder is blocked on decision requests 01, 04, 05,
  06 and 07; Group P needs a model the engine does not produce; Group N and O are deferred by
  standing notes. C, D and L are the largest body of work with nothing in front of it.
- It retires **37 of the 56 placeholders** — the club, player, staff, competition and nation shells —
  which is the single biggest drop in the gap between what the app appears to do and what it does.

### Scope

| In | Screens | Standing |
|---|---|---|
| Group D — player and staff records | 50–68 | Charted 2026-09-14, 3 implemented, no durable ledger |
| Group C remainder | 33–37, 39–48 | Ledger covers 38 alone; the other 15 are marked `Not yet audited` |
| Group L remainder | 161–175, 179–180 | v1 scope is 161–164; 163 and 162 shipped |
| Durable ledgers | — | `docs/specs/group_<x>/RECONCILIATION.md` for x in d, e, f, g, h, i, j, k, l, m |

### Non-goals

Named so a sprint cannot drift into them:

- **National teams** — Group O and L 176–178. Deferred by
  [note](../.agents/notes/implemented/architecture/2026-09-13-national-teams-deferred-not-ruled-out.md).
  Their ledger rows are written as `deferred`; no screen is built.
- **Anything resting on Influence** — D 58 Happiness, D 60 Discipline, E 78–79, all of Group M.
  Ruled out for v1 in [CONTEXT.md](../CONTEXT.md). They get disposal rows, not screens.
- **Group G's live-match remainder.** Six match placeholders stay. They are blocked on open decision
  requests, and unblocking them is M2.
- **Ingesting N, O, P, Q or S.** The alphabetical spec-group fallback in
  [boot.md §0a](../.opencode/command/boot.md) would otherwise take Group N next, because `n` is the
  first letter with no `.scratch/` effort. The milestone's order wins over the alphabet.
- **New engine models.** If a screen needs one, it is a decision request, not a sprint.

### Sequence

Ledgers first, because they are the part at risk; then the player, which everything else links into.

1. ~~**Ledger durability sweep.**~~ **Done 2026-09-19.** All ten groups transcribed. 14 of the 19
   groups now carry a durable `RECONCILIATION.md`, against four when the milestone opened; the five
   without (N, O, P, Q, S) have no effort and no rulings to rescue, which was never this step's
   scope. It was
   transcription, not re-adjudication — but it found more than it expected to, because a summary that
   disagrees with the ticket beneath it is invisible until both are written down. See
   [SPRINT-PLAN](SPRINT-PLAN.md) for the findings; the durable rules it produced are
   [absence of a model is `deferred`](../.agents/notes/proposed/architecture/2026-09-19-per-player-statistics-deferred-not-ruled-out.md)
   and [a v1 exclusion is `deferred`](../.agents/notes/proposed/process/2026-09-19-a-v1-exclusion-is-deferred-not-out-of-scope.md).
2. **Group D remainder** — 50–57, 59, 61–68. Every other group in this milestone links into a player.
3. **Group C remainder** — 33–37, 39–42, 46–48. Club read models over D and the existing world data.
4. **Group L remainder** — 161, 164–175, 179–180. Competition and nation read models.
5. **Placeholder cull.** Every screen disposed in steps 1–4 loses its route, its nav entry and its
   file. A disposed screen that keeps its placeholder is the failure mode this milestone exists to
   end.

### Exit criteria

Each is checkable, and the first is a command:

1. `grep -rl "WIP" apps/desktop/src/renderer --include "*.tsx"` returns **no** `club*`, `player*`,
   `staff*`, `competition*` or `nation*` screen. Each is either real or deleted.

   **Status 2026-09-20: `competition*` and `nation*` are met; the rest is blocked on a human.** Ten
   WIP screens remain, down from 57, and every one has a named owner. Six are `match*` — Group G's
   live-match remainder, this milestone's own **non-goal**, so they are out of scope for the
   criterion as written. The other four — `clubSquadDetail`, `playerSearch`, `staffSearch`,
   `shortlist` — all wait on
   [Group I decision request 01](../.scratch/group-i-scouting-and-recruitment/decision-request-01-knowledge-limited-player-reads.md):
   each lists **players**, and every player outside the manager's club starts Unscouted, so none can
   be specified until that is answered. **This criterion cannot be met without that decision.**
2. `docs/specs/group_<x>/RECONCILIATION.md` exists and has a complete coverage table for x in
   c, d, e, f, g, h, i, j, k, l, m. **Met for d–m 2026-09-19.** ~~Outstanding: no row in group C's
   table may read `Not yet audited`~~ — **met 2026-09-19**, group-c ticket 05 disposed all twelve.

   **Two ledgers still carry `Not yet audited` rows: F and K, and neither is a gap in this
   criterion.** The criterion asks that the ledger *exist with a complete coverage table*, and both
   do — every screen has a row. A row reading `Not yet audited` is the ledger doing its job, which
   for these two groups is to record a gap rather than a decision; both files say so in their own
   preamble.

   Neither group is in M1's sequence. Group F's remainder needs its decision request 01 answered and
   an effort chartered from scratch, both human calls. **Group K is wholly unstarted** — checked
   2026-09-20: its effort has a `map.md` whose Decisions-so-far is `<!-- none yet -->`, no spec, no
   tickets, and no screen in 147–160 has been read. Charting it is a different milestone's work, and
   starting it here would be exactly the drift
   [AUTONOMOUS-AGENT](AUTONOMOUS-AGENT.md) § Sprint creation warns about: preferring a clean new
   effort to the fog already owned.
3. No route, nav entry or `g`-key binding points at a screen ruled out in those ledgers.
4. `pnpm check:all` green, and `pnpm --filter @cm-clone/desktop test:e2e` green.
5. [TRACEABILITY.md](TRACEABILITY.md) has a row for each read model shipped, with its proving test.
   **Met 2026-09-20** for everything this milestone shipped: six rows added covering the club-scoped
   screens, their own-club resolvers, the Board Objective read and its subject-existence exception,
   the competition surfaces, seeded test worlds, and the mid-creation quit discard.

### Open questions

These need a human, and are the known ways M1 can stall. Raise each as a decision request
(`templates/decision-request.md`) rather than deciding it in a sprint:

- ~~**C 43–45 — History, Records and Honours need persisted season history.**~~ **Confirmed
  2026-09-19**: they follow Group Q rather than carving a history store inside M1, and are out of this
  milestone's scope. The M1 sweep since found three more screens waiting on the same persisted-history
  gap — [Group D 55](../docs/specs/group_d_player_and_staff_records/55_player_history.md) and
  [Group L 172 and 173](../docs/specs/group_l_competitions_nations_and_world_information/RECONCILIATION.md)
  — which strengthens the call: the store is one piece of work serving six screens across three
  groups, and it belongs to whoever builds it, not to a club-information sprint.
- **Group I decision request 01 — knowledge-limited player reads** gates D 68 Scout Report, **C 35
  the any-club squad** (found 2026-09-19: the first Group C screen that lists players rather than
  facts about a club), and
  SPRINT-PLAN records it gating Group J 132, 134 and 137 too. D 68 is in scope and blocked until it
  resolves.
- ~~**Claimed tickets may be abandoned locks**, hiding work from the frontier scan.~~ **Closed
  2026-09-18.** The sweep found two, not the six the plan carried: `club-staff-presence` 03 and 05,
  both stale locks over shipped work, resolved against the tree. M1's queue is trustworthy.

---

## M2 — A season concludes (sketched)

Group G's live-match remainder plus Group Q: awards, the season rollover, and the board's verdict on
its objectives. Gated on decision requests 01, 04, 05, 06 and 07 — chiefly 07, which asks how engine
rules may change without making saved Match Reports contradict their stored results, and which gates
every engine-rule fix in Group G.

## M3 — The club's systems (sketched)

The remainder of H, I, J and K — training depth, recruitment, negotiation and the board — then P,
which needs the accumulated statistics the three of them produce. Group K is charted to `map.md` only
and has no tickets.

---

## Keeping this current

The current milestone's row moves to `Shipped` when every exit criterion is met, in the commit that
meets the last one. A new milestone is chartered by a human, not by the orchestrator: `/sprint` may
finish a milestone and report that it is out of work, and may not open the next one.

Progress belongs in [SPRINT-PLAN.md](SPRINT-PLAN.md) and shipped capability in
[TRACEABILITY.md](TRACEABILITY.md). This file records the target and the exit criteria, and should
not accumulate status.
