# Sprint Plan

**Milestone: M1 — the world is readable.** Every routed screen shows real data or is deliberately
gone: Groups C, D and L remainder, plus a durable `docs/specs/` ledger for every group the pipeline
has already charted. Scope, non-goals and exit criteria in [MILESTONES.md](MILESTONES.md); it is the
bound on what a sprint may start, and the frontier below is checked against it by
[/milestone](../.opencode/command/milestone.md).

**M1 step 1 — ledger durability sweep, 4 of 10 done (2026-09-18).** Group L transcribed to
[`docs/specs/group_l_competitions_nations_and_world_information/RECONCILIATION.md`](../docs/specs/group_l_competitions_nations_and_world_information/RECONCILIATION.md),
with two corrections. Its `map.md` says "all 18 screens (161–180)" twice and there are twenty. More
seriously, the map files national team management under § Out of scope, four days after a standing
note ruled Group L 176–178 `deferred` and **never** `out-of-scope`; the ledger follows the note. The
same slip runs through ticket 02, whose "out of scope for v1" is `deferred` in ledger vocabulary —
so no screen in Group L is `out-of-scope` at all.

It also surfaced a disagreement between two ledgers: per-player statistics aggregation does not
exist, and Group D Screen 54 is `out-of-scope` for lacking it while Group L Screen 166 is `deferred`
for lacking it. `out-of-scope` is the one that does not come back. Worth settling when Group P is
charted.

Group F was the one group with
nothing to transcribe: its effort shipped Screen 80 with no map and no spec, and screens 81–90 have
never been read. Its ledger says so — one `Reviewed` screen, ten `Not yet audited` — because a group
whose gap is invisible is the thing M1 step 1 is for. Charting Group F's remainder needs decision
request 01 answered and an effort chartered from scratch; both are human calls.

Group E transcribed to
[`docs/specs/group_e_squad_management/RECONCILIATION.md`](../docs/specs/group_e_squad_management/RECONCILIATION.md).
It found a contradiction in shipped code: Group E ruled Screen 75 Set Piece Takers `out-of-scope`,
while `contracts/src/schemas/tactics.ts:204` and the shipped Tactics Overview both say set pieces
arrive with Group F Screen 86. Raised as **group-f decision request 01**, which blocks Group F's
remainder and nothing else. Also corrected: this plan recorded group-e as "11 screens charted, all
disposed" — three are satisfied by the shipped Squad screen, two are partial, six are disposed.

Group D transcribed to
[`docs/specs/group_d_player_and_staff_records/RECONCILIATION.md`](../docs/specs/group_d_player_and_staff_records/RECONCILIATION.md).
Remaining: E, F, G, H, I, J, K, L, M. Transcription caught two miscounts in group-d's `map.md`
summary (53 is `out-of-scope`, not satisfied-inline; three screens are deferred, not two) and one
unfiled obligation: eleven disposed Group D screens still carry routed WIP placeholders, which
ticket 04 said to ticket and nobody did. That is M1 step 5, and the ledger records it so it cannot be
lost twice. The three `staff*` folders answering to no import screen need a ruling, not a deletion.

**Two blocking decisions were approved 2026-09-19**, and both were the same mistake — a missing model
recorded as a permanent ruling.

- **Set pieces ship, as Tactic fields.** group-f decision request 01 answered: Group E Screen 75 moves
  from `out-of-scope` to `deferred`, anchored to Group F Screen 86, and Group F's remainder is
  unblocked. Nomination inherits group-f ticket 01's revision-bound idempotent save rather than adding
  a write path. Whether the match engine *uses* a nomination is deliberately still open. Note:
  [set pieces ship, as a Tactic field](../.agents/notes/implemented/feature/2026-09-29-cm-set-pieces-in-templates-takers-on-the-tactic.md) (superseded by that note).
  Owed before Screen 86 builds: a schema addition and migration, with existing Saves reading `"none"`.
- **Per-player statistics are deferred, not ruled out.** Group D Screen 54 moves from `out-of-scope` to
  `deferred`; Group L Screen 166 was already right. Group P owns the store, and Screens 54, 166, 167
  and most of 222–235 are its dependents rather than its contradictions. Note:
  [per-player statistics are deferred, not ruled out](../.agents/notes/proposed/architecture/2026-09-19-per-player-statistics-deferred-not-ruled-out.md).

**The generalisable rule both produced**, now in both notes: when reconciling a screen, absence of a
model is `deferred` unless something states the model should never exist. `out-of-scope` needs a reason
the thing should not be in the game, not merely the observation that it is not there yet. Three of the
four corrections M1 step 1 has found so far are this error.

**M1 step 1 is COMPLETE — 10 of 10 (2026-09-19).** Every group that had rulings to make durable now
has a `RECONCILIATION.md`: **14 of the 19 groups carry one, against four when the milestone opened.**

The five without — N, O, P, Q and S — have no ledger because they have **no effort and were never
ingested**: nobody has read a screen in any of them. That was never step 1's scope, which was to
rescue rulings trapped in `.scratch/`, and there are none to rescue. Their gap is visible in
[SPEC-ROADMAP](SPEC-ROADMAP.md) § Where each group stands, which is the right place for it.

**Group G was last and least typical.** Every other group's ledger records what was decided not to
build; G's records what building it revealed — nine screens shipped, nineteen follow-up tickets, eight
decision requests. Its centre of gravity is the engine questions, not the disposal table.

**The most consequential finding of the whole sweep was group-g decision request 07, and it is now
answered.** Match history re-derives from seed and journal on every read, so an engine rule change
retroactively altered every saved match that rule touched — which blocked every engine-rule fix in the
codebase, not only Group G's. Ticket 26 hit it head-on: the engine lets a forced substitution bring
back a dismissed player, the fix is written, and shipping it would make saved Match Reports contradict
their stored results.

**Answered 2026-09-19, Option B: a committed match stores its derived timeline.** Committed matches are
frozen; live matches still re-derive, so chunked resimulation and seed determinism are untouched.
Recorded as
[a committed match stores its timeline](../.agents/notes/implemented/architecture/2026-09-19-committed-matches-store-their-timeline.md)
and filed as **group-g ticket 31, `ready-for-agent`**.

**Ticket 31 is the most time-sensitive ticket in the repo.** Its backfill has to run under the *current*
engine: every engine-rule fix that lands first destroys the original timeline of every saved match it
touches, recoverable only by checking out the old engine and replaying. Three written fixes are waiting
behind it. **No engine-rule fix may land before 31** — ticket 26's patch included. Tickets 26 and 29 are
re-pointed at 31: blocked on a ticket now, not on a question.

Decision requests 01, 04 and 06 are unblocked in the same sense — each still needs its own answer about
what the engine rule should *be*, but an answer can now be acted on.

Also found: Screens 96 and 101 are `Parked`, not `deferred` — they wait on a *formula nobody has
chosen*, and the real blocker is a data-model gap, since the Match Event stream names no goalkeeper or
defender contribution, so an event-derived rating would systematically under-rate half the team.

**A tracker defect, fixed in the ticket but not at the source**: group-g ticket 29 read
`ready-for-agent` while carrying a `Blocked by:` line. The frontier scan reads the status, so it would
have claimed a blocked ticket. 29 is corrected to `blocked`. Nothing in the tracker's own rules stops
the pair recurring, which is what is still owed — either the two fields should be one, or something
should check them against each other.

Groups H, I and J were added earlier the same day, and
they were the easy three: each had already written its scope ruling as an **Agent Note** rather than
leaving it in `.scratch/`, so the decision behind every row already outlived its effort. All three used
`deferred` correctly, before the rule existed to require it. What they lacked was only a per-screen
coverage table.

Three findings from them are worth carrying:

- **Group I's survey recorded a live contradiction in shipped code**: the transfer market shows exact
  figures for unscouted Players, while the Scouting Knowledge screen withholds them. group-i decision
  request 01 is the most far-reaching open question in the sweep — it gates Group D 68, Group I 119 and
  129, and Group J 132, 134 and 137.
- **Group J's import assumes a different game.** Six screens rest on multi-round negotiation that this
  game's single-round **Bid** and never-renegotiated **Contract** do not have. Not gaps — different
  rules.
- **Group J Screen 140 is built and withheld**, held as a patch pending group-j decision request 01
  (can a Contract be renewed while it still has years to run). The cheapest unblock in the sweep: one
  rule question between a finished patch and a shipped screen.

**One correction to my own earlier work**: spec-ledger-kinds decision request 01 listed "137–140" as
resting on the `CONTEXT.md` v1 exclusion. Screen 140 Contract Renewal is in v1 and `renewContract`
ships — the exclusion covers *negotiation*, so it reaches 137–139 and stops.

**Only Group G is left in step 1.** It is the heaviest: 14 screens, ~30 tickets, eight decision
requests.

Groups K and M added earlier the same day. They are
opposites: Group M's effort closed cleanly and is the one group transcription did not have to correct,
while **Group K has no rulings at all** — a `map.md` whose Decisions section reads `<!-- none yet -->`,
no tickets, no spec, fourteen screens unread. Its ledger records that gap.

**The third and largest decision request was answered 2026-09-19: `deferred`.** A recorded
`CONTEXT.md` v1 exclusion is `deferred`, not `out-of-scope`, with the exclusion named in the Anchor
rather than a fifth kind being added. Recorded as
[a v1 exclusion is `deferred`, not `out-of-scope`](../.agents/notes/proposed/process/2026-09-19-a-v1-exclusion-is-deferred-not-out-of-scope.md),
which amends the ledger-format note: the four kinds were defined without saying how to choose between
two of them in the commonest case.

**The rule is now complete, and it is the main durable output of M1 step 1 so far:**

> Absence of a model is `deferred`. A version boundary is `deferred`. Only a design statement that the
> thing should not exist is `out-of-scope`.

Applied the same day across two groups, in two passes with different authority — this decision moved
Group D 58 and Group E 78 and 79 and confirmed Group M's thirteen; the already-approved absence rule
moved Group D 53, 59, 60 and 63 and Group E 73, 74, 76 and Screen 77's eligibility half. Group D now
reads 4 `out-of-scope` (the closed staff role set), 2 `renamed`, 10 `deferred`, 3 implemented, and
**no screen in Group E is `out-of-scope` at all**.

**Group K is unblocked**; charting it is a human's call. Remaining in M1 step 1: G, H, I, J.

**EVERY DECISION REQUEST IN THE REPO IS ANSWERED (2026-09-19).** All 18 files under `.scratch/`, across
six efforts. The queue is empty. Decided under the human's standing delegation; every answer carries its reasoning,
and each is reversible by overturning its note.

The four that mattered most, and why:

- **group-g 01, 04, 05, 08 were one question.** Settled as
  [revealed play is immutable](../.agents/notes/implemented/feature/2026-09-19-revealed-play-is-immutable.md):
  what the manager has been shown is a fact about the match and nothing may change it. A live
  `ChangeTactics` touches only Team Instructions; a substitution may bring on only an unused bench player;
  the revealed position is durable across a restart; a command takes effect at M+1, never at a revealed
  minute. **This is why nineteen tickets patched the same family of defect without the pattern closing** —
  the rule had never been written down.
- **group-i 01 was the widest.** Knowledge-limits move into the shared Player read, so the market,
  `BidComposer`, Player Search and Target Comparison cannot disagree. `CONTEXT.md`'s **Listed** loses its
  pre-Scouting "full-information Transfer Value" clause in the same commit. Unblocks five screens across
  three groups, and comes with a real design consequence: a manager bids against an estimate that narrows
  by scouting.
- **group-j 01 unblocks a finished screen.** A Contract renews only in its last contracted year. Ticket
  04's implementation is written and reviewed — it needs the guard, a typed refusal, and one test inverted.
  The cheapest screen in the backlog.
- **group-l 01 turns a thrice-shipped defect into a compile error.** `SqlError` gets one escape hatch in
  the handler type rather than 50 contract unions, which unblocks ticket 05's type-alias gate. The four
  engine errors are split on **agency, not severity**: `SquadTooSmallError` is a domain error a manager can
  act on; the other three are defects and get `orDie`.

Also answered: **group-g 02** (unsimulated statistics stay named as unavailable — zero is a claim, and
this is the same ruling as Group L's `Unplayed`), **group-g 03** (a **Match Rating** is an event rating
plus phase share, read from the stored timeline; Option C is now safe after ticket 31 and is the end
state), **group-g 06** (a red-carded keeper drags a stand-in, like an injury), **group-h 01** (Coach
*quality*, relabelled — the relabel is the load-bearing half), **group-h 02** (`PlayerDeveloped` carries
its baseline; it cannot be backfilled, so existing saves keep a blind first Season and need an explicit
no-comparison state), and **group-j 02** (*not yet* — `db/schema.ts` requires an index to be measured, and
approving on a query plan would break the rule the index-count test enforces; Option A is pre-approved for
the next scale-probe run).

Two more were found by checking rather than by listing: **group-g 06** (a red-carded keeper drags a
stand-in — the note was written but the answer had not been appended) and **desktop-suite-red 01**, which
was not on the working list at all. The latter is answered **Option A**: a career destination is
top-level when the navbar reaches it from anywhere with a save, moving six screens into
`CAREER_SCREEN_TYPES` — and, more importantly, deriving the expected set from `nav-config.ts` so ticket
06's guard *checks* the classification instead of merely forcing one. One fact had changed in Option C's
favour since it was filed: `navbar-keyboard-intent` already made `nav-config.ts` the derivation source
for the keyboard spine, so half of C's work is done.

**Ticket 31 is the gate on most of it.** Requests 01, 03, 04, 06 and 08 either change what a seed produces
or need a stored timeline to read. Nothing in Group G's engine work can land before the backfill.

**STOPPED ON A FINDING, 2026-09-19: saves have no migration path.** Found while starting ticket 31.

`createSchema` runs once, at career creation — one call site, `beginCareer`. `loadSave` performs no DDL.
The repo contains **zero `ALTER TABLE` statements** and **no `schema_version`** anywhere. A save file's
schema is written once and never changed again, so every schema change to date has been an implicit
"new saves only" that nothing makes visible.

**Why it went unseen**: a save-compatibility test creates its save under the *current* schema, so no
test can fail on this — catching it needs a fixture holding an older save file, and none exists. And
[/gate](../.opencode/command/gate.md) step 4 asks the gate to "name the migration", which has been
satisfiable by silence because there is nothing to name.

**Ticket 31 is blocked on it**, and was not quietly narrowed to new-saves-only: its backfill exists *for
matches that already exist*, so scoping it down would leave exactly the matches it protects unprotected.
Filed as **ticket 32, `ready-for-human`**, since the question is what a save *is*:

- **Durable** — `schema_version`, ordered upgrade steps on open, and a fixture holding an old save so the
  path is proved. The only answer under which 31's backfill means anything.
- **Disposable during development** — refuse a save written under an older schema, with a message. The
  smallest honest answer; it makes today's behaviour explicit instead of silent. Forecloses shipping to
  anyone with a career in progress, which is a product call.
- **Status quo** — recorded only to be rejected: it is what everyone has been doing and nobody chose.

Written up as
[saves have no migration path](../.agents/notes/proposed/architecture/2026-09-19-saves-have-no-migration-path.md).

**Two of 2026-09-19's decisions are marked provisional** on their persistence clauses — the committed-match
timeline, and the persisted revealed position. Their *rules* stand; only how they reach an existing career
is in question. The `PlayerDeveloped` baseline is unaffected: additive JSON in an existing column is the
one schema change this codebase can currently make to a live save.

**Still unblocked and needing no migration**: group-j ticket 04 (contract renewal — code written, needs a
guard and a test), Screen 113's two rows, and the group-i knowledge-limit read, which is the largest
single unblock and touches no schema.

## Immediate next action

**react-compiler-adoption 01, 02 and 03 resolved 2026-10-05.** 01 cleared 104 `react/refs` findings
across 17 files; 02 cleared 27 `react/set-state-in-effect` findings across 25 files; 03 cleared 25
`react/exhaustive-effect-dependencies` findings across 21 files and removed the renderer's 9
`eslint-disable-line react-hooks/exhaustive-deps` comments. All three rules are `error` with zero
findings and `pnpm check:all` is green. See [report](reports/react-compiler-adoption.md). 02's first
pass hid eight sites behind a microtask and was rejected by review as a lint dodge; the repaired
version derives the loading state during render from a keyed read store. The 12 vendored
`components/reui/` `-next-line` suppressions stay in bucket 07.

**Group-j 10 and training-schedule-and-delegation 04 resolved 2026-10-05.**
**player-positional-model 19 moved to `needs-triage`** — its premise that "no code reads the legacy
projection" is false (ten-plus live call sites remain), so a human must re-scope or split it before it
is buildable; it is no longer a build ticket.

The next open, unblocked, unclaimed build tickets across all live efforts are now:

1. [react-compiler-adoption 04](../.scratch/react-compiler-adoption/issues/04-todo-diagnostics.md) —
   **`react/todo`**, ready-for-agent.
2. [react-compiler-adoption 05](../.scratch/react-compiler-adoption/issues/05-memo-dependencies.md) —
   **`react/memo-dependencies`**, ready-for-agent.
3. [react-compiler-adoption 07](../.scratch/react-compiler-adoption/issues/07-small-buckets.md) —
   **small buckets** (incl. the 12 vendored `rule-suppression` sites), ready-for-agent.
4. [react-compiler-adoption 08](../.scratch/react-compiler-adoption/issues/08-oxc-transform-react.md) —
   **`oxc-transform-react`**, ready-for-agent.
5. [package-extraction 03](../.scratch/package-extraction/issues/03-extract-rpc-client-package.md) —
   **Extract `@cm-clone/rpc-client`**, ready-for-agent, but carries a deliberate
   decide-before-starting caveat.

Six filed findings await triage (not build tickets): desktop-suite-red 21, navbar-keyboard-intent 05
and 06, match-engine-detail 20, formations-and-instructions 36, player-positional-model 19.

Before calling a red e2e run a regression, check `pmset -g log` for a sleep inside its window, and
remember that e2e is outside `check:all`. The desktop unit suite has a load-sensitive timing flake in
`leagueSelection/screen.test.tsx` ("issues one request for a burst of rapid changes") that reproduces
on a clean tree under `pnpm -r test` load and passes in isolation — not a regression when seen.
2. **Group G 42 resolved 2026-09-27** (`eeff2cd8`): Quick result skips the live reveal.
3. **Queue refilled 2026-09-28 from two human rulings.** In order:
   [group-e 04](../.scratch/group-e-squad-management/issues/04-attribute-threshold-filter.md)
   (attribute threshold filter, **shipped 2026-09-28**), then the squad-instructions remainder chartered
   in [its 01](../.scratch/squad-instructions/issues/01-reconcile-the-loose-squad-instruction.md):
   [02](../.scratch/squad-instructions/issues/02-contract-view.md) (Contract view, which widens
   `SquadPlayerView`, **shipped 2026-09-28** in `fac74447`),
   [03](../.scratch/squad-instructions/issues/03-match-day-column-in-the-table.md)
   (match-day column in the table), and [04](../.scratch/squad-instructions/issues/04-sort-control-for-the-position-list.md)
   (Sort for the position list, **shipped 2026-09-29**), and [05](../.scratch/squad-instructions/issues/05-empty-slot-prioritises-fitting-players.md)
   (an empty lineup slot brings the players who fit it to the top). **Next: squad-instructions 05.**

   **squad-instructions 03 is a stale `claimed` lock and needs a sweep.** It has carried `claimed`
   since 2026-09-28 with no `## Comments` and no work attributable to it, and the match-day column it
   describes is in fact in the tree — `squadColumns.tsx:211-226` builds the column from a `matchDay`
   option, `SelectionIndicator.tsx:67` exports the shared `MatchDayCell`, and `useSquadTable.ts:66`
   wires them. So it is a lock over work that is either done or in flight, and the frontier scan skips
   it either way. Resolve it against the tree when the effort closes, as group-i 12 was.

   **Ticket 04 shipped `SquadSortSelect`** — the toolbar's Sort, list layout only, running the shared
   `cycleSort` through the screen's own `onSortCycle`, so it is the header's control relocated rather
   than a second sort model. Two departures from the ticket, both in its `## Answer`: option labels
   come from the shared header map (`Positions`, `OVR`) so an option cannot disagree with the header
   it mirrors, and `Positions` orders alphabetically by the rendered string, which is pre-existing and
   deliberately left alone while
   [player-positional-model](../.scratch/player-positional-model/issues/08-compact-position-label.md)
   settles what that string is. The review caught a **contradicted Agent Note** — the squad view
   selector note had listed this control as deliberately omitted, with a rationale the code disproves
   — corrected in the same commit, which is why the note now argues the list needs the control rather
   than the other way round. `check:all` green on 2423 desktop tests, e2e 68 of 68.
   [Report](../.ai/reports/squad-instructions.md).
4. **The knowledge-limited Player reads are all four shipped**, and **both efforts' queues are empty**
   (group-i 12/12, group-j 9/9). [group-i 12 — Transfer Target Comparison](../.scratch/group-i-scouting-and-recruitment/issues/12-transfer-target-comparison-reads-by-scouting-progress.md)
   shipped in `eed6ce49` and had been sitting at `claimed` ever since — a stale lock over completed
   work, resolved 2026-09-26 against the tree, not the commit message. [group-j 09 — Player Contract
   Offer](../.scratch/group-j-transfers-contracts-and-negotiations/issues/09-player-contract-offer-reads-by-scouting-progress.md)
   was the last of the four and shipped 2026-09-26; its review found that the ticket's wage band
   contradicts ADR-0005's wage clause and `CONTEXT.md`, now
   [decision request 03](../.scratch/group-j-transfers-contracts-and-negotiations/decision-request-03-is-a-wage-offered-inside-a-knowledge-band.md)
   (recommends Option A). **M1 exit criterion 1's four named WIP screens are three now** —
   `staffSearch` and `shortlist` remain, both waiting on models rather than on this decision.
5. **gate-red-on-dev**: [07](../.scratch/gate-red-on-dev/issues/07-youth-intake-at-rollover.md) (the Youth
   Intake squad floor) and [08](../.scratch/gate-red-on-dev/issues/08-short-squad-advisory.md) (its readiness
   advisory) shipped 2026-09-22, [note](../.agents/notes/implemented/feature/2026-09-21-a-youth-intake-is-the-squad-floor.md)
   implemented, and [09](../.scratch/gate-red-on-dev/issues/09-player-ages-read-the-game-date.md) (ages read the game date, not the
   wall clock), [10](../.scratch/gate-red-on-dev/issues/10-promoted-squads-sign-contracts.md) (promoted squads
   sign Contracts) and [11](../.scratch/gate-red-on-dev/issues/11-conjured-squads-are-age-correct.md)
   (conjured squads are born for the Season they join). **The effort's queue is empty.**

Groups P, Q and S were scoped on 2026-09-21 and build nothing for v1; Group Q's 243 already ships as
Season Summary.

**Where M1's exit criteria stand.** Criterion 2 is met: Group C's twelve are disposed, and F and K —
the two ledgers still carrying `Not yet audited` rows — are not gaps in it. The criterion asks for a
ledger that *exists with a complete coverage table*, and both have one; a `Not yet audited` row is
those two files doing the job their preambles describe, which is to record a gap rather than a
decision. **Group K was checked on 2026-09-20 and is wholly unstarted** — `map.md` with
`<!-- none yet -->`, no spec, no tickets, no screen read — and charting it belongs to a different
milestone. Criterion 4 is met (`check:all` green; e2e green, 56 on 2026-09-21; the four
[desktop-suite-red 15/16](../.scratch/desktop-suite-red/issues/) tickets are queued — see the
[report](reports/group-i-scouting-and-recruitment.md)). Criterion 5 is
met as of 2026-09-20 — six traceability rows were owed for this milestone's read models and had been
accumulating unwritten; `getPlayerSearch` and `getClubSquad` add their rows on 2026-09-23. Criterion 1
is met for `competition*` and `nation*`; two of the other four named WIP names — `clubSquadDetail`,
`playerSearch` — shipped 2026-09-23, leaving `staffSearch` and `shortlist` (both waiting on models,
not the knowledge decision), and six `match*` screens are an explicit non-goal.

**WIP placeholders: 57 → 10**, and every one of the ten has a named owner.

**The competition branch is complete and reachable** (group-l ticket 10). World → Competitions lists
every competition in the save, each row opening its Overview, which links to Table, Fixtures and
Results. The e2e spec walks that whole journey with **nothing addressed by URL**, which retires the
by-address entries the earlier competition specs used. **e2e 55 passed**, 2090 desktop tests.

**Two screens were removed rather than built, and the reasoning is in the ledger.** *Clubs* — no
import screen asks for an all-clubs browse, a full pyramid is sixteen thousand clubs, and a flat
list needs search machinery that does not exist (Player Search is itself deferred behind a decision
request). A club is reached through a competition's table, which now has a way in. *Nations* — every
nation screen Group L charted is `deferred`, so the list would link to nothing but dead ends. The
World section has one entry now, which is the honest shape.

**The 600-line ceiling fired on `rpcServer.ts` and splitting beat exempting.** `contracts/rpc.ts`
has an exemption reading "RPC method registry; grows linearly with endpoints", and this is that
registry's other half — but it is 440 lines of *implementation*, and implementations group. Now
`rpc/browseHandlers.ts` holds the eight surfaces reached with a target in hand; the map stays
exhaustive because `rpcServer.ts` spreads it in before typing the whole.

**The Group L cull is done** (ticket 09): eighteen placeholders deleted, three kept. **WIP
placeholders across the renderer are down from 33 to 13**, and every one of the thirteen now has a
named owner — `clubSquadDetail` (blocked on a decision request), the three World entries (ticket
10), six `match*` screens (an explicit M1 non-goal), and three Group I screens.

**The discriminator is now written down and has been applied twice**, which is what makes it a rule
rather than a judgement: *a `deferred` screen keeps its stub when it is waiting on a live piece of
work, and loses it when it is merely wanted some day.* None of the eighteen was waiting on anything
in progress.

The whole ten-screen nation branch went, and its parent route, `CareerNationChildView` and
URL-segment map with it. One thing worth carrying forward: `nationCompetitions` was imported under
an **alias**, so a name-based regex sweep skipped it and the typechecker caught it. An aliased
import survives that kind of sweep.

**Screen 161 ships** (ticket 08), and with it the competition branch has internal navigation for the
first time: three buttons reaching Screens 162, 163 and 164, none of which was reachable from
anywhere before. **e2e 55 passed**, 2081 desktop tests.

**It needed a read, and the reason is worth keeping.** No existing view names a competition —
`LeagueTableView` is `{ season, standings }`, `FixturesView` is `{ season, fixtures }` — so a hub
composed purely of its siblings could not title itself. `getCompetitionOverview` returns identity,
season and three counts and **no rows**: the standings, the card and the results stay on the screens
that own them. That honours what "compose, don't reimplement" was protecting.

`CompetitionNotFoundError` is new, because this is the first competition-scoped read that needs the
distinction — `getCompetitionFixtures` answering an unknown competition with an empty list is right
for a card and wrong for a landing page.

One practical note: **an unscoped `getByText` competes with the persistent shell.** The first e2e
failed because `Played` matched both the screen's figure label and the chrome's identity band.
Scope to the screen's `<main>`.

**Screen 164 ships** (ticket 07). `CompetitionResultsScreen` reads `getCompetitionFixtures` and
filters to played, reversed — no fourth fixture read, as ticket 06 instructed. 163 and 164 share an
extracted `CompetitionFixtureTable`. **e2e 54 passed**, 2063 desktop tests.

**Two findings from building it, neither the screen's fault.**

*The competition branch is unreachable.* 164 has no entry point, and neither do 162 and 163, which
shipped on 2026-09-17 in the same condition — the World section's Competitions entry is itself a WIP
placeholder. Same shape as the Club → Staff defect group-c ticket 02 fixed. Ticket 08 builds the
landing page and ticket 09 rules on `competitions/`; between them they owe the way in.

*Competition Results shows the current Season only*, inheriting `getCompetitionFixtures`' season
scope — so a rollover empties it, and there is currently nowhere to see a past season's results
(Screen 172 Competition History is `deferred`). Screen 163 has had the same property since it
shipped. Recorded, not fixed.

One practical note for the next e2e that wants played football: **pressing Continue does not work.**
The Calendar stops before the human's own Fixture and the control is *replaced* there rather than
disabled, so a press loop times out on a button that no longer exists. Use `seedBeforeSeasonEnd`;
`seedConcluded` lands in Season 2 pre-season, where the current card is unplayed.

**M1 step 4 is smaller than it looks and is now ticketed.** Group L's ledger has no `Not yet
audited` row and no open decision ticket: of its twenty screens, 162 and 163 shipped on 2026-09-17,
eleven are `deferred in full`, and **only 161 and 164 are "in v1, not built"**. Ticket 06 named the
order and the effort closed without filing them; they are tickets 07 and 08 now.

**Ticket 09 is the interesting one.** Group L's eleven deferred screens keep WIP placeholders, and
the ledger warned that *the cull must distinguish a deferred screen's placeholder from a disposed
screen's*. Group C answered that question twice in opposite directions and the discriminator is now
written down: a `deferred` screen keeps its stub when it is **waiting on a live piece of work**
(`clubSquadDetail`, blocked on a decision request) and loses it when it is merely wanted some day
(`clubReservesDetail`, whose model is excluded from v1). Ticket 09 also inherits `clubs/`, which
group-c ticket 09 ruled to be Group L's.

Ticket 07 carries one standing instruction worth honouring: **reuse `getCompetitionFixtures`, do not
add a fourth fixture read.** There are three now — the human's calendar, a Competition's card, and a
club's matches — and each answers a question the others cannot. "The played subset of a card" is not
one of those.

**Group C is built out except Screen 35, which is blocked on a human.** Tickets 06, 07, 08 and 09
all shipped. **e2e 53 passed**, 2058 desktop tests.

**Screen 35 revealed a limit of the club-scoped rule that matters beyond this group.** An any-club
squad is the first Group C screen that lists **players** rather than facts about a club — and
`CONTEXT.md` § Scouting Progress says every player outside the manager's club starts Unscouted. So
the rule's premise, *a Club carries no hidden value of its own*, holds for the club and **not** for
the players in it. Screens 34, 38, 39, 40 and 42 were safe precisely because none of them lists
players.

That makes Screen 35 a knowledge-limited player read, and
[group-i decision request 01](../.scratch/group-i-scouting-and-recruitment/decision-request-01-knowledge-limited-player-reads.md)
already owns that question — it records that `MarketPlayerView` carries exact figures while
`CONTEXT.md` says they should be ranges, and that *"CONTEXT.md also disagrees with itself."* C 35 is
now its **fifth** dependent alongside D 68 and J 132, 134, 137, and MILESTONES records it.

**M1 exit criterion 1 is now a precise statement rather than a backlog** for `club*`: three WIP
screens remain and each has a named owner — `clubs/` and `nationClubs/` are Group L's,
`clubSquadDetail/` is ticket 10's. A placeholder for a screen that is *arriving* is the one case
where the stub is not a lie.

**Screens 39 and 47 ship** (ticket 08). `ClubFinancesDetailScreen` club-scoped with `finances/` as
its own-club resolver, and `BoardConfidenceScreen` save-scoped and staying that way. **e2e 53
passed**, 2059 desktop tests.

**The scoping decision for 47 is now proven, not just argued.** A test asserts directly against the
schema that **no club but the manager's has a board objective row**. If a future change gives rival
clubs objectives, that test fails — which is exactly when someone should be told the rule's
exception needs revisiting.

Also settled: Club Finances is **not** a different screen from Budget Review. Both show the same
four figures and both now render a shared `BudgetFigures`; they differ only in where they sit.
Income, expenditure and projections are absent rather than zeroed, with a test asserting none of
those words appears.

**Screens 40 and 42 ship** (ticket 07). `ClubFixturesDetailScreen` and `ClubTransfersDetailScreen`,
each titled with the club and marking one that is not the manager's. **e2e 50 passed**, 2040 tests.

Three things worth carrying forward. The own-club list bodies were **extracted, not copied** —
`FixtureDayList` and `TransferEntriesTable` are now rendered by both screens, which is what stops a
pair drifting the way Screen 34's did. The nav entries needed **no resolver**: unlike Screens 38 and
34, `fixtures` and `transferHistory` already had working own-club screens, so a resolver would have
wrapped a screen that renders the same component. And declaring the new views in `schemas/clubs.ts`
**closed an import cycle** — `transfers.ts` already imports `ClubSummary` from there — which
surfaced as an unrelated schema failing to initialise in `squad.ts`. Each view now lives where the
dependency already flows, with a comment saying why.

**Ticket 07 was started and reverted, and the finding is the deliverable.** The code was
backend-only — two RPCs and handlers, typechecking green — and reads with no screen behind them are
dead code, so it went back rather than being committed half-built.

**Screen 35 Squad is not "the same screen with gated affordances".** `renderer/squad/` is 2044 lines
across thirteen files: a provider, drag handling, lineup edits, selection, announcements, a session
hook. It is a lineup *manager*; an any-club squad is a roster, and `fixtures/` (113 lines) is what a
read-only club surface actually costs. **This needs an amendment to
[the club-scoped rule](../.agents/notes/proposed/architecture/2026-09-19-a-club-screen-is-club-scoped-unless-only-your-club-has-one.md):**
its stated exception is subject existence, and Squad does not fit it — every club has a squad. The
discriminator the rule is missing is whether the manager's own surface *acts* on the data or only
reads it. Staff and Club Information are read-only both ways, which is exactly why the resolver
worked twice.

**40 and 42 do fit the rule**, but need something the ticket did not anticipate: a club-scoped view
carrying `club` and `isUserClub`, because `TransferHistoryView` is `{ entries }` and `FixturesView`
is `{ season, fixtures }` — neither can name the club it is about. Fetching the name separately is
the trap `ClubStaffView`'s comment names.

**Screen 34 ships** (ticket 06). One screen, club-scoped, reached two ways: `clubInformation/` is
the screen and `clubInfo/` is now the own-club resolver over it, the Staff pattern applied a second
time. It shows name, standing, town, nation, ground and capacity — and a test asserts it shows none
of the things the ledger `deferred`s, because an invented figure cannot be told from a right one.
**e2e 49 passed.**

Two things worth carrying forward. A test caught a real bug before it shipped: **the content pack
resolves club and competition identities only**, so a nation id passed to `displayNames` comes back
as `nation_eng` — `packages/shared` exports `nationName` for exactly this. And the
`display-names` guard was a false positive for the second time, fired on a clubs-rooted select that
joins `cities` and takes *its* name; tightened with self-tests in both directions rather than
loosened.

**M1 exit criterion 2 is met.** Group C's coverage table has no row reading `Not yet audited`, and
every other group's ledger already had one. Criterion 4 is met too — `check:all` and 47 e2e both
green. What remains of M1 is criteria 1, 3 and 5: the placeholder cull and the Group L remainder.

**Group C is charted and disposed** (tickets 03–05). Seventeen unaudited rows turned out to be
twelve screens: 38 and **49** are shipped — 49's row had been lying since its effort closed — and
43–45 follow Group Q. Of the twelve, nine are `deferred`, three are `renamed`, and **none is
`out-of-scope`**. That is the finding, not an oversight: not one is ruled out by a statement that the
thing should not exist, which is exactly the shape Group D's staff screens have and Group C's have
not.

**The rule that settled it** is [a club screen is club-scoped unless only your club
has one](../.agents/notes/proposed/architecture/2026-09-19-a-club-screen-is-club-scoped-unless-only-your-club-has-one.md).
The information axis everyone expected to matter is empty — `CONTEXT.md` says a Club carries no
hidden value of its own, so there is no club-level fog for a second screen to model. What decides it
is whether a rival club has a **row**: `club_budgets` is keyed on `club_id` so Screen 39 is
club-scoped; `board_objective` is keyed on `season_number` so a rival has no Board Objective at all
and Screen 47 stays save-scoped. Group L should quote this rather than re-derive it.

**Group C's remainder is charted** (M1 step 3). The map is
[`.scratch/group-c-club-information/map.md`](../.scratch/group-c-club-information/map.md), and it
settles three things before any screen is ruled on. Screen 38 is shipped. **Screen 49 Team Scout
Report is also shipped and its coverage row still says `Not yet audited`** — a stale row, not
unaudited work. And 43–45 follow Group Q, so seventeen unaudited rows are really twelve screens.

**The question the group turns on is the own-club/any-club split.** The renderer carries two parallel
families — save-scoped nav destinations about *my* club (`clubInfo`, `finances`, `boardConfidence`,
`clubHistory`) and club-scoped drill-downs about *any* club (`clubInformation`,
`clubFinancesDetail`, `clubSquadDetail`, and six more). Several import screens therefore have **two**
placeholders. Ticket 02 set a precedent — Screen 38 exists once, club-scoped, with a thin own-club
resolver for the nav entry — but ticket 04 is told to test it rather than inherit it, because Staff
is the easiest possible case: a staff list reads the same whoever is looking, and Finances and Board
Confidence plausibly do not.

The map also flags the trap this group is shaped to attract: **absence of a model is `deferred`, not
`out-of-scope`.** Screens 36, 37, 46 and 48 are all positioned to repeat the error M1 step 1 found
three times in four.

**The Club → Staff nav entry now reaches the roster** (group-c ticket 02). `StaffOverviewScreen` is a
resolver rather than a screen: it reads the own club from `getSquad` and hands off to
`ClubStaffScreen`, which stays the only roster implementation. The missing piece really was just the
club id — a drill-down takes a `clubId`, a navbar entry has only a `saveId`, and that is why
`destinations.ts` excludes club-scoped drill-downs from save-scoped nav. **e2e is 47 passed**, and
the new spec goes through the navbar because the navbar was the defect; the roster was never broken.

Its three Club-section siblings — `clubInfo`, `finances`, `boardConfidence` — are still placeholders
and are step 3's. They are **not** the same shape: this was a built screen waiting on an id, and
those three have no implementation anywhere.

**M1 step 5's player and staff share is done.** group-d tickets 09 and 10 deleted ten placeholders
and the whole `staff/$staffId` route branch. Ticket 10 was the one that needed judgement: five of the
six staff folders went, but `staffOverview` is `deferred` rather than disposed, because it is a live
navbar destination whose screen already exists elsewhere. `staffAttributes` and `staffJobInfo` answer
to no import screen and were ruled `out-of-scope` for the first time — not for a missing model, but
because `CONTEXT.md` says Staff carry no Contract, no wages and no development, so the screens have
no subject.

Remaining WIP under `renderer/`: 47 screens. `staffSearch` is Group I's; the `club*`,
`competition*` and `nation*` share is M1 steps 3 and 4.

**e2e is GREEN — 46 passed, 2026-09-19.** group-h ticket 12 fixed the four training specs, and with
`pnpm check:all` also green, **M1 exit criterion 4 is met.** The four had drifted against ticket 09's
Training Overview hub: they opened by asserting a `Coaching Assignments` h1, which is now one click
further in behind *View workload details*. Nothing was skipped or deep-linked past — three of the
four exist to prove a journey, and the journey is what moved.

Worth keeping from it: the diagnosis cost minutes because the Playwright page snapshot was read
first, and it showed a working hub rather than a broken app. Also worth noting how long this hid —
`check:all` does not include e2e, so a green gate was being reported while four specs were red.

**group-d ticket 09 shipped the player half of M1 step 5.** Five disposed player placeholders deleted
with their routes, scope entries, action rows and URL mappings. The ticket as filed was wrong about a
sixth: `playerCoachReport` is Group H's built Screen 113, not Group D's never-built Screen 67, and
both ticket and ledger now say so.

**The ticket queue was empty before these were filed, and that is worth reading carefully.** Every
effort in `.scratch/` is closed except group-g-match-day, whose only `ready-for-agent` ticket (31,
committed matches store their timeline) is **blocked by ticket 32 — a human call on save migration**.
Group G's live-match remainder is an M1 non-goal in any case. So M1's remaining work is its own
sequence, not a ticket someone left open: step 2 Group D is done bar the cull, steps 3 and 4 are the
Group C and L remainders, and step 5 is the cull itself — 57 WIP screens today, of which tickets 09
and 10 take the `player*` and `staff*` share.

Filing 09 and 10 is in-effort work on a charted map, not a new sprint invented to stay busy: ticket
04 said to file them and nobody did, and the Group D ledger has been carrying the debt under *What
this ledger leaves owed* since 2026-09-18.

**group-a-reconciliation is complete.** Ticket 22 built the Quit dialog's provisional variant, and
both of its hard parts were unnamed in the ticket. `QuitGuard` is mounted outside the router and
cannot read `CreateSessionContext`, so the creation flow publishes `{ present, id }` through
`create/provisionalCareer.ts`. And a renderer-side discard would race `app.quit()` and lose
*silently*, so the id travels with the confirmation and `main/quit.ts` deletes before quitting.
It also surfaced a pre-existing bug: the quit dialog never took initial focus in either variant,
because `useDialogKeyboard` ran its mount effect at app startup with no dialog on screen.
[Note](../.agents/notes/proposed/feature/2026-09-19-quitting-mid-creation-discards-in-main.md).

**add-manager-screen-7 is complete.** Ticket 03 rewrote the Group A ledger's Screen 7 section, which
had been asserting "Nothing of Screen 7 survives" since 2026-08-31 — true when written, false once
tickets 01 and 02 shipped. Status **Reviewed → Audited**: all 41 import sections plus the commit
stanza carry a row, so nothing rests on the silence rule. §21 Back behavior and §22 Career Setup
Summary are `renamed` — relocated into the four-stage creation flow rather than dropped. Two
conventions are bent and recorded in the ledger itself: `renamed`'s Anchor holds an effort ticket
rather than a `CONTEXT.md` term, and §6.4's undocumented import edit is written down rather than
reverted.

**gate-red-on-dev is complete.** All six tickets resolved. Ticket 06 closed the loop ticket 04 opened:
`vitest-environment-pragma` now lives in `scripts/effect-lint.ts`, and it fires on a *mention* as well
as a use, because that is the real failure — ticket 04's own guard was disabled by a comment
explaining the pragma, which vitest matched and applied. Proved by an 8-case spec and a demonstrated
red run.

**Ticket 05 is resolved, and it was not a flake.** The `MatchNotReadyError` that failed one test per
full suite run, in a different file each time, was never shared state. `createSave` forwarded neither
of `beginCareer`'s deterministic inputs, so **every spec played a different world on every run** —
the world seed drawn from `Random`, the reference year from the system clock. Measured over 400
explicit worlds, 3 leave the human club holding ten players after one season of contract expiries,
and `test/main/boundary-helpers.ts` handed that club's Fixture to `startMatch` regardless, which
rejected it at `match/start.ts:161` exactly as it should. Test worlds are now pinned via
`test/seeded-save.ts` (36 import lines, no call site changed); production careers still draw a random
world. Proved with a mutant that reproduces the original error on demand.
[Note](../.agents/notes/implemented/testing/2026-09-19-every-test-world-is-seeded.md).

**The larger finding is filed, not fixed.** Played to season 3, the *majority* of worlds leave the
human club unable to field eleven: contract expiry removes players every season and nothing puts any
back, so a career ends to attrition the player was never shown. The suite only ever plays into
season 2, which is why this read as a 1% flake rather than a wall.
[Decision request 01](../.scratch/gate-red-on-dev/decision-request-01-squad-decay-has-no-floor.md)
recommends youth intake as the floor, then the human's own transfer activity.

**`pnpm check:all` is GREEN on `dev`** as of 2026-09-18, for the first time in this plan's memory —
typecheck, lint, effect-lint, verify-md-links, verify-db-schema and test, 2651 tests passing. The
standing caveat that every sprint delivers against a red gate and must re-prove "pre-existing" by
hand is **retired**. That caveat's successor — ticket 05's flake — is also retired: it is
fixed, and it was never timing. A single red test is now worth believing.

What the red gate turned out to be, after several sprints of being summarised as "61 unit tests
failing `window is not defined`": only **5** were that error. 9 were a cascade from one test calling
`window.close()` under jsdom and tearing the fixture down for eight others. 13 were a fixture missing
a schema field added on 09-11. 21 were four test files that never adopted `renderInRouter` after
`useListState` made `SquadScreen` require router context on 09-11. The inaccurate summary is how the
real failures stayed hidden. Two guard tests disagreed and both were right to: `display-names` was a
false positive (regex spanning a template literal) and was tightened with a self-test;
`club-badge-library` was correct and had caught a real defect — 10 Portuguese clubs mapped to badge
keys the library never held.

**The claimed-lock sweep ran 2026-09-18, and the standing "six abandoned locks" caveat is retired.**
There were two, not six. The four this plan named — group-a 03, group-g 14, group-h 11 and
desktop-suite-red 03 — are all `resolved`; the react-composition-audit locks were relabelled on
09-06 and the group-b ones swept earlier. The two real ones were `club-staff-presence` 03 and 05,
both stale locks over work that had shipped, in an effort listed as complete since 2026-09-09. Each
was resolved against the tree rather than a commit message, with the audit and its file-and-line
evidence appended to the ticket.

No live lock was touched. The lesson stands and belongs to [AGENTS.md](../AGENTS.md): both tickets
were `claimed` at filing, so the frontier scan skipped them and the effort read as in-progress while
nothing could pick it up. Set `claimed` immediately before starting work, never when filing.

group-l-competitions-nations-and-world-information ticket 04 resolved 2026-09-17: the Competition
Fixtures screen (Screen 163) lists any Competition's Fixtures via a new `getCompetitionFixtures` RPC,
with unplayed Fixtures marked and never given a fabricated score. Review caught the RPC omitting
`PendingFixtureIntegrityError` from its error union — invisible to typecheck because the handler is
typed `Effect<unknown, unknown>` — fixed before commit. Ticket 03 shipped the same omission in
`getCompetitionTable`; filed with two other follow-ups as group-l ticket 05. group-l is otherwise
4/4 resolved, and Screens 164 and 161 remain v1 scope with no ticket.

group-g-match-day has no ready build ticket left; 26 (forced substitution brings back used players,
patch kept) and 29 (windows across halves) are blocked on decision request 07; 20 needs triage (a
command rewrites seen play); decision requests 01 (live tactics resets the line-up), 04 (who may come
on), 05 (revealed position across a restart), 06 (red-carded keeper) and 07 (engine rule changes vs
saved matches) need a human.

**The gate is red on `dev` independently of any sprint**, and has been for at least these three
clusters: 61 unit tests failing `ReferenceError: window is not defined` at
`src/renderer/navigation/scroll-state.ts:21`; 12 `oxlint` errors; 18 broken markdown links under
group-c/group-d. None has a ticket. Until they do, every sprint delivers against a red gate and
"pre-existing" has to be re-proved by hand each time.

group-a-reconciliation ticket 20 resolved 2026-09-17: the Quit dialog renders above both overlay
tiers via `MODAL_SCRIM_TOP` (`z-[60]`), proved by an e2e spec whose mutant was observed to fail on
pointer interception. Review split out ticket 21.

navbar-keyboard-intent ticket 04 resolved 2026-09-17: a section's `g <n>` key may only sit on that
section's own action; a hand-edited override moving it elsewhere is rejected and dropped on load.

group-g-match-day ticket 30 resolved 2026-09-17: the Match Report lists goalkeeper stand-ins as moves
into goal, and its incident list agrees with its substitutions statistic.

group-g-match-day ticket 28 resolved 2026-09-17: the renderer match session accepts writes only for
the active match, so nothing crosses into the next match.

group-g-match-day ticket 27 resolved 2026-09-17: the career header's live-match readout shows the
revealed score and minute.

group-g-match-day ticket 26 parked 2026-09-17: the fix changes engine results, and match history
re-derives from seed and journal on every read, so it would make saved Match Reports contradict
their stored results. Kept as a patch; decision request 07 asks how engine rules may change without
rewriting saved matches, which gates every engine-rule fix in this effort.

group-g-match-day ticket 25 resolved 2026-09-17: substitution counts, windows, statistics and command
outcomes (including bring-offs) follow the engine's own rules, and a severe goalkeeper injury at the
cap pauses.

group-g-match-day ticket 24 resolved 2026-09-16: the Match day panel's halftime instruction shares the
standalone screens' half-time window.

group-g-match-day ticket 23 resolved 2026-09-16: leaving and returning to Match day continues from the
revealed position, including a pending injury decision. A restart still replays from kickoff
(decision request 05). Another session's uncommitted React Compiler lint config is in the shared
worktree and raises lint errors from 19 to 43; it was not staged.

group-g-match-day ticket 22 resolved 2026-09-16: score, head-count and the Commentary screen stop at
the revealed position, and `conditions` has left the match response. The head-count now visibly
disagrees with the engine after a live tactics change, which makes decision request 01 more urgent.

group-g-match-day ticket 21 resolved 2026-09-16: the injury prompt and no-subs pause work again,
triggered when the Injury line is revealed, decided on the cap state at that moment, and cleared by
the forced substitution, Play on, or a command. Desktop unit failures dropped from 68 to 62.

group-g-match-day ticket 19 resolved 2026-09-16: both substitution pickers list who is on the pitch
as of the revealed position, from a main-process fold (`pitch.ts`). Review found that the engine lets
a forced substitution bring back a dismissed player (26), and asked who may come on (decision
request 04).

group-g-match-day ticket 18 resolved 2026-09-16 (code in `d8170df`, committed outside the pipeline
and reviewed afterwards): live substitution counts stop at the revealed position, and "applied" comes
from the substitution's own event. desktop-suite-red 11 closed with it (live-match e2e 30/30). The
review found six more live-match defects, filed as group-g 20–25.

two-row-nav ticket 08 resolved 2026-09-16 (`d0e5f75`): secondary tablists are named for their match
or entity context, not the primary section. Its gate run exposed desktop-suite-red 14.

desktop-suite-red ticket 12 resolved 2026-09-16: Squad has a visually hidden `h1`, and `app.spec.ts`
is fully green. desktop-suite-red now has no ready ticket: 11 is blocked on group-g 18, and 03 is
claimed but abandoned.

desktop-suite-red ticket 13 resolved 2026-09-16: the transfer bid journey scopes its row locator, so a
namesake in a random world no longer breaks it (10/10 repeats).

desktop-suite-red ticket 11 parked 2026-09-16: no pacing seam, since the full-time race did not
reproduce in 30 runs. The remaining 1-in-30 failure is a product defect: live substitution counts
include substitutions the re-simulated match has not reached yet, so an accepted substitution can
read as Rejected. Filed as group-g 18 and 19. 11 is blocked on 18.

desktop-suite-red ticket 10 resolved 2026-09-16: the live-match specs assert today's command-status
copy and tabs. The app and journeys e2e specs are at 10 passed / 2 failed (tickets 12, 13).

desktop-suite-red ticket 09 resolved 2026-09-16: `closeOrKill` confirms the quit guard through main,
so an e2e app quits in about 150ms instead of being killed after 5s.

desktop-suite-red ticket 08 resolved 2026-09-16: the before-matchday seed now stands at the first
pre-match boundary, and the kickoff locators say "Play match". Router AC-15 and keyboard AC-20 pass.
The match-starting journeys now get past kickoff and fail on tickets 10 and 11.

desktop-suite-red ticket 07 resolved 2026-09-16: the close hang was the quit-confirmation guard that
no test answered, not an app defect. `keybindings.spec.ts` and the journeys save-restart test pass.

navbar-keyboard-intent ticket 03 resolved 2026-09-16: the keyboard, keybindings and journeys e2e
specs press position keys, and navbar badges follow user overrides. The keyboard e2e trio went from
3 passed / 7 failed to 5 / 5. The five left are desktop-suite-red 07 and 08, filed by its review.

navbar-keyboard-intent ticket 02 resolved 2026-09-16: World gains `g 8`, `g 3` now reaches Training
rather than Squad, and the section nav actions derive from `NAV_SECTIONS`, with `CAREER_G_BINDINGS`
deleted. `navbar.test.tsx`'s intentional red badge case is green. Report:
[reports/navbar-keyboard-intent.md](reports/navbar-keyboard-intent.md).

Group J ticket 08 resolved 2026-09-16: Contract Expiry and Budget Review are in the Recruitment
submenu (`g 4 o`, `g 4 p`), and the submenu strip now scrolls, since ten entries overflow the
default window. Group J has no ready ticket left; 04 is needs-info on decision request 01.

desktop-suite-red ticket 06 resolved 2026-09-16 (`d0fab20`): the career-screen classification is now
enforced by `typecheck` rather than by diligence, and the adapter sweep covers five destinations it
had been silently missing. It raised
[decision request 01](../.scratch/desktop-suite-red/decision-request-01-what-makes-a-career-destination-top-level.md)
— nothing written down says what makes a `CareerDestination` top-level, so the new guard forces a
classification without being able to check it. Blocks nothing.

Ticket 05 resolved 2026-09-16 (`0d0b60c`). Its premise was half wrong: `navbar.test.tsx`'s literal
was correct, not stale, and red because the navbar advertises a `g 8` the keyboard spine rejects.
That test is now derived from the binding registry and deliberately red against
[navbar-keyboard-intent 02](../.scratch/navbar-keyboard-intent/issues/02-world-section-advertises-a-dead-g-key.md).

Group J ticket 07 (Transfer History, Screen 146) resolved 2026-09-15 (`c7ad6bd`); it shipped a
navbar entry, which exposed that tickets 05 and 06 shipped their screens URL-only. Ticket 04
(Contract Renewal) is needs-info on group-j decision request 01 (renewal mid-term), its work kept as
a patch. Group J decision request 02 (club-scoped transfer indexes) is open and blocks nothing.
Group I decision request 01 also blocks Group J Screens 132, 134 and 137.

**For a human**: `desktop-suite-red` ticket 03 is claimed-and-abandoned. Per
[AGENTS.md](../AGENTS.md), `claimed` is a lock the frontier scan skips, so it is invisible to every
future agent and will never be picked up. It needs unclaiming or closing by someone who knows why it
stopped. Tickets currently `claimed` elsewhere (group-a 03, group-g 14, group-h 11) may be live
parallel sessions and were left alone.

## Gate state (2026-09-14)

- **Ticket 05 (group-h) gate, 2026-09-15**: `pnpm check:all` exits 1 on pre-existing failures only.
  The same failing files on clean HEAD `349bafc` give 69 failures, identical to the working tree's
  apart from one caused by another session's uncommitted content pack. e2e on clean HEAD is
  10 failed / 24 passed, so the 5-failure e2e baseline below is out of date. Details in
  [reports/group-h-training-and-player-development.md](reports/group-h-training-and-player-development.md).

- **Ticket 07 (group-g) gate**: `pnpm check:all` exits 1 on pre-existing failures only. Desktop unit
  tests 65 failed / 1516 passed across 20 files; the same 20 files on clean HEAD fail the same 65.
  `verify-md-links` fails on 18 links in `.scratch/group-c-club-information/RECONCILIATION.md` and
  `.scratch/group-d-player-and-staff-records/issues/02-staff-screens-scope.md`, both committed earlier.
  Details in [reports/group-g-match-day.md](reports/group-g-match-day.md).

- **`pnpm check:all`**: pre-existing failures only — no regression from today's work (commits
  `b0b8f33`, `d6b44a4`, `ac553d6`, `6a07401`, `6a830f3`, `908fd0f`, `e6f0c6f`, `dd46e8d`,
  `f52c2c6`):
  - `test/renderer/managerProfile/screen.test.tsx` — mock RPC returns "unexpected response"
  - `test/renderer/chrome/shell-bottom-bar-state.test.ts` — expected `zones` mismatch
  - `test/renderer/navigation/navbar.test.tsx` and `route-index.test.ts` — route content mismatch
  - `test/renderer/router/stage2.test.ts`, `team-scout-report-route.test.ts` — `window` not defined
    (jsdom env)
  - `test/renderer/match/screen-fulltime.test.tsx` — passes.
- **Desktop unit tests, 2026-09-16 (navbar-keyboard-intent 02)**: 68 failed / 1792 passed across 17
  files. `navbar.test.tsx` no longer fails. The e2e keyboard specs fail on the retired letter keys
  (ticket 03), and `router.spec.ts:184` (Match Day resume) fails on a missing `Start match` button.
- **Nav guard baseline, 2026-09-16 (`d0fab20`)**: `test/renderer/navigation` + `test/renderer/actions`
  is 1 failed / 355 passed across 14 files — the one failure still the intentional `navbar.test.tsx`
  badge case. Earlier the same day at `0d0b60c`: `test/renderer/navigation` is 1 failed / 307
  passed across 11 files. The one failure is intentional — `navbar.test.tsx`'s badge case is red
  until navbar-keyboard-intent 02 resolves the `g 8` gap. Before this ticket the same two files
  failed 2. Details in [reports/desktop-suite-red.md](reports/desktop-suite-red.md).
- **e2e**: still 5 failed / 28 passed at `8f95c8f` — no e2e change this sprint.
- **typecheck**: 0 errors across all packages.
- **lint/oxlint**: pre-existing warnings only.

## Queue

1. ~~**group-c-club-information**: complete 2026-09-14. Screen 38 already shipped.~~
2. ~~**group-d-player-and-staff-records**: complete 2026-09-14. 19 screens charted, 3 implemented.~~
3. **desktop-suite-red**: 01, 02, 04, 05, 06 resolved (05 derived the nav guards, 06 made the
    classification a typecheck gate, 2026-09-16). 03 claimed-and-abandoned (needs a human to
    unclaim or close). Decision request 01 open. 07-10 resolved 2026-09-16 (quit guard; seed at the
    pre-match boundary; graceful harness close; live-match copy). 11 blocked by group-g 18; 12, 13 resolved
    (hidden Squad `h1`; namesake-safe bid locator).
4. **season-rollover-skips-conclusion**: 01 resolved.
5. **match-composition**: 01-02 resolved.
6. **group-a-reconciliation**: 03-04 resolved. 20 resolved (Quit dialog rendered above both overlay tiers via `MODAL_SCRIM_TOP`). 21 resolved (QuitGuard portals to `document.body` to escape Base UI inert).
7. **team-scout-report**: complete 2026-09-13.
8. **group-e-squad-management**: pending — next unmatched spec group.
9. **group-g-match-day**: 01–09 resolved (07 Screen 97 live tactics/substitutions, 08 Screen 99
    Post-Match Summary, 09 Screens 95/100 Match Statistics, 11 Screen 103 Match Report, 2026-09-14);
    10 needs-info on decision request 03; 12, 13, 15, 16, 17 resolved; 14 claimed; 13 mounted tab bar,
    17 stoppage minute formatting shipped 2026-09-15; decision requests 01, 02, 03 open.
10. **group-h-training-and-player-development**: 01-03 resolved. Spec published. 04 completed
    (coaching assignments, 2026-09-15). 05 completed (workload and recovery, 2026-09-15). 06 completed
    (individual training plan, 2026-09-15). 07 partly shipped (performance report, 2026-09-15),
    needs-info on decision requests 01 (coach rating) and 02 (development baseline). 08 completed
    (player development centre, 2026-09-15). 09 completed (training overview, 2026-09-15). 10 completed
    (Goalkeeping Training Focus rule enforced in main, 2026-09-15). 11 claimed.
11. **group-i-scouting-and-recruitment**: 01-03 resolved, spec published. 07 completed (typed RPC
    errors survive IPC), 04 completed (Scouting Assignment screen) and 05 completed (Scouting
    Knowledge screen), 06 completed (Scouting Centre), 2026-09-15. 08 completed (read-state
    helper), 2026-09-15. Scope note promoted. Effort complete for v1; decision request 01 open. Decision request 01 open.
12. **group-j-transfers-contracts-and-negotiations**: 01-03 resolved, spec published (2026-09-15). 04
    needs-info on decision request 01; 05-07 resolved (07 Screen 146 Transfer History, 2026-09-15);
    08 resolved (navbar entries for 141/145, 2026-09-16). Decision requests 01 and 02 open.
13. **navbar-keyboard-intent**: 01-04 resolved (02 World `g 8`; 03 e2e on position keys, override-aware
     badges, 2026-09-16); 04 ready (decision: item level vs hand-edited section overrides).
14. **group-l-competitions-nations-and-world-information**: charted 2026-09-17. 01 (inventory), 02
    (v1 scope) resolved. 03 (Competition Table) resolved (new `getCompetitionTable` RPC + screen).
    In v1: screens 161–164 (Competition Table, Fixtures, Results, Overview). 176–180 out of scope.

Shipped and closed:

- **club-staff-presence**: complete 2026-09-09.
- **save-list-error-handling**: complete 2026-09-09.
- **world-data-model**: shipped.
- **group-b-reconciliation**: all 7 tickets resolved.
- **group-c-club-information**: complete 2026-09-14.
- **group-d-player-and-staff-records**: complete 2026-09-14.
- **group-e-squad-management**: complete 2026-09-14. 11 screens charted, all disposed.

## Loose instructions

Squad work committed from `.scratch/squad-instructions.md` (`6a04f33`…`5663faf`) is not a
`.scratch/<effort>/` and has no tracker entry. Whether to charter it is a human call.

## Group maps

The wayfinder map of every `.scratch/group-*` effort that has one, copied verbatim on 2026-10-02 with
headings demoted and links re-pointed from `.ai/`. The `map.md` files stay canonical; these copies
do not update when a map does. `group-b-blanket-disposals` and `group-f-tactics-and-match-preparation`
have no map.

### Map: Group A reconciliation

Label: `wayfinder:map`

#### Destination

A Group A spec and deviation register: a `spec.md` covering all 21 Group A screens that states, per
screen, what the implementation must do — plus an explicit record of every place the imported spec at
[docs/specs/group_a_application_shell_and_game_lifecycle_remaining/](../docs/specs/group_a_application_shell_and_game_lifecycle_remaining/)
is knowingly not followed, and why. Ready to hand to `/to-spec` → `/to-tickets`.

Screens 01–17 have an implementation to audit against their spec. Screens 18–21 have none and are new
design. Both halves land in the same spec.

#### Notes

**Domain**: local single-player football-management sim, Electron + Effect, event-sourced into one
SQLite file per save. Vocabulary lives in [CONTEXT.md](../CONTEXT.md).

**Skills every session should consult**: `grilling` and `domain-modeling` by default; `doc-standards`
for anything written under `docs/`; `effect-code` for any session that touches source.

**The imported specs are not requirements.** They read as generated from a generic template rather
than authored against this game, and they routinely describe subsystems this project has never decided
to build. A session treats them as a checklist to reconcile against, not a contract to satisfy. Where
the spec and this codebase disagree, the codebase's existing decisions win unless a ticket explicitly
overturns them — and the disagreement gets written into the register rather than silently dropped.

**Standing decisions from charting** (settled 2026-08-30, before any ticket opened):

- The multiplayer / network / cloud / multi-manager axis is removed wholesale (see Out of scope).
- Screen 19 "Manager Status" is redefined as the single-manager profile-and-tenure screen, absorbing
  the meaning already carried by the `manager_status` table — one name, one concept.
- Retirement is voluntary termination reusing the existing sacked-archive path, differing in cause and
  messaging only. No interim-manager or club-continuity machinery.
- Quit confirmation is an accidental-keypress guard on closing the application, never an unsaved-progress
  warning: commands are durable at commit, so there is no unsaved progress to lose.
- The twelve numbered ADRs were deliberately deleted and are not coming back. Agent Notes under
  `.agents/notes/` are the repo's sole decision record from here.

**The import duplicates Screen 2.** `01_app_shell.md` contains Screen 1, a screen-inventory preamble,
*and* a full copy of Screen 2 with the same 29 sections as `02_new_game.md`. `02_new_game.md` is
canonical; file 01's copy is not audited separately, and `## N.` numbering is not unique inside file 01.

**Execution posture**: this map plans. Ticket 01 is the one exception — it performs a documentation
repair, because `pnpm check:all` is red until it lands and every later session inherits that red gate.

#### Decisions so far

<!-- one line per closed ticket -->

- [01 — Decision-record layer after ADR removal](../.scratch/group-a-reconciliation/issues/01-decision-record-layer-after-adr-removal.md):
  Agent Notes are the sole decision record; ten ADRs migrated to `implemented/` notes, two absorbed by
  existing notes, `docs/adr/` deleted, two vendored skills forked, `check:all` green.

- [02 — Deviation register: format and home](../.scratch/group-a-reconciliation/issues/02-deviation-register-format.md): a
  *reconciliation ledger* per spec group at `docs/specs/<group>/RECONCILIATION.md` — one row per
  `## N.` section, four kinds (`out-of-scope`/`contradicted`/`deferred`/`renamed`) each with a
  mandatory anchor, silence meaning "followed" only under an `Audited` status line, imports never
  edited. Screen 21 written out as the worked example.

- [03 — Blanket scope trim across the Group A specs](../.scratch/group-a-reconciliation/issues/03-blanket-scope-trim.md): the trim is
  narrow — screens 2, 3, 4, 6, 8, 9, 10, 12 and 17 lose only scaffolding and a few clauses, screens 13
  to 16 lose about a quarter each, and screen 7 disappears entirely. ~25,000 lines survive across
  sixteen screens, so the audit does not merge. Two new axes found (off-device telemetry, non-normative
  import scaffolding); recorded as `out-of-scope` rows on every screen in the ledger.

- [05 — Screen 18: what a local Game Status screen contains](../.scratch/group-a-reconciliation/issues/05-screen-18-game-status.md):
  removed; survivors (season/save-name orientation, sacked badge, app version) redistribute into
  CareerChrome, Save List, and a new About dialog.

- [04 — Audit: application shell (spec 01)](../.scratch/group-a-reconciliation/issues/04-audit-application-shell.md): Screen 1 audited
  against the shell; 28 ledger rows, no code changed. The entry point is the Save List, not a Main
  Menu; the shell has no way to quit, open settings, or read credits; the Save List declares no
  Actions and has no keyboard tier; a failing save repository is swallowed silently. Two new
  out-of-scope rulings (mod indicator, online update check).

- [06 — Screen 19: Manager Status redefined, and the name collision](../.scratch/group-a-reconciliation/issues/06-screen-19-manager-status-redefinition.md):
  Screen is "Manager Profile", showing profile identity (name, archetype, pillars, club, tenure) with
  a passive Active/Archived badge; all sacking/outcome detail stays exclusive to Season Summary;
  "Manager Status" retired as domain term; CONTEXT.md and reconciliation ledger updated.

- [07 — Screen 20: Retire Manager](../.scratch/group-a-reconciliation/issues/07-screen-20-retire-manager.md): retirement is the second cause
  of an **Archived Save**; a `ManagerRetired` event and a nullable `archived_cause` column replace the
  `sacked` boolean, `assertSaveNotSacked` becomes `assertSaveNotArchived`, and the action is a dialog on
  Manager Profile confirmed by an Irreversibility Disclosure. Breaks the save format with no migration path.

- [08 — Screen 21: Quit confirmation as an accident guard](../.scratch/group-a-reconciliation/issues/08-screen-21-quit-confirmation.md):
  one intent (close_application), one provisional-career exception, before-quit guard with renderer IPC,
  dialog-only (no keyboard shortcut). Durable-at-commit note written and re-anchors the reconciliation
  ledger's contradicted rows.

- [09 — Navigation surface for the new shell screens](../.scratch/group-a-reconciliation/issues/09-navigation-surface-for-new-screens.md):
  Save List tiered at level 2; app-chrome bar (Preferences, Credits, Quit) on the Save List as
  lightweight dialogs; no command-palette entries for boot-screen destinations.

- [10 — Assemble the Group A spec and deviation register](../.scratch/group-a-reconciliation/issues/10-assemble-spec-and-register.md):
  Spec assembled at `.scratch/group-a-reconciliation/spec.md`; deviation register remains at `docs/specs/group_a_application_shell_and_game_lifecycle_remaining/RECONCILIATION.md`; all out-of-scope axes recorded; ready for `/to-spec` → `/to-tickets`.

- [10 — Assemble the Group A spec and deviation register](../.scratch/group-a-reconciliation/issues/10-assemble-spec-and-register.md):
  Spec assembled at `.scratch/group-a-reconciliation/spec.md`; deviation register remains at `docs/specs/group_a_application_shell_and_game_lifecycle_remaining/RECONCILIATION.md`; all out-of-scope axes recorded; ready for `/to-spec` → `/to-tickets`.
- [11 — Slice the screen 2–17 audit into tickets](../.scratch/group-a-reconciliation/issues/11-slice-the-screen-2-17-audit.md):
  Nine absent screens grouped into three cheap "confirm absence" tickets; six with implementation
  audited as individual, flow, or complement tickets; Screen 13 as a thin complement to the shell
  audit. Eight tickets sized to one session each, all blocked against ticket 10.

- [12 — Absence: Screens 3, 4, 5 (creation-form screens)](../.scratch/group-a-reconciliation/issues/12-absence-creation-screens.md):
  Three creation-form screens (league/nation selection, competition detail, database size/performance)
  have no routes, components, or screens. All surviving sections classified `contradicted` — the
  fixed single 20-club league (CONTEXT.md) and three-step Manager→Club→Review creation flow leave
  no room for any of them.

- [13 — Absence: Screens 9, 10 (identity screens)](../.scratch/group-a-reconciliation/issues/13-absence-identity-screens.md):
  Two identity screens (nationality/languages, background) have no routes or components — no
  nationality/languages or background concept exists in the codebase. All 91 surviving sections
  classified `contradicted` against the three-step creation flow and the Archetype/Pillar identity
  model (CONTEXT.md).
- [14 — Absence: Screens 14, 15, 16, 17 (management screens)](../.scratch/group-a-reconciliation/issues/14-absence-management-screens.md):
  Four management screens (Save/Save As, Delete Saved Game, Game Preferences, Display/Sound Options)
  have no routes, components, or UI of any kind. All surviving sections of all four screens classified
  `contradicted` — the codebase has no user-invoked save, no delete-save path, no preferences surface,
  and no display/audio configuration UI.

- [15 — Screen 2: New Game, Database Initialization](../.scratch/group-a-reconciliation/issues/15-screen-2-new-game.md):
  Screen 2 audited and reconciled; all 28 content sections `contradicted` by the three-step creation
  flow with invisible world generation. No cache, progress UI, or validation stages exist.

- [16 — Screen 6: Game Loading and World Generation](../.scratch/group-a-reconciliation/issues/16-screen-6-world-gen.md):
  Screen 6 audited against the creation flow implementation. All 40 surviving sections `contradicted`:
  generation is a masked wait with no progress bar, no task checklist, no cancellation, no retry, no
  validation, no checkpoint, no completion summary. Transitions to Club Selection, not Add Manager.

- [17 — Screen 8: Manager Personal Details](../.scratch/group-a-reconciliation/issues/17-screen-8-personal-details.md):
  Screen 8 `Reviewed` against the implementation (CreationStep1.tsx): only a single Manager name `<input>`
  exists; date of birth, place of birth, portrait, hot-seat privacy, name normalization, structured name
  components, and all form behaviors are absent. Reconciliation ledger updated with `contradicted` rows
  covering 9 audit categories. Status changed from `Not yet audited` to `Reviewed` (ticket 17, 2026-08-31).
- [19 — Screen 13: Load Saved Game (complement)](../.scratch/group-a-reconciliation/issues/19-screen-13-load-game-complement.md):
  Screen 13 `Reviewed` against the implementation (`saveList.tsx` 79 lines + `loadSave` in `main/saves.ts`).
  The shell audit (ticket 04) already covered entry point, Actions, keyboard tier, repository failure
  swallowing, and stale-entry contract; the complement adds `contradicted` rows for the absent save-library
  surface (search, filter, sort, details panel, save-type presentation, footer actions, load pipeline,
  corrupt-save behavior, initial destination), and `deferred` rows for keyboard interaction, accessibility,
  responsive, localization, save read lease, compatibility/integrity models, state machine, import/duplicate/
  delete, loading progress, and cancellation. 40 ledger rows added; no code changed; status changed from
  `Not yet audited` to `Reviewed` (ticket 19, 2026-08-31).## Not yet specified

<!-- none — every question resolved, fog cleared, map complete. -->

#### Out of scope

- **Multiplayer, network sessions, participant reconnect, ownership transfer, cloud synchronization,
  and multiple human managers per career.** Authorized for removal by the user during charting. This
  is the single largest axis in the imported specs and it has no referent in a local single-player
  app. Also rules out all of `docs/specs/group_r_multiplayer_administration/` as an inheritor.
- **Worker pools, memory budgets, and resource-policy tuning.** The app has no worker profile or
  configurable memory budget to expose, tune, or report on. Wider than charting assumed: it consumes
  spec 5 §18 in full plus its warnings, spec 6 §33–§34, spec 16 §26–§27, and spec 18 §4 Runtime. It
  does *not* cover internal threading, which stays a design question for the audit tickets.
- **Human manager slots, capacity, reservations, and roster.** A sharpening of the multi-manager axis
  above, recorded separately because of how much it consumes: essentially all of spec 7 (Add Manager),
  most of spec 19, and the reservation and conflict machinery in spec 11 §29–§30 and §35. It also
  removes the recurring "revalidate draft ownership" clause threaded through specs 8–12, which has no
  referent with a single local user.
- **Off-device telemetry, crash reporting, and product analytics** (spec 16 §40). Missed during
  charting. The app has no backend to receive them, so there is no consent to collect and no privacy
  policy to link. Local structured logging is unaffected and stays in scope.
- **Non-normative import scaffolding.** The `Condensed LLM implementation brief`, `Next planned item`,
  and `Suggested Git commit` sections, spec 1 §15 Clean-room constraints, and spec 1's screen-inventory
  preamble are authoring artifacts of the import, not requirements. Fifty-three sections across the
  group. The briefs in particular restate their own file, so auditing them would double-count every
  section they summarize.
- **Resignation and the unemployed-manager job market.** Spec 20 §2 wants "Resign instead" as an
  alternative to retiring. Resignation only means something with somewhere to go afterwards, which is
  Group N (jobs and manager career), not the application shell.
- **Restoring the twelve deleted ADRs.** Decided against during charting. Their 151 citations and the
  21 broken links they leave behind are in scope (ticket 01); reversing the deletion is not.
- **Introducing genuine unsaved career state** so that spec 21's `UnsavedCareerState` model becomes
  true. That is an architectural regression against durable-at-commit persistence.
- **Game Status screen (Screen 18).** Decided via ticket 05. The survivors (career/season orientation,
  sacked badge, app version) redistribute into existing real estate; no route, component, or
  `GameStatusSnapshot` type is built.
- **Save-format migration machinery.** Ticket 07's `archived_cause` column is the second Group A decision
  to break existing saves, and the repo has no migration layer to carry them across. Building one is a
  project-wide architectural effort with its own versioning and upgrade-path questions; it sits past this
  map's destination. Recorded here so the need is visible rather than lost — see the risk in
  [Retire Manager](../.agents/notes/implemented/feature/2026-08-30-retire-manager.md).
- **The other eighteen spec groups.** Group A is the pilot. If a reusable trimming method falls out, it
  is captured as a `process` Agent Note — widening this map to 19 groups is a different effort.
- **An enabled-mods indicator.** Ruled by ticket 04 while auditing spec 1 §4.2 and §8. Nothing in the
  app loads third-party content, so there is nothing to enable, list, or indicate.
- **The main menu's online update check** (spec 1 §8 `updateStatus`). Ruled by ticket 04. A sharpening
  of the off-device-telemetry axis above: the app has no backend to query and no update channel.
- **ADR-000x citation rewrites in source comments.** Ticket 01 provided the mechanism (rewrite to note path, reword, or drop); the 151 mentions are a source-comment hygiene pass that sits past this map's destination (a Group A spec and deviation register). No screen's reconciliation depends on the outcome.
- **How the Quit dialog stays on top.** Ticket 20. A dedicated `MODAL_SCRIM_TOP` (`z-[60]`) in
  `theme.ts`, not a mount reorder in `main.tsx`. The renderer stacks overlays at two levels —
  hand-rolled ones tie at `z-40` and are broken by DOM order, vendored Base UI surfaces portal out
  at `z-50` — so reordering wins only the first tier and would have left the bug half-fixed. The
  z-index is independent of mount position, which keeps `QuitGuard` free to sit outside the router.
Adopting the vendored portal `Dialog` was rejected: it renders at `z-50` too, so it would still
   tie, and it would mean replacing `useDialogKeyboard`'s focus trap. Raising the z-index does not
   beat a Base UI *modal*, which inerts everything outside its portal — split out as ticket 21.

- [21 — The Quit dialog takes no clicks while a Base UI modal is open](../.scratch/group-a-reconciliation/issues/21-quit-dialog-under-base-ui-modals.md):
  The Quit dialog outranks any open Base UI modal. `QuitGuard` portals to `document.body` via
  `createPortal`, placing itself outside the `#root` subtree that Base UI marks as inert. Combined
  with `MODAL_SCRIM_TOP` (`z-[60]`) from ticket 20, it now paints on top of and receives clicks
  through every overlay tier. A unit test proves the portal lands in `document.body`, not in the
  mount container. Decision recorded in
  `.agents/notes/implemented/architecture/2026-09-17-quitguard-outranks-base-ui-modals.md`.

- [22 — the Quit dialog's provisional variant](../.scratch/group-a-reconciliation/issues/22-quit-guard-provisional-career-variant.md):
  built, and the ticket's two hard parts were both unnamed. `QuitGuard` is mounted outside the
  router and cannot read `CreateSessionContext`, so the flow publishes `{ present, id }` through
  `create/provisionalCareer.ts`. And a renderer-side discard would race `app.quit()` and lose
  silently, so the id travels with the confirmation and `main/quit.ts` deletes before quitting.
  Surfaced a pre-existing bug on the way: the quit dialog never took initial focus in *either*
  variant, because `useDialogKeyboard` ran its mount effect at app startup.
  [Note](../.agents/notes/proposed/feature/2026-09-19-quitting-mid-creation-discards-in-main.md).

### Map: Group B reconciliation

Label: `wayfinder:map`

#### Destination

A Group B spec and deviation register: a `spec.md` covering all 11 Group B screens that states, per
screen, what the implementation must do — plus a completed
[reconciliation ledger](../docs/specs/group_b_global_navigation_and_inbox/RECONCILIATION.md)
recording every place the import at
[docs/specs/group_b_global_navigation_and_inbox/](../docs/specs/group_b_global_navigation_and_inbox/)
is knowingly not followed, and why. Every screen off `Not yet audited`. Ready to hand to
`/to-spec` → `/to-tickets`.

#### Notes

**Domain**: local single-player football-management sim, Electron + Effect, event-sourced into one
SQLite file per save. Vocabulary lives in [CONTEXT.md](../CONTEXT.md), which already defines
**News Message**, **News Inbox**, **Main Menu**, **Load Career**, and **Save** — screens 22, 24 and 31
audit against real vocabulary, not fog.

**Skills every session should consult**: `grilling` and `domain-modeling` by default; `doc-standards`
for anything written under `docs/`; `effect-code` for any session that touches source.

**The imported specs are not requirements.** All eleven files are the same generated 24-section
template (~2,400 lines total, ~260 sections — a tenth of Group A). A session treats them as a
checklist to reconcile against, not a contract to satisfy. Where the import and this codebase
disagree, the codebase's existing decisions win unless a ticket explicitly overturns them, and the
disagreement becomes a ledger row rather than a silent drop.

**This map inherits Group A's rulings.** The
[Group A map](../.scratch/group-a-reconciliation/map.md) settled the multiplayer / network / multi-manager
axis, worker pools and memory budgets, off-device telemetry, non-normative import scaffolding, and
resignation-and-job-market. Those are not re-litigated here; they are cited.

**Run the blanket disposals first.** [group-b-blanket-disposals](../.scratch/group-b-blanket-disposals/README.md)
is a three-ticket prefactor that applies the already-settled rulings — screens 29 and 32 in full, the
import scaffolding, the multiplayer axis — across the whole group. It strips roughly a third of the
import's 261 sections, so every audit ticket here opens a smaller file. It writes to the same ledger,
so an audit session should not run concurrently with one of its tickets.

**Execution posture**: this map plans, with no exception. Screens 22, 24–26 and 31 have live code and
an audit will find bugs in it. Findings become ledger rows and spec statements; fixes go through
`/to-tickets` afterwards.

**Screen 23 is done and is not re-opened.** It is `Reviewed` in the ledger, its design lives in two
`implemented` Agent Notes, and its remaining work is execution owned by
[`.scratch/continue-and-advance-time/`](../.scratch/continue-and-advance-time/map.md). The Group B spec cites it.

**Standing decisions from charting** (settled 2026-09-07, before any ticket opened):

- Screen 32 (Manager Chat and Multiplayer Communication) is out of scope in full — it is nothing but
  the axis Group A already removed.
- Screen 29 (Manager Notebook) is out of scope in full — an import invention with no referent here.
- Screens 24, 25 and 26 are three specs over one implementation and are audited as one ticket.
- Screen 31 is a thin complement to a decision Group A already made, not a fresh audit.

#### Decisions so far

<!-- one line per closed ticket -->

- **The blanket disposals ran and the ledger absorbed them** (group-b-blanket-disposals, all three
  tickets, 2026-09-07). Screens 29 and 32 are `Disposed in full` under a fourth ledger status added for
  whole-file rulings; the import scaffolding is disposed across all nine surviving screens; and the
  multiplayer axis is disposed per screen, with its three recurring disguises — the active manager, the
  career revision, the permission context — stated once under *The multiplayer axis* in the ledger for
  the remaining tickets to cite.

- **Ticket 01 — Screen 22 is `Reviewed`.** "Prior safe screen" disposes to "the previous screen":
  Back and Forward are the router's own unfiltered history, and no career route names an entity, so no
  stack entry can go stale. That one fact also disposes of the deleted-entity fallback and §19's stale
  selection cases. `GlobalShellState` has no counterpart and should not — the chrome composes five
  independently-failing reads and a compile-time navbar. Two real gaps recorded `deferred`: a failed
  header read is indistinguishable from one in flight, and back navigation restores the screen wrapper
  rather than the region the player left. See
  [issues/01-screen-22-career-chrome.md](../.scratch/group-b-reconciliation/issues/01-screen-22-career-chrome.md).

- **Ticket 02 — Screens 24, 25, 26 (News Inbox, Message, Filters) are `Reviewed`.** Audited as one
  ticket per the charting spec. All three screens move off `Not yet audited` to `Reviewed`. The
  implementation handles all three as one list-and-detail route — Screen 25 is an inline pane rather
  than a separate route, and Screen 26 is an inline filter bar. Main gaps recorded `deferred`: saved
  filter presets, date-range/sender-type/priority criteria, sender summary and entity links on
  messages, content blocks and attachments, virtualization, and the full filter lifecycle. No News
  Message taxonomy hole was found. See
  [issues/02-screens-24-26-news.md](../.scratch/group-b-reconciliation/issues/02-screens-24-26-news.md).

- **Tickets 03–07 closed; the effort is complete.** Recorded late, during the 2026-09-18 stale-lock
  sweep — 05, 06 and 07 had shipped but were held open by a `claimed` line left above their
  `resolved` line. The load-bearing answers: **Screen 28 (Calendar) is not a new screen** — Fixtures
  already *is* the Calendar surface under another name, and the import's extra controls are
  `deferred`/`unscheduled` with no CONTEXT.md change needed
  ([issues/05](../.scratch/group-b-reconciliation/issues/05-screen-28-is-calendar-a-screen.md)). **Screen 30 (Manager History): a career
  record partially exists** — per-season `board_objective` rows and a single-row `manager_status`, no
  honours or aggregate totals, and its home is Season Summary rather than Manager Profile
  ([issues/06](../.scratch/group-b-reconciliation/issues/06-screen-30-does-a-save-accumulate-a-career-record.md)). Ticket 07 assembled
  [spec.md](../.scratch/group-b-reconciliation/spec.md) and the ledger at
  [docs/specs/group_b_global_navigation_and_inbox/RECONCILIATION.md](../docs/specs/group_b_global_navigation_and_inbox/RECONCILIATION.md).

The charting-time rulings above are written up as a spec at [charting-spec.md](../.scratch/group-b-reconciliation/charting-spec.md). It covers this effort's method and scope only; the Group B
screens spec is `spec.md`, produced by ticket 07.

#### Not yet specified

Nothing. The one open patch — where new Group B surfaces land in the navigation model — was answered
by tickets 05 and 06 and is resolved rather than pending: **no new screen is warranted**, so there is
no navbar slot, keyboard tier or command-palette decision to make. Fixtures already carries the
Calendar, and the career record lives on Season Summary. It stayed listed here only because the map
was never updated when those tickets closed.

- **The News Message taxonomy.** Which simulated events produce a News Message, and who decides. The
  news audit (ticket 02) will either find this already settled by the implementation or expose it as
  a design hole; only then is it a ticket.

- **Navigation history and focus restoration as a design question.** The chrome audit (ticket 01)
  reads what exists. Whether the gap between it and the import's model is worth its own decision
  depends on what that audit finds.

#### Out of scope

- **Screen 32, Manager Chat and Multiplayer Communication, in full.** Ruled at charting. The file is
  entirely the multiplayer / network / multi-manager axis Group A removed wholesale; there is exactly
  one human manager per Save, so there is nobody to communicate with. The whole-file disposal was
  written into the ledger by group-b-blanket-disposals ticket 01, not by ticket 07 as originally
  planned, so the silence is recorded rather than assumed. Both screens are `Disposed in full`.

- **Screen 29, Manager Notebook, in full.** Ruled at charting. Manager-private notes, tags, pinning,
  entity-linked annotations, and note-to-reminder conversion are an import invention: no note concept
  exists in the codebase, in `CONTEXT.md`, or in any recorded decision, and nothing in the game asks
  the player to keep private prose. Also carries the multi-manager privacy model as its premise.
  Ledger row written by group-b-blanket-disposals ticket 01.

- **Multiplayer, network sessions, participant reconnect, ownership transfer, cloud synchronization,
  and multiple human managers per career.** Inherited from Group A. Consumes §10 of all eleven files.

- **Worker pools, memory budgets, and resource-policy tuning.** Inherited from Group A. Consumes most
  of screen 27, which is why that screen is a disposal ticket rather than a design one.

- **Off-device telemetry, crash reporting, and product analytics.** Inherited from Group A. Local
  structured logging is unaffected and stays in scope.

- **Non-normative import scaffolding.** Inherited from Group A: the `Condensed LLM implementation
  brief`, `Next planned item`, and `Suggested Git commit` sections are authoring artifacts, not
  requirements. Three sections per file, thirty-three across this group.

- **Resignation and the unemployed-manager job market.** Inherited from Group A, and the reason
  screen 30's career timeline has at most one appointment on it. Belongs to Group N.

- **Screen 23's remaining execution.** Owned by [continue-and-advance-time](../.scratch/continue-and-advance-time/map.md).
  This map cites screen 23's reconciliation; it does not carry its build.

- **The other spec groups.** Group A was the pilot, Group B is the second application of its method.
  Widening to the remaining seventeen is a different effort.

### Map: Group C — Club Information (the remainder)

Label: `wayfinder:map`

#### Destination

Every Group C screen disposed or built, with no row in
[RECONCILIATION.md](../docs/specs/group_c_club_information/RECONCILIATION.md) reading
`Not yet audited`. That is milestone [M1](MILESTONES.md) **step 3**, and exit criterion 2
names it directly.

#### What is already settled

- **Screen 38 Club Staff — shipped.** `club-staff-presence`, audited 2026-09-07. Its ledger rows are
  complete and are not reopened. Its Club-section nav entry now reaches it through an own-club
  resolver ([ticket 02](../.scratch/group-c-club-information/issues/02-the-club-staff-nav-entry-lands-on-a-placeholder.md)).
- **Screen 49 Team Scout Report — shipped, and the ledger does not say so.** The `team-scout-report`
  effort closed with all eight tickets resolved and the screen lives at
  `renderer/scouting/TeamScoutReportScreen.tsx`, routed club-scoped as `teamScoutReport`. Its
  coverage row still reads `Not yet audited`. **This is a stale row, not unaudited work**, and
  correcting it is part of ticket 03 rather than a screen to dispose.
- **Screens 43–45 History, Records, Honours — out of this milestone.** Confirmed 2026-09-19: they
  need persisted season history and follow **Group Q** rather than carving a history store inside
  M1. The same gap holds Group D 55 and Group L 172–173, so the store is one piece of work serving
  six screens across three groups. Do not dispose them here; record the anchor and move on.

That leaves **twelve** screens — 33–37, 39–42, 46–48 — which is exactly what M1 step 3 names.

#### Notes

**Domain**: local single-player football-management sim. Glossary terms this group touches:
**Club**, **Stature Tier**, **Simulation Depth**, **Transfer Budget**, **Wage Budget**, **Board
Objective**, **Competition**, **Fixture**, **Squad**, **Staff**. Read CONTEXT.md before ruling that a
screen has no model — several of these exist under a different word.

**Skills every session should consult**: `grilling` and `domain-modeling` by default; `doc-standards`
for anything under `docs/`; `effect-code` for any session that touches source.

**The imported specs are not requirements.** All seventeen files are the same generated template.
Treat them as a reconciliation checklist, exactly as Groups A and D did.

**Standing decisions inherited from Group A**: the multiplayer/multi-manager axis is out of scope;
worker pools and memory budgets are out of scope; off-device telemetry is out of scope; non-normative
import scaffolding is disposed.

#### Fog

##### The one that shapes everything else: own club, or any club?

The renderer already carries **two parallel families** of club screen, and the import has no opinion
about the difference because it was written for a game with one.

- **Save-scoped nav destinations**, reached from the Club section with only a `saveId`:
  `clubInfo`, `finances`, `boardConfidence`, `clubHistory`, and `clubs` (a browse list).
- **Club-scoped drill-downs** at `club/$clubId/…`, reached from a surface that already names a club:
  `clubInformation`, `clubFinancesDetail`, `clubHistoryDetail`, `clubSquadDetail`,
  `clubReservesDetail`, `clubYouthDetail`, `clubFixturesDetail`, `clubTransfersDetail`,
  `clubCompetitionsDetail`.

Several import screens therefore have **two placeholders**, not one — `clubInfo` and
`clubInformation` are both Screen 34's; `finances` and `clubFinancesDetail` are both Screen 39's.
Whether that is one screen or two is the question the whole group turns on, and answering it twelve
times independently is how a codebase ends up with twelve inconsistent answers.

**There is already a precedent, and it points one way.** Screen 38 exists **once**, club-scoped, and
its nav entry is a thin own-club resolver over the same screen
([ticket 02](../.scratch/group-c-club-information/issues/02-the-club-staff-nav-entry-lands-on-a-placeholder.md)). `destinations.ts`
records why: a drill-down needs a target club and so cannot be a save-scoped nav destination, and
`squadAtom(saveId).club.id` is the established own-club resolution. Ticket 04 should test that
precedent rather than assume it — it was set by one screen whose content happens not to differ
between my club and theirs, and Finances plausibly does differ.

##### What actually has a model

Ruling on twelve screens without knowing which have data behind them is how Group D's summary came to
miscount its own dispositions. The survey comes first, and it is ticket 03.

Known or strongly suspected:

- **35 Club Squad** — the Squad screen is shipped for the own club; `clubSquadDetail` is the any-club
  version. Likely `renamed`, pending ticket 04.
- **36 Reserve Squad, 37 Youth Squad** — no reserve or youth squad model is known to exist. If none
  does, these are the absence-of-a-model case, which is **`deferred`**, not `out-of-scope`
  ([the rule](../.agents/notes/proposed/architecture/2026-09-19-per-player-statistics-deferred-not-ruled-out.md)).
  M1 step 1 found this error three times in four; do not make it a fourth.
- **39 Club Finances** — Transfer Budget and Wage Budget are modelled and the Budget Review screen
  ships. Whether that satisfies 39 or is a different screen is a real question.
- **40 Club Fixtures, 41 Club Results** — Fixtures ship for the own club. Any-club versions are the
  same question as 35.
- **42 Club Transfers** — Transfer History ships. Same shape again.
- **46 Information and Facilities** — Stature Tier exists; facilities do not, as far as is known.
- **47 Supporter and Board Confidence** — Board Objective is modelled; supporter confidence is not
  known to be. The screen may be half-satisfiable, which is its own disposition problem.
- **48 Club Comparison** — Group D disposed Player Comparison (63) for having no comparison
  mechanism, and re-kinded it `deferred` on 2026-09-19. 48 is the same question about clubs and
  should get the same kind for the same reason.

##### What the answers cost

M1 step 5 deletes the placeholder of every screen disposed here, and there are roughly fourteen
`club*` WIP screens. A disposition that is wrong is therefore a deleted route, which is recoverable,
and a ledger row that lies, which is the thing M1 exists to end.

#### Decisions so far

##### Screen inventory ([ticket 03](../.scratch/group-c-club-information/issues/03-screen-inventory-and-the-stale-49-row.md), 2026-09-19)

Every "none found" below names the search behind it. A model missing from `schema.ts` *and* from
`CONTEXT.md` is recorded as not found; a model that exists under another word is named.

| Screen | Placeholder(s) in `renderer/` | Route(s) | Model behind it | Shipped screen that may satisfy it |
|---|---|---|---|---|
| 33 Club Overview | none | — | A dashboard over every other Group C subject. Has no model of its own; it is a composition of theirs. | None. Its content is whatever 34–48 resolve to. |
| 34 Club General Information | **`clubInfo/` and `clubInformation/`** — both carry `aria-label="Club Information"` | `club-info` (save-scoped) and `club/$clubId/information` | Club, **Stature Tier**, `stadium_name`, `stadium_capacity` on `clubs` | None |
| 35 Club Squad | `clubSquadDetail/` | `club/$clubId/squad` | Squad, Player, Position Rating — fully modelled | **`squad/`**, shipped and interactive, for the own club |
| 36 Reserve Squad | `clubReservesDetail/` | `club/$clubId/reserves` | **None — and ruled.** `CONTEXT.md:774` "no youth or reserve squad exists", cut from v1. Note `competitions.kind` admits `"reserve"`, so reserve *Competitions* exist while reserve *squads* do not. | None |
| 37 Youth Squad | `clubYouthDetail/` | `club/$clubId/youth` | **None — and ruled.** Same sentence, `CONTEXT.md:774`. | None |
| 39 Club Finances | **`finances/` and `clubFinancesDetail/`** | `finances` (save-scoped) and `club/$clubId/finances` | **Transfer Budget**, **Wage Budget** — `club_budgets` carries `transfer_budget_remaining` and `wage_budget` | **`budgetReview/`**, shipped, for the own club |
| 40 Club Fixtures | `clubFixturesDetail/` | `club/$clubId/fixtures` | Fixture, Competition — fully modelled | **`fixtures/`**, shipped, for the own club |
| 41 Club Results | none | — | Fixture carries its result. **Attendance and player-of-the-match: none found** (absent from `schema.ts` and `CONTEXT.md`). | `fixtures/` and `seasonSummary/` may cover the played half |
| 42 Club Transfers | `clubTransfersDetail/` | `club/$clubId/transfers` | Transfer, Bid — modelled | **`transferHistory/`**, shipped, for the own club |
| 46 Information and Facilities | none of its own | — | `stadium_name` and `stadium_capacity` exist on `clubs`, deliberately without a stadium entity. **Training ground, medical, recruitment reach, expansions: none found** (`facilit` appears nowhere in `schema.ts` or `CONTEXT.md`). | None |
| 47 Supporter and Board Confidence | `boardConfidence/` | `board-confidence` (save-scoped) | **Board Objective** is modelled — `board_objective`, `board_objective_verdict`. **Supporter confidence: none found** (`supporter`, `attendance` appear nowhere). | None |
| 48 Club Comparison | none | — | **None found.** No comparison mechanism, matching Group D 63 Player Comparison. | None |

**Two screens have two placeholders each** — 34 and 39 — which is ticket 04's subject, now with
names rather than a suspicion. Three screens (33, 41, 48) have **no** placeholder and never did;
their absence is itself a finding, since M1 step 5 has nothing to cull for them.

##### Corrections to the coverage table

- **Screen 49 Team Scout Report is shipped, and its row said `Not yet audited`.** Verified against
  the tree, not the ticket: `renderer/scouting/TeamScoutReportScreen.tsx` exists and is routed
  club-scoped as `teamScoutReport` in `router/index.tsx`. The `team-scout-report` effort closed with
  all eight tickets `resolved`.
- **Screens 43–45 follow Group Q**, confirmed 2026-09-19. Their rows say so rather than leaving a
  reader to re-derive it.

##### The kind 36 and 37 take, decided here because the evidence is unambiguous

`CONTEXT.md:774` — "Youth integration and youth promotion are cut from v1: no youth or reserve squad
exists" — is a **version boundary**, and
[a v1 exclusion is `deferred`](../.agents/notes/proposed/process/2026-09-19-a-v1-exclusion-is-deferred-not-out-of-scope.md)
rules that those are `deferred`, anchored `v1 exclusion — CONTEXT.md:774`. Not `out-of-scope`: that
kind is reserved for a positive statement that the thing should not exist, and "cut from v1" is not
one. The map flagged 36 and 37 as shaped to attract this error; the evidence says the flag was right.

46 and 48 are the absence-of-a-model case and take `deferred` too, but ticket 05 owns their anchors.

##### The own-club rule ([ticket 04](../.scratch/group-c-club-information/issues/04-one-screen-per-subject-or-two.md), 2026-09-19)

**A Group C screen is club-scoped and exists once; a nav entry is a thin own-club resolver over it.
The exception is subject existence, not visibility.**
[Note](../.agents/notes/proposed/architecture/2026-09-19-a-club-screen-is-club-scoped-unless-only-your-club-has-one.md).

The information axis the fog worried about turned out to be empty. `CONTEXT.md`: *a Club never
carries a hidden value of its own for an Attribute Range to narrow* — uncertainty lives at the
Player level, and there is no club-level fog mechanism, so visibility can never be the
discriminator.

What decides it is whether a rival club has a row. `club_budgets` is keyed on `club_id`, so Screen
39 is club-scoped; `board_objective` is keyed on `season_number` and names the human's club, so a
rival has no Board Objective at all and Screen 47 is save-scoped. **Screens 34 and 39 collapse to
one screen each** — `clubInfo/` and `finances/` go, `clubInformation/` and `clubFinancesDetail/`
stay.

An interactive own-club screen is not a second screen: that is a capability difference the resolver
handles, and building two is how Screen 34's pair came to exist.

##### The dispositions ([ticket 05](../.scratch/group-c-club-information/issues/05-dispose-the-twelve.md), 2026-09-19)

All twelve disposed. **No coverage row reads `Not yet audited`** — M1 exit criterion 2 met for
Group C. Nine `deferred`, three `renamed`, and **none `out-of-scope`**: not one of the twelve is
ruled out by a statement that the thing should not exist, which is the opposite of Group D's staff
screens. Two screens are half-modelled (39, 47) and their halves are named separately, or the build
ticket would invent the missing one.

#### Not yet specified

The chart is complete; what remains is building. Tickets 06, 07 and 08 built 34, 40/42 and the modelled
halves; 09 culled the placeholders those roads freed — all resolved. The one open build ticket is
[10 — Screen 35, the any-club squad](../.scratch/group-c-club-information/issues/10-the-any-club-squad.md), unblocked 2026-09-23 now that
[group-i decision request 01](../.scratch/group-i-scouting-and-recruitment/decision-request-01-knowledge-limited-player-reads.md)
is answered and its shared read shipped.

### Map: Group D — Player and Staff Records

Label: `wayfinder:map`

#### Destination

A reconciled spec covering all 19 Group D screens (50-68) — player profile, attributes, positions, form, statistics, history, contract, transfer status, happiness, injuries, discipline, development, action menu, comparison, staff profile/contract/history, coach report, and scout report — stating per screen what the implementation must do, and which screens are already satisfied by shipped code.

#### Notes

**Domain**: local single-player football-management sim. Key glossary terms in CONTEXT.md that this group touches: **Attribute**, **Position**, **Position Rating**, **Overall Rating**, **Transfer Value**, **Contract**, **Free Agent**, **Injury** (match event), **Condition**, **Natural Fitness**, **Injury Proneness**, **Player Development**, **Training Focus**, **Scouting Progress**, **Attribute Range**, **Fully Scouted**, **Scout**, **Coach**, **Staff**, **Bound Staff**, **Presence Staff**.

**Skills every session should consult**: `grilling` and `domain-modeling` by default; `doc-standards` for anything written under `docs/`; `effect-code` for any session that touches source.

**The imported specs are not requirements.** All 19 files are the same generated template. Treat them as a reconciliation checklist.

**Several screens may already be satisfied by shipped work:**

- **Screen 61 (Player Development)** — Player Development, Training Focus, and the per-season step are modeled and built. See [deterministic Player Development](../.agents/notes/implemented/feature/2026-08-28-deterministic-fractional-player-development.md).
- **Screen 56-57 (Contract/Transfer Status)** — Contract, Transfer Value, Bid, Free Agent are modeled. Screen 57 may be satisfied by existing transfers screens.
- **Screen 67 (Coach Report), Screen 68 (Scout Report)** — Scouting system exists. Coach Report may have no counterpart.
- **Screen 59 (Injuries)** — Match injury model exists as match events; a player injury history screen may not.

**Standing decisions inherited from Group A**: multiplayer/multi-manager axis is out of scope; worker pools and memory budgets out of scope; off-device telemetry out of scope; non-normative import scaffolding disposed.

#### Decisions so far

- [01 — Screen inventory](../.scratch/group-d-player-and-staff-records/issues/01-screen-inventory.md): All 19 screens surveyed. All dedicated player/staff routes exist as WIP placeholders registered during Group A reconciliation — none show real data because no player-read RPCs exist. Screens 51 (Attributes), 52 (Positions), and 61 (Development/Training Focus) are partially satisfied by inline squad-table display. Screens 58 (Happiness), 60 (Discipline), 63 (Comparison), 54 (Statistics), 57 (Transfer Status), and 62 (Action Menu) have no modeled data.
- [02 — Staff screens scope](../.scratch/group-d-player-and-staff-records/issues/02-staff-screens-scope.md): All five staff screens (64-68) disposed. Screens 64-66 (Staff Profile, Contract, History) out-of-scope per closed role set. Screen 67 (Coach Report) out-of-scope — no counterpart. Screen 68 (Player Scout Report) deferred — Team Scout Report exists, player-level scouting is inline via Attribute Ranges.
- [03 — Missing systems disposition](../.scratch/group-d-player-and-staff-records/issues/03-missing-systems-disposition.md): Screens 58 (Happiness), 60 (Discipline), 63 (Comparison) out-of-scope — none of these systems exist. Screen 62 (Action Menu) deferred — actions exist through specific surfaces but no unified menu.
- [04 — Remaining screens disposition](../.scratch/group-d-player-and-staff-records/issues/04-remaining-screens-disposition.md): All 19 screens disposed. 11 out-of-scope, 3 satisfied-inline (51, 52, 53), 2 deferred (55, 62, 68), 3 needs-design (50 Player Profile, 56 Player Contract, 61 Player Development/Training Focus display).
- [05 — Player read RPCs](../.scratch/group-d-player-and-staff-records/issues/05-player-read-rpcs.md): `getPlayerProfile` and `getPlayerContract` RPCs implemented with schemas, handlers, renderer atoms. Committed 2026-09-14.
- [06 — Player Profile screen](../.scratch/group-d-player-and-staff-records/issues/06-player-profile-screen.md): Replaced WIP placeholder with real screen showing identity, positions, attributes, club, contract info, injury status. Committed 2026-09-14.
- [07 — Player Contract display](../.scratch/group-d-player-and-staff-records/issues/07-player-contract-display.md): Replaced WIP placeholder with real screen showing wage, length, signing and expiry dates. Committed 2026-09-14.
- [08 — Player Development display](../.scratch/group-d-player-and-staff-records/issues/08-player-development-display.md): Implemented training focus management screen at `player/$playerId/development`. Committed 2026-09-14.

- [09 — cull the player placeholders](../.scratch/group-d-player-and-staff-records/issues/09-cull-the-player-placeholders.md) and
  [10 — rule on the staff placeholders](../.scratch/group-d-player-and-staff-records/issues/10-rule-on-the-staff-placeholders.md): filed
  2026-09-19, closing the obligation ticket 04 named and never ticketed. 09 is mechanical: five
  disposed player screens plus `playerCoachReport`, which the ledger's list omitted. 10 is not,
  because three `staff*` folders answer to no screen in this import and need a first-time
  disposition rather than a deletion. Both are milestone M1 step 5.

#### Not yet specified

None. All 19 screens disposed. Three needs-design surfaces identified, all three shipped.

The placeholder cull shipped in tickets 09 and 10 (2026-09-19). Ten placeholders and the whole
`staff/$staffId` route branch are gone. One survivor is deliberate: `staffOverview` is `deferred`,
not disposed — it is a live navbar destination whose roster already ships as `clubStaff`, and
connecting them is [group-c ticket 02](../.scratch/group-c-club-information/issues/02-the-club-staff-nav-entry-lands-on-a-placeholder.md).

#### Out of scope

- **Multiplayer, network sessions, multiple human managers** — inherited from Group A.
- **Worker pools, memory budgets, resource tuning** — inherited from Group A.
- **Off-device telemetry, crash reporting** — inherited from Group A.
- **Non-normative import scaffolding** — inherited from Group A.
- **Staff Profile / Contract / History (screens 64-66)** — per closed role set.
- **Coach Report (screen 67)** — no counterpart.
- **Player Happiness (screen 58)** — no morale system.
- **Player Discipline (screen 60)** — no card accumulation or ban model.
- **Player Comparison (screen 63)** — no comparison mechanism.
- **Player Statistics per-player (screen 54)** — no aggregated model.
- **Player Transfer Status (screen 57)** — transfer listing not modeled.
- **Player Form (screen 53)** — no match rating history model.
- **Player Injuries history (screen 59)** — injury is per-match event, no durable record.
- **Player Attributes dedicated screen (screen 51)** — satisfied inline in squad.
- **Player Positions dedicated screen (screen 52)** — satisfied inline in squad.

### Map: Group E — Squad Management

Label: `wayfinder:map`

#### Destination

A reconciled spec covering all 11 Group E screens (69-79) — squad selection, view selector, filters, sorting, shirt numbers, captaincy, set-piece takers, registration, availability/eligibility, player interaction, team meeting/discipline — stating per screen what to build or dispose.

#### Notes

**Several screens may already be satisfied or out of scope:**

- **Squad screen** is partially built (table, columns, positions, condition, training focus column). Selection, filters, sorting exist inline.
- **Captain/Set-pieces** — no system exists.
- **Player interaction/grievances, team meeting/discipline** — no morale, discipline, or meeting system exists.
- **Shirt numbers** — no squad number model.
- **Squad registration, eligibility** — no system exists.

Inherited from Group A: multiplayer axis out of scope, worker pools out of scope, telemetry out of scope.

#### Decisions so far

- [01 — Screen inventory](../.scratch/group-e-squad-management/issues/01-screen-inventory.md): All 11 screens surveyed. 4 satisfied (69, 70, 72, partially 71), 2 partial (71, 77), 6 out-of-scope (73-76, 78-79).
- [02 — Status filter](../.scratch/group-e-squad-management/issues/02-status-filter.md): Squad gets a Status filter beside Position, offering only modelled statuses (Tired) and matching via `statusesOf`. Each dropdown clears only its own clause; URL form `status:Tir`.
- [03 — Attribute filters](../.scratch/group-e-squad-management/issues/03-attribute-filters.md): owned Squad only; one attribute from `ALL_ATTRIBUTES` at a time, at a minimum `N` from the 1–20 scale; a non-exact figure never matches. Built as [04](../.scratch/group-e-squad-management/issues/04-attribute-threshold-filter.md).
- [04 — Attribute threshold filter](../.scratch/group-e-squad-management/issues/04-attribute-threshold-filter.md): shipped 2026-09-28. `matchesAttribute` matches exact figures only, the URL form is `attr:pace:15`, and there are no palette rows (740 would be noise).

#### Not yet specified

Screen 71's status and attribute halves have shipped (02, 04). Its other axes (team, availability, registration, selection, age, morale, contract, transfer, presets) are recorded in the ledger as not yet audited. Existing squad features are otherwise shipping.

#### Out of scope

- **Multiplayer, network sessions, multiple human managers** — inherited from Group A.
- **Worker pools, memory budgets, resource tuning** — inherited from Group A.
- **Off-device telemetry, crash reporting** — inherited from Group A.
- **Non-normative import scaffolding** — inherited from Group A.

### Map: Group G — Match Day and Match Review

Label: `wayfinder:map`

#### Destination

A reconciled spec covering all 14 Group G screens (91-104) — match preview, team sheet, live match overview/commentary/statistics/ratings/tactics, half-time team talk, post-match summary/statistics/ratings/team talk, match report, incidents/review — stating per screen what is already built and what needs new surfaces.

#### Notes

The match engine and several match screens are partially built. Match commentary, events, Condition, injuries, substitutions, and tactical commands exist. Full-screen match live view, half-time talk, post-match flow, and disciplinary review are not built.

Inherited from Group A: multiplayer, worker pools, telemetry, non-normative scaffolding.

#### Decisions so far

- [01 — Group G screen inventory survey](../.scratch/group-g-match-day/issues/01-screen-inventory.md): 1 built, 8 partial, 3 absent (98/102 need morale model; 104 cut from v1)
- [02 — Scope decision for absent screens](../.scratch/group-g-match-day/issues/02-scope-absent-screens.md): 104 out of scope (cut from v1); 98/102 out of scope for Group G (deferred — require new domain model)
- [03 — Build sequence for 8 partial screens](../.scratch/group-g-match-day/issues/03-partial-screen-build-sequence.md): Priority order set; shared component pairs identified
- [04 — Team Sheet screen](../.scratch/group-g-match-day/issues/04-team-sheet-screen.md): Implemented. New `getTeamSheet` RPC + screens for both team lineups with formation and substitutes.
- [05 — Match Preview screen](../.scratch/group-g-match-day/issues/05-match-preview-screen.md): Implemented. Fixture context, recent form, head-to-head from existing fixture data.
- [06 — Standalone Commentary screen](../.scratch/group-g-match-day/issues/06-standalone-commentary-screen.md): Implemented. Commentary lines with polling for live updates.
- [07 — Tactics/Substitutions UI](../.scratch/group-g-match-day/issues/07-tactics-substitutions-ui.md): Implemented. Standalone live screens share one live tactic with the Match day panel; tab-bar reachability deferred to 13. Follow-ups: [12](../.scratch/group-g-match-day/issues/12-live-panel-controlled-club.md), [13](../.scratch/group-g-match-day/issues/13-mount-live-match-tab-bar.md), [decision request 01](../.scratch/group-g-match-day/decision-request-01-live-change-tactics-scope.md) (live Change Tactics scope).
- [08 — Post-Match Summary](../.scratch/group-g-match-day/issues/08-post-match-summary-enhancement.md): Implemented. `getPostMatchSummary` read RPC; summary shown only after the result is committed; fixed accepted results reverting to Accept result. Follow-ups: [14](../.scratch/group-g-match-day/issues/14-post-match-summary-penalties.md), [15](../.scratch/group-g-match-day/issues/15-full-time-session-lost-before-accept.md).
- [09 — Match Statistics](../.scratch/group-g-match-day/issues/09-match-statistics-component.md): Implemented. `getMatchStatistics` projection; live totals cut by revealed-event count; possession/corners/fouls/offsides unavailable pending [decision request 02](../.scratch/group-g-match-day/decision-request-02-unsimulated-match-statistics.md). Follow-up: [16](../.scratch/group-g-match-day/issues/16-live-commands-stamped-by-revealed-minute.md).
- [10 — Match Player Ratings](../.scratch/group-g-match-day/issues/10-match-player-ratings-component.md): resolved 2026-09-27. A
  **Match Rating** per participant: a base of 6.0, plus the player's own events and their phase's share
  of the result while on the pitch, read from the stored timeline ([decision request 03](../.scratch/group-g-match-day/decision-request-03-match-player-rating-formula.md),
  Option B). The clean sheet counts only at full time. `matchId` is not on the destination, the same
  deviation as ticket 09.
- [11 — Match Report](../.scratch/group-g-match-day/issues/11-match-report-screen.md): Implemented. `getMatchReport` read, refused until the result is committed; route carries `matchId`; embeds full-match statistics. Follow-up: [17](../.scratch/group-g-match-day/issues/17-stoppage-minutes-read-as-second-half.md).
- [13 — Mount live-match tab bar](../.scratch/group-g-match-day/issues/13-mount-live-match-tab-bar.md): Implemented. `SecondaryNav` mounted in `CareerShell`; flat `match-*` routes detected by parser; tab-to-destination mapping covers all match contexts. Follow-up: none.
- [Spec published](../.scratch/group-g-match-day/spec.md): Reconciled spec marking handoff from charting to slicing.
- [Implementation tickets](../.scratch/group-g-match-day/issues/): 8 vertical slices (04–11), all unblocked.
- [32 — Saves need a migration path](../.scratch/group-g-match-day/issues/32-saves-need-a-migration-path.md): resolved 2026-09-21.
  Saves are disposable during development: a save is stamped with a DDL-derived `SAVE_SCHEMA_VERSION`
  and `loadSave` refuses any other with `SaveSchemaMismatchError`, proved against a real 2026-09-02
  save. [31](../.scratch/group-g-match-day/issues/31-committed-matches-store-their-timeline.md) is unblocked and needs no backfill.
- [31 — A committed match stores its timeline](../.scratch/group-g-match-day/issues/31-committed-matches-store-their-timeline.md):
  resolved 2026-09-21. One `MatchTimelineRecorded` event on the match stream, appended in the commit
  transaction; report, summary and statistics load it, a live match re-derives. Proved by flipping a
  mocked engine rule after commit. Unblocks 26 and 29; the restart message split out as
  [33](../.scratch/group-g-match-day/issues/33-a-restarted-live-match-says-so.md).
- [29 — Substitution windows are keyed by half and minute](../.scratch/group-g-match-day/issues/29-substitution-windows-share-a-minute-across-halves.md):
  resolved 2026-09-21. A first-half stoppage forced Substitution and a second-half one at the same
  minute now spend two windows; engine and view agree. Only re-derived (live) matches replay differently.
- 2026-09-21, orchestrator: [26](../.scratch/group-g-match-day/issues/26-forced-substitution-picks-any-squad-player.md) re-blocked on
  [34](../.scratch/group-g-match-day/issues/34-ai-clubs-name-a-bench.md). Decision request 04 makes the named bench the only source of
  substitutes and no AI club names one. [35](../.scratch/group-g-match-day/issues/35-manager-substitutions-come-from-the-bench.md) and
  [36](../.scratch/group-g-match-day/issues/36-a-red-carded-keeper-drags-a-stand-in.md) slice decision requests 04 and 06.
- 2026-09-21, orchestrator: [33](../.scratch/group-g-match-day/issues/33-a-restarted-live-match-says-so.md) re-blocked on
  [37](../.scratch/group-g-match-day/issues/37-match-day-resumes-a-started-match-after-a-restart.md). A started, uncommitted match cannot
  be reopened after an app restart: Match day never reads `pending.matchId` and `startMatch` refuses, so
  the career is stranded rather than replaying from kickoff as 31 and decision request 05 assumed.
- [34 — AI clubs name a bench](../.scratch/group-g-match-day/issues/34-ai-clubs-name-a-bench.md): resolved 2026-09-21. A spare
  Natural-tier goalkeeper first, then by Position Rating. Unblocks [26](../.scratch/group-g-match-day/issues/26-forced-substitution-picks-any-squad-player.md).
  Review split out [38](../.scratch/group-g-match-day/issues/38-pure-packages-sort-without-locale.md) (locale-free sorting in the pure packages).
- [26 — A forced substitution comes from the named bench](../.scratch/group-g-match-day/issues/26-forced-substitution-picks-any-squad-player.md):
  resolved 2026-09-21. Never-on bench players only, like for like first, then bench order; none left →
  10 men. Review split out [39](../.scratch/group-g-match-day/issues/39-an-empty-bench-is-flagged-before-kickoff.md) (empty-bench advisory).
- [35 — A manager's substitution comes from the bench](../.scratch/group-g-match-day/issues/35-manager-substitutions-come-from-the-bench.md):
  resolved 2026-09-21. Off-bench and re-entry refused; the picker lists the kickoff bench minus been-on. The
  bench is fixed at kickoff. Decision request 01's line-up half filed as
  [40](../.scratch/group-g-match-day/issues/40-a-live-change-tactics-changes-only-instructions.md).
- [36 — A red-carded keeper drags a stand-in](../.scratch/group-g-match-day/issues/36-a-red-carded-keeper-drags-a-stand-in.md):
  resolved 2026-09-21. One rule for every way a keeper leaves; decision request 06's note is implemented.
- [37 — Match day resumes a started match after a restart](../.scratch/group-g-match-day/issues/37-match-day-resumes-a-started-match-after-a-restart.md):
  resolved 2026-09-21. `getAwaitingMatch` reads the started match back; the feed replays from kickoff.
  Unblocks 33. Review split out [41](../.scratch/group-g-match-day/issues/41-accepting-a-result-refreshes-the-season-read.md) and
  [42](../.scratch/group-g-match-day/issues/42-quick-result-skips-the-live-reveal.md).
- [33 — A restarted live match says so](../.scratch/group-g-match-day/issues/33-a-restarted-live-match-says-so.md): resolved 2026-09-21.
  A restart-restored match shows a standing notice that it replays from kickoff.
- [38 — The pure packages sort without the locale](../.scratch/group-g-match-day/issues/38-pure-packages-sort-without-locale.md): resolved
  2026-09-21. `compareCodeUnits` everywhere, and an `effect-lint` rule so it stays that way.
- [39 — An empty bench is flagged before kickoff](../.scratch/group-g-match-day/issues/39-an-empty-bench-is-flagged-before-kickoff.md):
  resolved 2026-09-21. A match-readiness advisory on the Kickoff panel and the Tactics Overview.
- [40 — A live Change Tactics changes only the Team Instructions](../.scratch/group-g-match-day/issues/40-a-live-change-tactics-changes-only-instructions.md):
  resolved 2026-09-22. A dismissal sticks; decision request 01 is built. Review split out
  [43](../.scratch/group-g-match-day/issues/43-formation-in-play-reads-the-pitch.md).
- [41 — Starting a match and accepting its result refresh the season read](../.scratch/group-g-match-day/issues/41-accepting-a-result-refreshes-the-season-read.md):
  resolved 2026-09-22. `reachedFullTime` is gone; screens decide "accepted" from the season read.
- [43 — "Formation in play" lists the pitch](../.scratch/group-g-match-day/issues/43-formation-in-play-reads-the-pitch.md): resolved
  2026-09-22. Every live surface now reads who is on from the match, not a Tactic.
- [42 — Quick result skips the live reveal](../.scratch/group-g-match-day/issues/42-quick-result-skips-the-live-reveal.md): resolved
  2026-09-27. The renderer reads and reveals a Quick result's feed at once, with no injury pause. The
  mode is not persisted, so after an app restart the match replays live from kickoff.
- [20 — A command rewrites play already seen](../.scratch/group-g-match-day/issues/20-a-command-rewrites-play-already-seen.md): resolved
  2026-09-27. A live command is stamped at M+1, the minute after the last revealed Match Event
  ([decision request 08](../.scratch/group-g-match-day/decision-request-08-live-command-timing-relative-to-revealed-play.md), Option A);
  the renderer reveals nothing and polls nothing while the command is in flight, then reads on from the
  revealed position. The halftime path is its own guarantee: the engine now emits `HalfTimeReached`
  before the commands it applies at the break, so a halftime instruction lands after the break without
  re-simulating minute 45. Closes the last of the four points in
  [revealed play is immutable](../.agents/notes/implemented/feature/2026-09-19-revealed-play-is-immutable.md).

#### Not yet specified

None — all known decisions resolved, spec written, tickets sliced.

#### Out of scope

- Screen 104 (Match Incidents and Disciplinary Review) — cut from v1 per CONTEXT.md.
- Screens 98/102 (Half-Time and Post-Match Team Talk) — require new morale/team-talk domain model; deferred to a future effort.
- Post-match flow — integration with Season Summary and Continue (Group H scope).

### Map: Group H — Training and Player Development

Label: `wayfinder:map`

#### Destination

A reconciled spec covering all 13 Group H screens (105-117) — training overview, calendar/schedule, training unit assignment, individual training plan, position/role training, additional focus and trait development, coaching assignments, workload and recovery, performance report, player development centre, mentoring groups, youth intake and academy development, training camp and pre-season plan — stating per screen what is already built and what needs new surfaces.

#### Notes

- Training screen (`apps/desktop/src/renderer/training/TrainingScreen.tsx`) is a placeholder stub.
- `SetTrainingFocus` command and `TrainingFocusSetEvent` exist; `PlayerDevelopedEvent` drives per-season attribute changes.
- Training Focus (single-category toggle) is the only training-plan concept; fully implemented with RPC, DB, domain logic.
- Player Development (`developPlayer`, `developPlayersForSeason`) is fully implemented including coach modifier.
- Coach model exists (`coachModifier` in `staff.ts`, `Technical Coaching` manager pillar) but no assignments UI.
- Match-driven condition/recovery engine exists; no training-specific workload model.
- No training calendar, unit, position-training, traits, mentoring, youth-academy-generation, or training-camp code exists.
- The `packages/game-engine` and `packages/shared` are pure — any new training simulation logic goes there.

#### Decisions so far

- [01 — Group H screen inventory survey](../.scratch/group-h-training-and-player-development/issues/01-screen-inventory.md): 0 built, 7 partial, 6 absent. Backend models for Training Focus and Player Development are fully implemented; calendar/units/position-training/traits/mentoring/youth-intake/training-camp have no code.
- [02 — Scope decision for absent screens](../.scratch/group-h-training-and-player-development/issues/02-scope-absent-screens.md): 6 screens in scope for v1 (105, 108, 111, 112, 113, 114); 7 deferred (106, 107, 109, 110, 115, 116, 117). See [Agent Note: Group H v1 scope](../.agents/notes/proposed/architecture/2026-09-15-group-h-v1-scope.md).
- [03 — Build sequence](../.scratch/group-h-training-and-player-development/issues/03-partial-screen-build-sequence.md): Priority 1=Coaching Assignments, 2=Workload/Recovery, 3=Individual Training Plan, 4=Performance Report, 5=Player Dev Centre, 6=Training Overview.
- [Spec published](../.scratch/group-h-training-and-player-development/spec.md): Reconciled spec marking handoff from charting to slicing.
- [Implementation tickets](../.scratch/group-h-training-and-player-development/issues/): 6 vertical slices (04-09), all unblocked except 09 (blocked on 04-08).
- [05 — Workload and Recovery](../.scratch/group-h-training-and-player-development/issues/05-workload-and-recovery.md): shipped. The Rest/Active indicator is derived in main from stored Condition against the engine's non-contact threshold (75), so the renderer never imports the engine; v1 shows stored Condition, not a projection to the next kickoff. The detail line states the last injury's Severity this Season, since the ledger keeps it until Season start. Recorded in [spec.md](../.scratch/group-h-training-and-player-development/spec.md).
- [06 — Individual Training Plan](../.scratch/group-h-training-and-player-development/issues/06-individual-training-plan.md): shipped at `/training/plan/$playerId`, reached from Workload and Recovery rows; focus read from `getSquad`, set through the existing `setTrainingFocus`. Goalkeeping offered only to players with goalkeeping Attributes, renderer-side for now; main-side enforcement filed as [10](../.scratch/group-h-training-and-player-development/issues/10-enforce-goalkeeping-focus-rule.md).
- [07 — Performance Report](../.scratch/group-h-training-and-player-development/issues/07-performance-report.md): partly shipped, needs-info. The coach report stub shows Training Focus and season-over-season Attribute changes from `PlayerDeveloped` events through a new own-club-only read, `getPlayerDevelopmentHistory`. Open: what "coach rating" shows ([decision request 01](../.scratch/group-h-training-and-player-development/decision-request-01-performance-report-coach-rating.md)) and whether events should record pre-development Attributes so the first Season shows changes ([decision request 02](../.scratch/group-h-training-and-player-development/decision-request-02-development-baseline-in-events.md)).
- [08 — Player Development Centre](../.scratch/group-h-training-and-player-development/issues/08-player-development-centre.md): shipped at `/training/development-centre`. One squad-wide read, `getSquadDevelopment`, reuses the Performance Report's season diff; the indicator counts visible Attributes that rose and fell in the latest recorded Season, with an explicit no-comparison state. Rows link to Player Development (given a navigation destination for the first time) and Training Plan. No Workload gauge on 114 in v1.
- [10 — Enforce the Goalkeeping Training Focus rule](../.scratch/group-h-training-and-player-development/issues/10-enforce-goalkeeping-focus-rule.md): shipped. One shared predicate decides which Categories a player may take; `setTrainingFocus` refuses the rest with `TrainingFocusNotOfferedError`. Off-rule rows in older saves stay as they are: they develop the player exactly as None, and any offered choice replaces them.

#### Not yet specified

None — all known decisions resolved. Proceeding to spec.

#### Out of scope

- Screens 106 (Training Calendar), 107 (Training Unit Assignment), 109 (Position/Role Training), 110 (Additional Focus/Traits), 115 (Mentoring Groups), 116 (Youth Intake), 117 (Training Camp/Pre-Season Plan) — deferred to post-v1; each requires a new domain model.
- Game-engine simulation logic for training outcomes — chart UI surfaces first.

### Map: Group I — Scouting and Recruitment

Label: `wayfinder:map`

#### Destination

A reconciled spec covering all 14 Group I screens (118-131): scouting centre, player search, staff
search, scouting assignment, scouting priorities, recruitment focus, player shortlist, staff shortlist,
scouting knowledge, recruitment meetings, squad planner, transfer target comparison, agent and
intermediary information, trial and assessment. It states per screen what is already built, what is in
scope for v1, and in what order the in-scope screens get built.

#### Notes

- Screen specs are copied into this directory (`00_group_i_index.md`, `118_*.md` to `131_*.md`).
- CONTEXT.md § Scouting defines Scout, Scouting Assignment, Scouting Progress, Attribute Range, Fully
  Scouted and Scouting Report. Use those terms; a spec's own wording does not override them.
- The [team-scout-report](../.scratch/team-scout-report/) effort shipped a club-scoped Team Scout Report.
  Check it before treating any scouting surface as absent.
- Follow the [Group H](../.scratch/group-h-training-and-player-development/map.md) precedent: inventory, then
  scope, then build sequence, then spec and tickets.

#### Decisions so far

- [01 — Group I screen inventory survey](../.scratch/group-i-scouting-and-recruitment/issues/01-screen-inventory.md): 0 built, 5 partial (four placeholder stubs and the assignment commands), 9 absent. The Scouting model behind the Team Scout Report exists; shortlists, focuses, priorities, meetings, planner, agents, trials and staff hiring do not. The transfer market shows exact figures for unscouted Players.
- [02 — Scope decision for missing systems](../.scratch/group-i-scouting-and-recruitment/issues/02-scope-absent-screens.md): 3 screens in scope for v1 (118, 121, 126), 11 deferred. See [Agent Note: Group I v1 scope](../.agents/notes/implemented/architecture/2026-09-15-group-i-v1-scope.md).
- [03 — Build sequence](../.scratch/group-i-scouting-and-recruitment/issues/03-partial-screen-build-sequence.md): 1=Scouting Assignment, 2=Scouting Knowledge, 3=Scouting Centre. New Player targets wait for [decision request 01](../.scratch/group-i-scouting-and-recruitment/decision-request-01-knowledge-limited-player-reads.md).
- [Spec published](../.scratch/group-i-scouting-and-recruitment/spec.md): reconciled spec, handoff from charting to slicing.
- [Implementation tickets](../.scratch/group-i-scouting-and-recruitment/issues/): 3 vertical slices (04-06); 06 blocked on 04 and 05. 07 added during 04.
- [04 — Scouting Assignment screen](../.scratch/group-i-scouting-and-recruitment/issues/04-scouting-assignment-screen.md): shipped at `/scouting-assignment`. Club assignments take `expectedReportId` from the Club's `getTeamScoutReport`; a Club target reads "Tracked per Player".
- [07 — Typed RPC errors survive the IPC boundary](../.scratch/group-i-scouting-and-recruitment/issues/07-typed-rpc-errors-survive-ipc.md): shipped. Found in 04: every typed error reached the renderer as `{ name: "Error" }`. `handleRpc` now encodes failures with the method's error schema.
- [05 — Scouting Knowledge screen](../.scratch/group-i-scouting-and-recruitment/issues/05-scouting-knowledge-screen.md): shipped at `/scouting-knowledge`. One read, `getScoutingKnowledge`, gives per-Club coverage and Knowledge Confidence over the whole squad and per-Player Scouting Progress, with no figure. Knowledge Confidence now also reads live per Club (CONTEXT.md).
- [06 — Scouting Centre screen](../.scratch/group-i-scouting-and-recruitment/issues/06-scouting-centre-screen.md): shipped on the `scouting` route, aggregating the Scout roster and coverage summary with links to 121 and 126. All three v1 screens shipped; follow-up [08](../.scratch/group-i-scouting-and-recruitment/issues/08-shared-read-state-helper.md) extracts the read-state code repeated across five screens.
- [08 — One read-state helper for the scouting and training screens](../.scratch/group-i-scouting-and-recruitment/issues/08-shared-read-state-helper.md): shipped. `readState` serves all five sites; `ReadStateMessage` serves three, since the Scouting Centre's section lines are not page messages.
- [09 — The Transfer market reads by Scouting Progress](../.scratch/group-i-scouting-and-recruitment/issues/09-the-market-reads-players-by-scouting-progress.md): resolved 2026-09-23 against the tree. Every rival and Free Agent on the market reads as a `KnownFigure` by the human club's progress on him — a Range until Fully Scouted (`packages/shared/src/rules/scouting.ts`), exact at it. The wire carries no exact figure below Fully Scouted; `CONTEXT.md` **Listed** lost its full-information Transfer Value clause in the same commit. See the ticket's Answer for per-criterion evidence.
- [10 — The Player screens read by Scouting Progress](../.scratch/group-i-scouting-and-recruitment/issues/10-player-screens-read-players-by-scouting-progress.md): resolved 2026-09-23. `getPlayerProfile` gates every figure by the human club's Scouting Progress through the ticket-09 shared rule — a Range below Fully Scouted, exact at it — for every player outside the manager's squad; own-squad players skip the lookup. The profile wire (same `PlayerFigureSchema`) and the market can no longer disagree about one Player, and Player screens, header band and market tables share one renderer. The same commit filed the four pre-existing e2e reds it surfaced as [desktop-suite-red 15/16](../.scratch/desktop-suite-red/issues/15-empty-load-list-specs-assert-retired-copy.md). See the ticket's Answer for per-criterion evidence.
- [11 — Player Search reads by Scouting Progress](../.scratch/group-i-scouting-and-recruitment/issues/11-player-search-reads-by-scouting-progress.md): resolved 2026-09-23 (`58eab5d4`). One `getPlayerSearch` read covers the whole save in one result pool; every rival/Free Agent maps through the ticket-09 shared rule (Range below Fully Scouted, exact at it, own squad exact), so the wire carries no exact figure below Fully Scouted. `PlayerSearchScreen` retires the `playerSearch` WIP placeholder. See the ticket's Answer for per-criterion evidence.
- [12 — Transfer Target Comparison reads by Scouting Progress](../.scratch/group-i-scouting-and-recruitment/issues/12-transfer-target-comparison-reads-by-scouting-progress.md): sliced 2026-09-23 from the same decision request, blocked on 11. 11 shipped; now the frontier. See the ticket.
- [13 — Scout Player from the Player Profile](../.scratch/group-i-scouting-and-recruitment/issues/13-scout-player-from-the-player-profile.md): resolved 2026-09-28. The Profile's career bar carries Scout Player, which opens a Scout picker over the existing `assignScout` command; the scouting key alone is invalidated. Held with a reason for the manager's own Player or a club with no Scouts. The full `test` gate was red on four unrelated main-process season timeouts at resolution; see the ticket's Answer.

#### Not yet specified

None for v1. Screens 119 and 129 are sliced ([11](../.scratch/group-i-scouting-and-recruitment/issues/11-player-search-reads-by-scouting-progress.md), [12](../.scratch/group-i-scouting-and-recruitment/issues/12-transfer-target-comparison-reads-by-scouting-progress.md)).

#### Out of scope

- Screens 120 (Staff Search) and 125 (Staff Shortlist): no staff hiring, and no roles beyond `coach` and `scout`.
- Screens 122 (Scouting Priorities), 123 (Recruitment Focus), 124 (Player Shortlist): each needs a new model.
- Screens 127 (Recruitment Meetings), 128 (Squad Planner), 130 (Agent and Intermediary Information), 131 (Trial and Assessment): each needs a new model and leans on Group J.
- Assignment duration, cadence, travel, priority, and competition, nation or region targets.

### Map: Group J — Transfers, Contracts and Negotiations

Label: `wayfinder:map`

#### Destination

A reconciled spec covering all 15 Group J screens (132-146): transfer centre, incoming transfer offer,
make transfer offer, transfer negotiation, loan offer and negotiation, player contract offer, player
contract negotiation, staff contract offer and negotiation, contract renewal, contract expiry and Bosman
status, transfer completion and registration, transfer cancellation and withdrawal, transfer clauses and
installments, transfer budget and wage budget review, transfer history and audit trail. It states per
screen what is already built, what is in scope for v1, and in what order the in-scope screens get built.

#### Notes

- Screen specs are copied into this directory (`00_group_j_index.md`, `132_*.md` to `146_*.md`).
- CONTEXT.md § Transfers & contracts (around line 502) is binding vocabulary.
- The transfer market already exists (`renderer/transfers/`, RPCs `getTransfersScreen`, `placeBid`,
  `respondToBid`, `respondAsBidder`, `signFreeAgent`, `renewContract`). Inventory before assuming absence.
- Group I's [decision request 01](../.scratch/group-i-scouting-and-recruitment/decision-request-01-knowledge-limited-player-reads.md)
  (knowledge-limited Player reads) bears directly on any Group J screen that shows another club's Player.
- Follow the [Group I](../.scratch/group-i-scouting-and-recruitment/map.md) precedent: inventory, scope, build
  sequence, then spec and tickets.

#### Decisions so far

- [01 — Group J screen inventory survey](../.scratch/group-j-transfers-contracts-and-negotiations/issues/01-screen-inventory.md): 0 built, 6 partial, 9 absent, all working UI on one Transfers screen. Six screens contradict CONTEXT.md's single-round Bid and never-renegotiated Contract, and the market shows exact figures for other clubs' Players.
- [02 — Scope decision for missing systems](../.scratch/group-j-transfers-contracts-and-negotiations/issues/02-scope-absent-screens.md): 4 own-club screens in v1 (140, 141 without Bosman, 145, 146), 11 deferred. See [Agent Note: Group J v1 scope](../.agents/notes/proposed/architecture/2026-09-15-group-j-v1-scope.md).
- [03 — Build sequence](../.scratch/group-j-transfers-contracts-and-negotiations/issues/03-partial-screen-build-sequence.md): 1=Contract Renewal, 2=Contract Expiry, 3=Budget Review, 4=Transfer History.
- [Spec published](../.scratch/group-j-transfers-contracts-and-negotiations/spec.md): reconciled spec, handoff from charting to slicing.
- [Implementation tickets](../.scratch/group-j-transfers-contracts-and-negotiations/issues/): 4 vertical slices (04-07), all unblocked.
- [04 — Contract Renewal](../.scratch/group-j-transfers-contracts-and-negotiations/issues/04-contract-renewal.md): resolved 2026-09-21 (`f60a3093`). The Player Contract screen renews an own-club Player's Contract for a chosen length; a Contract renews only in its last contracted year, per [decision request 01](../.scratch/group-j-transfers-contracts-and-negotiations/decision-request-01-when-a-contract-can-be-renewed.md), and a mid-term press gets `ContractRenewalNotDueError`'s sentence.
- [05 — Contract Expiry](../.scratch/group-j-transfers-contracts-and-negotiations/issues/05-contract-expiry.md): resolved. Screen 141 shipped 2026-09-15.
- [06 — Budget Review](../.scratch/group-j-transfers-contracts-and-negotiations/issues/06-budget-review.md): resolved. Screen 145 shipped 2026-09-15.
- [07 — Transfer History](../.scratch/group-j-transfers-contracts-and-negotiations/issues/07-transfer-history.md): resolved. Screen 146 shipped 2026-09-15 on
  its own route `career/$saveId/transfer-history`, leaving the club-scoped stub alone. See
  [Agent Note](../.agents/notes/implemented/architecture/2026-09-15-transfer-history-takes-its-own-career-route.md).
- [08 — Navbar entries for 141 and 145](../.scratch/group-j-transfers-contracts-and-negotiations/issues/08-navbar-entries-for-141-and-145.md): resolved
  2026-09-16. All three v1 screens are in the Recruitment submenu with `g 4 <key>` bindings; the
  submenu strip now scrolls, since ten entries overflow the default window.
- [Decision request 02](../.scratch/group-j-transfers-contracts-and-negotiations/decision-request-02-club-scoped-transfer-history-index.md): open. Whether the
  save takes two more indexes for the club-scoped `player_transfers` read. Raised by 07, which ships
  without them.
- [09 — The Player Contract Offer reads by Scouting Progress](../.scratch/group-j-transfers-contracts-and-negotiations/issues/09-player-contract-offer-reads-by-scouting-progress.md): sliced 2026-09-23 from [Group I decision request 01](../.scratch/group-i-scouting-and-recruitment/decision-request-01-knowledge-limited-player-reads.md), now answered and shipped (group-i 09/10). 137 was out of scope only pending that decision; it is now buildable. See the ticket.
- [09 — The Player Contract Offer reads by Scouting Progress](../.scratch/group-j-transfers-contracts-and-negotiations/issues/09-player-contract-offer-reads-by-scouting-progress.md): resolved 2026-09-26. Screen 137's offer terms are a read, not a form's guesswork: the shared `progressForReading` rule now has one loader (`club/scoutingProgress.ts`) behind all seven Player reads, and `knowledge-agreement.test.ts` holds them to equal *values* for one Player rather than to equal shapes. `signFreeAgent` takes role, length and wage and the signing lands the Player in the squad. Two things the ticket could not settle, both escalated rather than decided here: the wage band contradicts ADR-0005's wage clause and CONTEXT.md (see [decision request 03](../.scratch/group-j-transfers-contracts-and-negotiations/decision-request-03-is-a-wage-offered-inside-a-knowledge-band.md)), and the signed Role rides the event payload with no projection to read it, because persisting it needs a column and there is no save migration path ([ticket 32](../.scratch/group-g-match-day/issues/32-saves-need-a-migration-path.md)).
- [Decision request 03](../.scratch/group-j-transfers-contracts-and-negotiations/decision-request-03-is-a-wage-offered-inside-a-knowledge-band.md): open, raised by 09. Whether an offered wage is a formula figure the manager confirms or a band he picks inside. Blocks the prose (ADR-0005, two CONTEXT.md entries), not the queue.
- [10 — Make Offer from the Player Profile](../.scratch/group-j-transfers-contracts-and-negotiations/issues/10-make-offer-from-the-player-profile.md): filed 2026-09-28, `ready-for-agent`. A way into the shipped Bid Composer from the Player Profile: the `transfers` destination takes an optional `playerId` and opens on the right tab with that Player selected. No change to the composer itself.

#### Not yet specified

None for v1.

#### Out of scope

- Screens 132 (Transfer Centre) and 134 (Make Transfer Offer): served by the shipped Transfers screen's market and Bid composer, which read by Scouting Progress since group-i ticket 09. Screen 137 is [ticket 09](../.scratch/group-j-transfers-contracts-and-negotiations/issues/09-player-contract-offer-reads-by-scouting-progress.md), not out of scope.
- Screens 135 (Transfer Negotiation), 136 (Loan Offer), 138 (Player Contract Negotiation), 139 (Staff Contract Offer), 144 (Clauses and Installments), and 141's Bosman and pre-contract part: contradict CONTEXT.md (single-round Bid, no loans, never-renegotiated Contract, no Staff wages). Need a domain change a human makes.
- Screens 133 (Incoming Transfer Offer), 142 (Completion and Registration), 143 (Cancellation and Withdrawal): already served by the Transfers screen's Bid tables; a dedicated screen needs clause, registration or cancellation models.

### Map: Group K — Club Operations, Board and Facilities

Label: `wayfinder:map`

#### Destination

A Group K reconciliation covering the 14 club operations, board, and facilities screens (147–160): a `spec.md` stating per screen what v1 must deliver, plus a deviation register recording every place the imported spec is knowingly not followed. Ready to hand to `/to-spec` → `/to-tickets`.

#### Notes

**Domain**: local single-player football-management sim, Electron + Effect. Vocabulary in CONTEXT.md.

**Skills every session should consult**: `grilling`, `domain-modeling`, `doc-standards`, `effect-code`.

**The imported specs are not requirements.** They read as generated from a generic template. Where the spec and codebase disagree, existing decisions win unless a ticket overturns them.

**Most Group K screens have no v1 counterpart.** Facilities, affiliates, commercial/sponsorship, supporter engagement, and stadiums do not exist in v1. Board Objectives (Screen 148) is partially modeled in CONTEXT.md. Staff Responsibilities (Screen 152) may partly overlap with the Staff entity.

#### Decisions so far

<!-- none yet -->

#### Not yet specified

- Which screens are in v1 scope vs deferred vs out-of-scope
- Whether Board Objectives (Screen 148) needs a UI screen or is satisfied by the existing model
- Whether Staff Responsibilities (Screen 152) overlaps with the existing Staff entity enough to skip
- What "Board Overview" means when the President is the Board's face and objectives are League-position bands
- Facility/stadium/affiliate/commercial axes — confirmed out of v1 scope or part of a later effort?

#### Out of scope

- **Multiplayer, network sessions, cloud.** Removed wholesale per standing decision.
- **Off-device telemetry.** No backend.

### Map: Group L — Competitions, Nations and World Information

Label: `wayfinder:map`

#### Destination

A reconciliation spec and deviation register for screens 161–180 (Competition Overview through World
Football Overview), stating per screen what the implementation must do and what deviations exist
from the imported spec at
`docs/specs/group_l_competitions_nations_and_world_information/`.

#### Notes

**Domain**: local single-player football-management sim. CONTEXT.md already models Competition,
League, Fixture, Cup Tie, League Table, Nation, Pyramid, Tier, Season, Calendar, Selection Intent,
Effective Selection, Simulation Depth, and many more. Several screens here overlap with known
implementations (League Table, Fixtures).

**Skills**: `cm-wayfinder` for charting; `grilling` and `domain-modeling` for ambiguous or
conflicting specs; `doc-standards` for any spec/reconciliation writing.

**Precedent**: Group A established the reconciliation pattern — audit each screen against existing
implementation, record deviations (out-of-scope, contradicted, deferred, renamed), write deviation
register, then spec → slice → implement.

**Blocking impact**: Several screens (174 Nation Overview, 175 Nation Competitions) depend on the
Nation/Competition data model already built by active-leagues-setup, world-data-model, etc. The
national team screens (176–178) depend on national team modelling which does not exist yet.

#### Decisions so far

- [01 — Screen inventory](../.scratch/group-l-competitions-nations-and-world-information/issues/01-screen-inventory.md): All 18 screens (161–180) are absent or
  partial WIP placeholders. 11 have routes + 15-line `<h1>` stubs but zero real content; 7 have no
  route at all. The binding constraint is the data layer — `packages/shared`, `packages/contracts`,
  and `packages/game-engine` have no models, RPC schemas, or simulation code for competitions,
  tables, results, statistics, stages, draws, awards, history, records, world rankings, or nation
  football data. Every screen is blocked at the contract layer.

- [02 — v1 scope](../.scratch/group-l-competitions-nations-and-world-information/issues/02-v1-scope.md): Screens 162–164 (Competition Table, Fixtures, Results)
  and 161 (Competition Overview) are in v1. The national team screens (176–178) and world-ranking
  screens (179–180) are out of scope for v1. The remaining 11 screens are deferred — routes exist
  but data models need building later. Priority: 162 → 163/164 → 161.

- [03 — Competition Table screen](../.scratch/group-l-competitions-nations-and-world-information/issues/03-competition-table-screen.md): WIP stub replaced with
  real screen. New `getCompetitionTable` RPC (`packages/contracts`), backend handler (`season/`),
  atom (`queries.ts`), and screen component. Standings rendered from existing `computeStandings`
  function via `competitionTableAtom(saveId, competitionId)`. 5 tests cover heading, rows, errors,
  and navigation. New RPC needed a nested `Atom.family` pattern to avoid `MutableHashMap`
  reference-identity issue.

- [04 — Competition Fixtures screen](../.scratch/group-l-competitions-nations-and-world-information/issues/04-competition-fixtures-screen.md): WIP stub replaced
  with a real Fixture list. New `getCompetitionFixtures` RPC scoped by `competitionId` rather than
  widening `getFixtures`, which stays the human's own calendar. The shared SQL was extracted into
  `fixturesForCompetition` so the two reads cannot drift; the helper keeps `competitionId` nullable
  so the human read's "no club chosen yet" case still binds SQL `NULL`. An unplayed Fixture reads
  **Unplayed**, never a fabricated `0 - 0` — CONTEXT.md lists *Schedule* as an _Avoid_ term, so
  "scheduled" was rejected. Review caught the new RPC omitting `PendingFixtureIntegrityError` from
  its error union, which typecheck cannot see because the handler is typed
  `Effect<unknown, unknown>`; fixed before commit. Ticket 03 shipped the same omission in
  `getCompetitionTable` — filed as [05](../.scratch/group-l-competitions-nations-and-world-information/issues/05-competition-read-followups.md).

- [05 — Competition read follow-ups](../.scratch/group-l-competitions-nations-and-world-information/issues/05-competition-read-followups.md): the narrow-error-union
  defect ticket 04 found turned out to be systemic. Audited every method in `AppRpcs` by typing the
  handler map against each declared error schema and reading what `tsc` rejected — 11 mismatches,
  8 fixed (`getCompetitionTable`, both Manager Profile reads, `respondToBid`, `respondAsBidder`,
  `signFreeAgent`, `renewContract`, `createSave`). `ManagerProfileNotFoundError` was schema'd and
  raisable but named by no union at all. Three classes stay open as design questions —
  `SqlError` across roughly every save-scoped handler, engine invariant errors, and payload
  `SchemaError` — carried by
  [decision-request-01](../.scratch/group-l-competitions-nations-and-world-information/decision-request-01-rpc-error-channel.md). An `effect-lint` rule is the
  wrong tool (the needed fact is a type, not a syntax pattern); the permanent gate is the probe
  itself as a type alias, blocked only by `SqlError`. Both fixture lists now read `Unplayed`.

- [06 — Deferred Competition Fixtures surface](../.scratch/group-l-competitions-nations-and-world-information/issues/06-competition-fixtures-deferred-surface.md):
  none of the deferred controls (filters, round/stage and calendar navigation, export, coverage
  states) enter v1 — each needs data the game does not model, and the imported spec's coverage tiers
  are not this game's Simulation Depth. Screen 164 is next and should reuse
  `getCompetitionFixtures` rather than add a third fixture read, then 161.

#### Not yet specified

- Screen inventory completed (ticket 01). All 18 screens are effectively absent. Next steps:
  - Data model audit: what Competition data already exists vs what needs building
  - v1 scope: which screens are in/out of scope given the data constraints
  - Deviation register: how the imported spec maps to what we'll actually build
- National team modelling (screens 176–178): the codebase has no national team concept, no
  international fixtures, no national team squad management. These may be out-of-scope for v1.

#### Out of scope

- **National team management as a playable system.** Screens 176–178 (National Team Overview,
  National Team Squad, International Fixtures and Results) describe surfaces for managing a national
  team, which requires a national team manager career track and international match calendar.
  National teams exist as data (Nations with generated squads, perhaps for view-only reference),
  but managing them is a separate effort (Group O).

### Map: Group M — Media, Press and Communications

Label: `wayfinder:map`

#### Destination

A reconciliation spec and deviation register for screens 181–193 (Media Centre through
Communication History and Transcript), stating per screen what the implementation must do and what
deviations exist from the imported spec at
`docs/specs/group_m_media_press_and_communications/`.

#### Notes

**Domain**: local single-player football-management sim, Electron + event-sourced Effect domain
layer. Charted following the Group A and Group L reconciliation precedent: inventory each screen
against the existing implementation, decide v1 scope, record deviations (out-of-scope, contradicted,
deferred, renamed), then spec → slice → implement.

**Skills**: `cm-wayfinder` for charting; `grilling` and `domain-modeling` for the scope and
vocabulary questions, both of which are human-in-the-loop; `doc-standards` for the spec and
deviation register.

**What makes this group different from L.** Group L was a set of *views* over data the game already
half-modelled. Group M is largely a *game system*: press conferences, interviews and statements are
inputs the player makes, with consequences (morale, reputation, relationships) that must be
modelled, simulated and persisted. A reconciliation that treats these as screens over existing data
will understate the work by an order of magnitude. The v1 scope question here is therefore heavier
than L's, and it is a design decision about what the game *is* — not an implementation call an agent
should make alone.

**The adjacent concept that already exists.** CONTEXT.md models **News Message** and **News Inbox**
(lines 907–926), shipped as Screen 24, and is explicit that the News Inbox is "a career record and
never a queue of work". It lists _Avoid_ terms for it: News feed, Message centre, Notification
centre. Screen 181 "Media Centre" is the obvious collision: if it becomes a second inbox-like
surface, the domain grows two names for one idea. Whether Media Centre is a distinct concept, a
facet of the News Inbox, or a renaming, is the first vocabulary question this map owes an answer to.

**Grounding** — ticket 01 confirmed the charting hypothesis and went further: not only are all 13
screens absent, CONTEXT.md affirmatively excludes media handling from v1 rather than merely omitting
it. The Calendar's design depends on that absence. This map's likely destination is therefore a
deviation register recording that Group M is out of v1, not a spec to build from — unless a human
overturns the exclusion.

#### Decisions so far

- [01 — Screen inventory](../.scratch/group-m-media-press-and-communications/issues/01-screen-inventory.md): all 13 screens are Absent — not even
  stubbed, though the repo has a stub idiom ~30 screens use. No supporting data exists either: no
  manager reputation, no morale, no board opinion (one annual verdict from league position plus a
  consecutive-miss counter), no relationship model, and no command that produces text. The game does
  generate prose — Commentary Templates and the News copy table — both deterministic, neither a
  generator. **The decisive finding is that CONTEXT.md already excludes this group from v1**, at
  751-753 ("media handling ... none of those systems ship in v1") and at 445-447, where the absence
  of "press content" is the stated reason the Calendar needs no finer clock. That reframes ticket 02
  from a scope question into a question about overturning a recorded decision.

- [02 — Does CONTEXT.md's v1 exclusion get overturned?](../.scratch/group-m-media-press-and-communications/issues/02-v1-scope.md): **no.** Option A —
  the exclusion stands, all 13 screens stay out of v1, CONTEXT.md is unchanged because it was
  already right. Reopening would be a programme (reputation, morale, consequence decider,
  persistence, balance, a finer Calendar), not a group, and would require amending CONTEXT.md in the
  same commit as the first code.

#### Not yet specified

Nothing. Ticket 02 closed the map: with Group M out of v1 there is no further fog *toward* this
destination. The modelling questions the fog used to hold — consequence model, where media sits in
the event model, determinism of generated content, the Inbox relationship — all moved to
**Out of scope**, since they are only reachable by reopening the scope decision, which would be a
fresh effort rather than a resumption of this one.

#### Out of scope

- **Redesigning the News Inbox (Screen 24).** It is shipped and modelled; this map may need to
  *name its boundary* against Media Centre, but changing it belongs to its own effort.
- **Multiplayer and administration surfaces.** Group R's territory, even where a media screen
  implies a shared or hosted context.
- **National team media.** Group O owns national team management; media attached to it follows that
  effort, not this one.
- **The whole of screens 181-193**, per ticket 02. Out of v1, not deferred within it.
- **A media consequence model** — manager reputation, morale, board opinion, relationships. None
  exists; each would be its own effort, and only if the scope decision is reopened.
- **A finer-grained Calendar.** Screens 184/185 assume a clock that stops on non-Fixture dates.
  CONTEXT.md:445-447 makes the absence of press content the reason no such clock exists, so this
  cannot change without the scope decision changing first.

### Map: Group N — Jobs, Employment and Manager Career

Label: `wayfinder:map`

#### Destination

A reconciliation spec and deviation register for screens 194–207 (Job Centre through Employment
History and Career Milestones), stating per screen what the implementation must do and what
deviations exist from the imported spec at
`docs/specs/group_n_jobs_employment_and_manager_career/`.

#### Notes

**Domain**: local single-player football-management sim, Electron + event-sourced Effect domain
layer. Charted following the Group M reconciliation precedent: inventory each screen against the
existing implementation, decide v1 scope, record deviations (out-of-scope, contradicted, deferred,
renamed), then spec → slice → implement.

**Skill**: `cm-wayfinder` for charting.

**Existing architecture note**: [The job market is deferred; a sacking still ends the career]
(../../../.agents/notes/implemented/architecture/2026-09-13-job-market-deferred-sacking-stays-terminal.md)
already rules the core question: Group N is deferred with anchor `unscheduled`, and sacking stays
terminal. This map's job is to confirm that finding per screen and produce the deviation register.

**What makes this group different from M.** Group M was unsettled — CONTEXT.md's exclusion was spread
across two non-obvious lines and could have been overturned. Group N's exclusion is explicit and
recorded in an `implemented` Agent Note with proving tests. The charting here is a confirmation pass,
not an open scope question.

**Grounding**: all 14 screens are absent from the shipped renderer, RPC layer, schema, and shared
domain — no stubs, no routes, no tables, no components. The existing codebase models only:
- **Manager Profile** (Screen 19) — identity, Pillars, retirement
- **Manager Status** — `consecutive_misses`, `archived_cause`, `last_outcome`
- **Board Verdict** — `advance.ts` fires seasons and judges objectives
- **Sacking/Retirement events** — `ManagerSacked`, `ManagerRetired` archive the save

Screen 203 (Dismissal) and Screen 202 (Resign) overlap the existing Manager Sacked / Manager
Retired events as views of the terminal outcome. Screen 207 (Employment History) overlaps Manager
History (Screen 30).

#### Decisions so far

- [01 — Screen inventory](../.scratch/group-n-jobs-employment-and-manager-career/issues/01-screen-inventory.md): all 14 screens are Absent — no routes, no
  stubs, no RPCs, no DB tables, no components, no shared models. Narrow overlap exists for Screens
  202, 203 and 207 against existing Manager Sacked / Manager Retired events and Manager History,
  but no dedicated Group N implementation surface uses any of them.
- [02 — v1 scope](../.scratch/group-n-jobs-employment-and-manager-career/issues/02-v1-scope.md): the existing deferred decision holds. All 14 screens stay
  out of v1, deferred unscheduled. CONTEXT.md's job market exclusion (810-812) and _Avoid_ of
  Resignation (821) remain accurate.

#### Not yet specified

Nothing. The existing Agent Note settles the core question; this map closes on the inventory and
confirmation pass.

#### Out of scope

- **A job market.** Vacancies, applications, interviews, offers, appointments, and the multi-club
  career path they imply are deferred per the existing Agent Note. Screen 194–201 as imported.
- **Manager reputation systems.** Screen 205 — no reputation model exists, and no data stores it.
- **Coaching badges and qualifications.** Screen 206 — no qualifications model exists, and the
  Manager Pillar system is the shipped substitute.
- **Resignation as a job-market transition.** Screen 202 as imported — the game has no referent for
  leaving a club for another. Manager Retired is the existing terminal-resignation equivalent.
- **Multiplayer and administration surfaces.** Group R's territory, even where a career screen
  implies a shared or hosted context.

### Map: Group O — National Team Management

Label: `wayfinder:map`

#### Destination

A reconciliation spec and deviation register for screens 208–221 (National Team Management Centre
through International Management History), stating per screen what the implementation must do and
what deviations exist from the imported spec at
`docs/specs/group_o_national_team_management/`.

#### Notes

**Domain**: local single-player football-management sim, Electron + event-sourced Effect domain
layer.

**Existing Agent Note**: [National teams are deferred, not ruled out]
(../../../.agents/notes/implemented/architecture/2026-09-13-national-teams-deferred-not-ruled-out.md)
already settles this group: deferred, unscheduled. CONTEXT.md's **Nationality** entry confirms
"national teams are not modelled" and lists them as deferred.

**Grounding**: all 14 screens are absent from the shipped renderer, RPC layer, schema, and shared
domain — no stubs, no routes, no components. CONTEXT.md:102-103 explicitly states "work permits and
national teams are not modelled."

#### Decisions so far

- [01 — Screen inventory](../.scratch/group-o-national-team-management/issues/01-screen-inventory.md): all 14 screens are Absent — no routes, no
  stubs, no RPCs, no DB tables, no components. CONTEXT.md:103 confirms "national teams are not
  modelled."
- [02 — v1 scope](../.scratch/group-o-national-team-management/issues/02-v1-scope.md): the existing deferred decision holds. All 14 screens stay
  out of v1, deferred unscheduled.

#### Not yet specified

Nothing. The existing Agent Note and CONTEXT.md settle the scope.

#### Out of scope

This map produces a deviation register — everything here is deferred per the existing note, not
out of scope. Will any screen land `out-of-scope` in the register? Only if a shipped screen
contradicts it. None do — these screens are merely absent.

- **Screens 208–221 as imported.** All deferred per the existing Agent Note. Building national teams
  would require international fixtures in the Calendar, eligibility (a second Nationality per player),
  and club-release rules — a new effort with its own map.

### Map: Group P — Statistics, Records and Analytics

Label: `wayfinder:map`

#### Destination

A reconciliation spec and deviation register for screens 222–235 (Analytics Centre through Analytics
Export and Scheduled Reports), deciding per screen whether it is in v1 scope, deferred, renamed,
contradicted, or out of scope.

#### Notes

**Domain**: local single-player football-management sim, Electron + event-sourced Effect domain
layer.

**Existing decisions touching this group:**
- Per-player statistics are deferred, not ruled out (Agent Note 2026-09-19). Screen 54 (Group D)
  and Screen 166 (Group L) are the existing dependents; Group P owns the store.
- Two blocking decisions were approved 2026-09-19 that affect this group.

**Dependencies**: Group P depends on Groups G (match day), L (competitions), and Q (season
transitions) — accumulated match and season stats must exist before analytics can read them. The
SPEC-ROADMAP places Group P in Tier 5: last among gameplay groups.

**Known disagreements between the spec and shipped game:**
- Screen 228 Expected Performance needs a chance-quality model the engine does not produce.
- Screens 234-235 Custom Report Builder and Analytics Export are flagged as heavy for a local
  single-player game and may land `out-of-scope` rather than `deferred`.

#### Decisions so far

- [01 — Screen inventory](../.scratch/group-p-statistics-records-and-analytics/issues/01-screen-inventory.md): all 14 screens are Absent — no routes, no
  components, no statistics infrastructure beyond match-level aggregates. The engine produces 9
  countable statistics; four are Unavailable. No charting library exists. No season-level or
  player-level stats exist.

- [02 — v1 scope](../.scratch/group-p-statistics-records-and-analytics/issues/02-v1-scope.md): Option A. 222–227, 229–233 deferred; 228, 234, 235 out of scope; nothing built in v1. [Agent Note](../.agents/notes/proposed/architecture/2026-09-21-group-p-v1-scope.md).

### Map: Group Q — Awards, Honours and Season Transitions

Label: `wayfinder:map`

#### Destination

A reconciliation spec and deviation register for screens 236–249 (Awards Centre through Pre-Season
Readiness Checklist), deciding per screen whether it is in v1 scope, deferred, renamed,
contradicted, or out of scope.

#### Notes

**Domain**: local single-player football-management sim, Electron + event-sourced Effect domain
layer.

**Existing codebase overlap**: The `season_summary` read model exists in the schema and is used in
shipped code — it derives from `competition_participants` and `board_objective`. CONTEXT.md defines
`Season Concluded`, `Board Objective Judged`, `Manager Warned`, `Manager Sacked`, `Manager Retired`,
`Archived Save`, and `Verdict` — all domain concepts Group Q would build on.

**The job-market note depends on Group Q**: The Agent Note deferring Group N says reopening should
wait until Group Q is reconciled, because a job market depends on season transitions.

**Known disagreements between the spec and shipped game:**
- Screens 244 (Promotion Relegation) and 246 (Season Transition / Competition Rollover) are
  load-bearing: rollover already exists in the shipped game, so the spec may partially contradict
  shipped behaviour.
- The spec's "resumable, checkpointed" rollover conflicts with the one-transaction advance recorded
  in the Group B ledger for Screen 23.
- Awards screens (236–241) are entirely new — no awards model exists.

#### Decisions so far

- [01 — Screen inventory](../.scratch/group-q-awards-honours-and-season-transitions/issues/01-screen-inventory.md): zero Group Q screens have a dedicated
  route or component. Six screens have partial data-layer overlap (season_summary, rollover,
  budgets); the rest are entirely absent.
- [02 — v1 scope](../.scratch/group-q-awards-honours-and-season-transitions/issues/02-v1-scope.md): 243 renamed (ships as Season Summary, which ticket 01 missed); every other screen deferred; nothing built in v1. [Agent Note](../.agents/notes/proposed/architecture/2026-09-21-group-q-v1-scope.md).

### Map: Group R — Multiplayer Administration

Label: `wayfinder:map`

#### Destination

A reconciliation spec and deviation register for screens 250–262 (Multiplayer Centre through
Participant Removal and Session Moderation), stating per screen that the group is disposed in full.

#### Notes

**Domain**: local single-player football-management sim, Electron + event-sourced Effect domain
layer.

**Existing reconciliation ledger**: A durable
[RECONCILIATION.md](../docs/specs/group_r_multiplayer_administration/RECONCILIATION.md) already
exists at the spec source, ruling every screen `out-of-scope` / `Disposed in full`. The multiplayer
axis was removed wholesale at Group A. CONTEXT.md's **Save** entry fixes exactly one human manager
per Save. This effort is a confirmation pass — no new analysis is owed.

#### Decisions so far

- [01 — Disposal confirmation](../.scratch/group-r-multiplayer-administration/issues/01-disposal-confirmation.md): all 13 screens are disposed in
  full per the existing ledger at
  `../../../docs/specs/group_r_multiplayer_administration/RECONCILIATION.md`. No section-by-section
  pass is owed — no screen has residue on another axis.

#### Not yet specified

Nothing. The ledger is complete.

#### Out of scope

- **Screens 250–262 as imported.** All disposed in full. Multiplayer is not part of this game.

### Map: Group S — Search, Utilities and Reference

Label: `wayfinder:map`

#### Destination

A reconciliation spec and deviation register for screens 264–277 (Global Search through Application
Information and Content Manifest), deciding per screen whether it is in v1 scope, deferred,
renamed, contradicted, out of scope, or already shipped under another name.

#### Notes

**Domain**: local single-player football-management sim, Electron + event-sourced Effect domain
layer.

**Group S is unique**: three screens are already shipped under other efforts — the rest are absent.

| Screen | Status in shipped code |
|--------|----------------------|
| 270 Command Palette and Quick Actions | **Shipped** — `renderer/actions/registry.ts` etc. |
| 271 Keyboard Shortcuts Reference | **Shipped** — key binding system and help overlay |
| 272 Contextual Help and Onboarding | **Contracted** — full architecture defined in `contextual-help-mechanical-provenance.md` Agent Note; CONTEXT.md defines the terms |
| 264–269, 273–277 | **Absent** — no routes, no components, no data models |

**Known overlaps with shipped concepts:**
- 264 Global Search would need Groups D–L to exist before it pays off.
- 267–269 Favorites/Pinned/Saved would need a model for marking entities as favourites.
- 275 Notification and Reminder Centre overlaps the existing News Inbox and would need a clear
  boundary.
- 276 Import/Export overlaps Group F Screen 88.
- 277 Application Information overlaps the existing About/version screen.

#### Decisions so far

- [01 — Screen inventory](../.scratch/group-s-search-utilities-and-reference/issues/01-screen-inventory.md): three screens shipped as modals (270, 271,
  272), one partial (277), ten absent (264–269, 273–276). Shipped forms are modal/overlay, not
  route-addressable screens.
- [02 — v1 scope](../.scratch/group-s-search-utilities-and-reference/issues/02-v1-scope.md): Option C. 270–272 and 277 renamed to their shipped forms; 264–269, 273–275 deferred; 276 goes to Group F. [Agent Note](../.agents/notes/proposed/architecture/2026-09-21-group-s-v1-scope.md).
