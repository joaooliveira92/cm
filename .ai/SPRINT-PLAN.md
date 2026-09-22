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
  [set pieces ship, as a Tactic field](../.agents/notes/proposed/feature/2026-09-19-set-pieces-ship-as-a-tactic-field.md).
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
  [revealed play is immutable](../.agents/notes/proposed/feature/2026-09-19-revealed-play-is-immutable.md):
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

**No human decision is outstanding** (2026-09-21). Every decision request in `.scratch/` has an
answer, and the four `ready-for-human` tickets were decided under the human's standing delegation.
Agent-startable work, in order:

1. **Group G's remaining match tickets**, in frontier order. Shipped 2026-09-21:
   [29](../.scratch/group-g-match-day/issues/29-substitution-windows-share-a-minute-across-halves.md) (windows keyed by half and minute),
   [34](../.scratch/group-g-match-day/issues/34-ai-clubs-name-a-bench.md) (AI clubs name a bench),
   [26](../.scratch/group-g-match-day/issues/26-forced-substitution-picks-any-squad-player.md) (forced substitutions from the named bench,
   like for like), [35](../.scratch/group-g-match-day/issues/35-manager-substitutions-come-from-the-bench.md) (a manager's substitution
   comes from the kickoff bench), [36](../.scratch/group-g-match-day/issues/36-a-red-carded-keeper-drags-a-stand-in.md) (a red-carded keeper
   drags a stand-in), [37](../.scratch/group-g-match-day/issues/37-match-day-resumes-a-started-match-after-a-restart.md) (a started match
   resumes after a restart), [33](../.scratch/group-g-match-day/issues/33-a-restarted-live-match-says-so.md) (a restarted match says so),
   [38](../.scratch/group-g-match-day/issues/38-pure-packages-sort-without-locale.md) (no `localeCompare` in the pure packages),
   [39](../.scratch/group-g-match-day/issues/39-an-empty-bench-is-flagged-before-kickoff.md) (an empty bench is flagged before kickoff). Next:
   - [40](../.scratch/group-g-match-day/issues/40-a-live-change-tactics-changes-only-instructions.md): a live Change Tactics changes only the
     Team Instructions (decision request 01).
   - [41](../.scratch/group-g-match-day/issues/41-accepting-a-result-refreshes-the-season-read.md): the season read refreshes after Accept result.
   - [42](../.scratch/group-g-match-day/issues/42-quick-result-skips-the-live-reveal.md): Quick result skips the live reveal (`needs-triage`: an
     open question on restored quick matches).
2. **[gate-red-on-dev 07](../.scratch/gate-red-on-dev/issues/07-youth-intake-at-rollover.md) then
   [08](../.scratch/gate-red-on-dev/issues/08-short-squad-advisory.md)**: the Youth Intake squad floor
   and its readiness advisory ([note](../.agents/notes/proposed/feature/2026-09-21-a-youth-intake-is-the-squad-floor.md)).
3. **Knowledge-limited Player reads have a decision and no ticket.** [Group I decision request 01](../.scratch/group-i-scouting-and-recruitment/decision-request-01-knowledge-limited-player-reads.md)
   was answered on 2026-09-19 (Option A, [note](../.agents/notes/proposed/architecture/2026-09-19-knowledge-limits-every-player-read.md)),
   but nothing slices it. Run `cm-to-tickets` on that note: it unblocks group-c 10 (Screen 35), D 68,
   J 132/134/137 and I 119/129, which is **M1 exit criterion 1**.
4. **Triage the stale `needs-info` tickets** (group-g 10, 20; group-h 07): the decision requests they
   waited on are answered.

Groups P, Q and S were scoped on 2026-09-21 and build nothing for v1; Group Q's 243 already ships as
Season Summary.

**Where M1's exit criteria stand.** Criterion 2 is met: Group C's twelve are disposed, and F and K —
the two ledgers still carrying `Not yet audited` rows — are not gaps in it. The criterion asks for a
ledger that *exists with a complete coverage table*, and both have one; a `Not yet audited` row is
those two files doing the job their preambles describe, which is to record a gap rather than a
decision. **Group K was checked on 2026-09-20 and is wholly unstarted** — `map.md` with
`<!-- none yet -->`, no spec, no tickets, no screen read — and charting it belongs to a different
milestone. Criterion 4 is met (`check:all` green; e2e green, 56 on 2026-09-21). Criterion 5 is
met as of 2026-09-20 — six traceability rows were owed for this milestone's read models and had been
accumulating unwritten. Criterion 1 is met for `competition*` and `nation*`; the rest is blocked per
above, and six `match*` screens are an explicit non-goal.

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
