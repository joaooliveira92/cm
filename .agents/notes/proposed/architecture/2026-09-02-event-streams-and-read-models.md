# Agent Note: Event streams and read models at world scale

Status: proposed

> Partially supersedes [Domain-bounded Deciders, typed RPC methods, and chunked match resimulation](../../implemented/architecture/2026-08-27-domain-bounded-deciders-and-chunked-resimulation.md).
> That note's three-Decider decomposition survives by name, but two of its clauses do not: "Club (per
> club)" becomes per *human* club, and "League Table stays a projection folded from Match Decider
> events" is impossible in a world where most fixtures never open a Match stream at all. Its typed-RPC
> ruling and its chunked-resimulation ruling are untouched and remain the live statements, which is why
> that note stays active rather than being archived.
>
> Partially supersedes the career-history clause of
> [Player provenance: nationality, birthplace, and identity](2026-09-01-player-provenance-and-nationality.md).
> That note rejected a career-history table "since the transfer events already hold it" and handed the
> materialisation question here. The premise is withdrawn below — the transfer events stop being
> written for the clubs that would need them — so a transfer table ships, as authoritative state rather
> than as the projection that note rejected. Everything else in that note stands.
>
> Extends [Player ratings and Transfer Value are derived projections](2026-08-29-player-ratings-are-derived-projections.md)
> from one entity to the whole read side: that note's derived-on-read default is what decides, below,
> that none of the five named read models becomes a table.
>
> Depends on [The Calendar becomes date-bearing](2026-09-02-date-bearing-calendar.md), which flagged
> that every Matchday-keyed event predates dates and left the consequence here, and on
> [Season, fixture, and cup bracket generalization](2026-09-02-season-fixture-and-cup-schedule.md),
> whose past-Season retention rule is reused verbatim as the log's only pruning rule.

## Problem

`events` is one append-only table keyed `(stream_type, stream_id, seq)`
(`apps/desktop/src/main/db/schema.ts:236-249`). Three Deciders write it, and the decomposition was
chosen for a save holding one league of twenty clubs and one season stream.

The MVP world is up to ~16,000 clubs across ten nations. Every quantity the log's design took for
granted changes by three orders of magnitude: the number of Club streams, the number of fixtures whose
results pass through the Season stream each Continue, and the number of clubs whose end-of-season
development is recorded. None of the five read models `CONTEXT.md` names — `squad_view`,
`league_table`, `transfer_inbox`, `match_day_timeline`, `season_summary` — exists as a table; every
query computes from base tables against a world 800 times larger than the one those queries were
written for.

Five questions have to be answered together, because each one's cost depends on the others: whether
the three Deciders survive, whether background matches are event-sourced, which read models become
tables, whether the log needs partitioning or pruning or snapshotting, and what replay costs after
several seasons.

## Proposal

**Two Deciders fold a stream; the third does not and never did. The log records only facts no table
holds, and it grows at human scale rather than world scale. None of the five read models becomes a
table. One new authoritative table, `player_transfers`, ships to replace the log entries this decision
removes.**

### The measured facts the decision rests on

Four numbers, three of them new here.

| what | cost | source |
|---|---|---|
| one event row, payload included, with its PK index | ~167 bytes | ticket 04's 2,035 MB over ~12.16M assumed events |
| event-sourcing every background match at ~40 events | ~2,035 MB per Season, 6x the rest of the save | ticket 04 |
| one `PlayerDeveloped` payload for one club | 12,738 bytes — ~510 bytes per player, more than the ~450-byte player row it describes | measured against `ALL_ATTRIBUTES` + `HIDDEN_ATTRIBUTES` (28 keys) at 25 players |
| one `MatchdayResolved` payload at 8,000 fixtures | ~1.2 MB in a single row, per Continue | measured at 152 bytes per `FixtureResult` |

Extended over a world and a career: `PlayerDeveloped` for every club is **~204 MB per Season and ~4.1
GB over twenty Seasons**, and `MatchdayResolved` results are **~49 MB per Season and ~1.0 GB over
twenty**. Both exceed ticket 04's entire measured 335 MB world. Neither has ever been measured before,
because both are written by code that today runs against twenty clubs.

The event log is also, uniquely, **already indexed**. `grep -c "CREATE INDEX"` over
`migrations.generated.ts` returns 0, but `events`' three-column primary key is a rowid table's
automatic unique index, which ticket 04's `dbstat` breakdown names directly. Every access the code
performs — the `(stream_type, stream_id)` prefix scan in `loadStreamEvents` and the `MAX(seq)` in
`nextStreamSeq` (`apps/desktop/src/main/decider.ts:32-42`) — is served by it. The log needs no index
beyond its primary key; this is stated as a claim for ticket 12 to verify rather than rediscover.

### Only one Decider actually folds a stream

`loadStreamEvents` is called from exactly two places, both in `match.ts` (`resumeSimulation` at
`apps/desktop/src/main/match.ts:484`, `submitMatchCommand` at `:515`). Nothing folds a Club stream or
the Season stream, ever.

The invariants `CONTEXT.md` attributes to the Club Decider are enforced against tables, not against a
fold: Wage Budget is checked by reading `club_budgets` and summing `contracts`
(`apps/desktop/src/main/transfers.ts:818-826`), Board Objective and the Consecutive-Miss Counter are
`UPDATE`d in place (`apps/desktop/src/main/season.ts:440,459-467`). The Club and Season streams are
**write-only ledgers**: their events are appended in the same transaction as the row writes they
describe, and no reader has ever consulted them.

This is stated plainly rather than corrected, because it is the right shape for a single-writer desktop
game — a fold exists to reconstruct state that no table holds, and these tables hold it. What is wrong
is the vocabulary: calling three things Deciders implies three folds, which invited the assumption that
the Season stream is a serialisation bottleneck. It is not, because nothing reads it.

The Match Decider is a genuine fold, and it is the model for what a stream is worth: `startMatch`
persists a `MatchStarted` carrying the seed and both team setups, `SubmitMatchCommand` appends a
minute-stamped journal entry, and the timeline is re-derived by `deriveMatchEvents` on every read
(`match.ts:203-235`, `:480-490`). The ~19 match events are never stored. The stream is the sole record
of the seed and the human's in-match commands, and it is short.

### The rule: an event is appended only where it is the sole record of a fact

This is the governing rule, and every decision below follows from it applied at world scale.

- **Match stream — survives, per fixture, only where the human watches.** The seed and the command
  journal exist nowhere else. Background fixtures open no stream: `resolveMatchday` runs the engine,
  reads the score off `FullTimeWhistle`, writes it to the `fixtures` row, and discards the ~19 events
  (`season.ts:337-352,369-378`). That is already the shipped behaviour and it is now a decision rather
  than an accident, priced at the 2,035 MB per Season it avoids.
- **Season stream — survives, one per save.** `SeasonStarted`, `TransferWindowOpened`/`Closed`,
  `MatchdayResolved`, `SeasonConcluded`, `BoardObjectiveJudged`, `ManagerWarned`/`Sacked`/`Retired`.
  These are the career's narrative and no table records the sequence. One row per calendar boundary is
  a few hundred rows over a twenty-Season career.
- **Club stream — survives only for the human's club.** Its remaining content is `PlayerDeveloped`
  (the `players` table holds post-development state only, so the step itself is recorded nowhere else)
  and ticket 09's batched `ScoutingProgressed`. Both concern a club the human manages, and scouts exist
  only for the human's club under ticket 05, so the scouting half was already human-only.
- **Transfers leave the log entirely**, for the reason in the next section.

Applying the rule world-wide is what removes the ~204 MB per Season: `developPlayersForSeason` loops
every club in the save and appends a full post-development attribute set for all of them
(`apps/desktop/src/main/development.ts:60-71,86-92,100-107`). Restricted to the human's club the same
event costs ~12.7 KB a Season, ~250 KB a career.

**What this gives up:** an AI club's development history is unrecoverable. Nothing today reads it, and
ticket 06 already deletes background fixtures at rollover, so keeping a permanent record of how a
background squad changed would outlive the record of the matches it played. It returns only if a
surface ships that shows the human another club's squad evolution over time — and it should return as a
table, not as a log, for the reasons the read-model section gives.

### `MatchdayResolved` stops carrying results

Its payload embeds every resolved fixture (`season.ts:510`), which at world scale is a ~1.2 MB JSON
blob written in one row on every Continue. It carries the date and the resolved-fixture count instead.
The results are already on the `fixtures` rows the same transaction wrote; carrying them twice gives
one fact two sources that can disagree, and the second source is the one nothing reads.

This is the event-side twin of ticket 01's ruling that `AdvanceCalendarResult` carries only
playable-competition fixtures. The two are separate payloads and both had the same defect.

### Every event carries the in-world date

`events.created_at` defaults to `datetime('now')` — wall-clock, which orders events correctly within a
save but cannot say *when in the world* anything happened. Ticket 01's date-bearing Calendar makes that
answerable and its note left the consequence here.

A `game_date` column (ISO text, the save's `current_date` at append) joins `events`. `created_at` stays,
for debugging a save against a real timeline. Payload fields carrying the retired sense of Matchday —
`TransferWindowClosed`'s `matchday`, `MatchdayResolved`'s `matchday` — become dates. At ~11 bytes on a
log that this decision leaves at a few thousand rows a career, the column is free; on the log as it
stands today it would have cost ~130 MB over twenty Seasons, which is a fair measure of how much this
decision changed.

### The Match stream keys on the fixture

`stream_id` for a Match stream is the `fixtures.id` that ticket 06 made an integer, not the freestanding
`randomUUID()` the code mints today (`match.ts:219`). ADR-0007 already specified "Match (per Fixture)";
the code drifted, and at twenty clubs nothing noticed.

Two things depend on closing the drift. Pruning a match stream with its fixture becomes a join rather
than a bookkeeping table mapping matches to fixtures. And `match_day_timeline` becomes addressable by
the thing every screen already holds — a fixture — rather than by an id that exists only inside the
match flow.

**The cost is a contracts change.** `MatchId` collapses onto `FixtureId`, and `startMatch` becomes
fixture-addressed rather than opponent-addressed. Reworking that RPC surface is implementation, handed
off with the rest of the query layer.

### Pruning: one rule, borrowed whole

A Match stream is deleted at rollover exactly when its fixture is, under ticket 06's rule that
past-Season fixtures survive only for competitions the human's club played in. A stream whose fixture is
gone is unreachable by construction once the stream keys on the fixture.

Nothing else is ever pruned. The Season stream and the human's Club stream are both a few hundred rows a
career.

**No partitioning and no snapshotting.** Partitioning answers a problem SQLite's B-tree does not have —
the number of *streams* costs nothing, since a stream is a key prefix, not an object; only the number of
*events* costs anything, and this decision bounds that. Snapshotting exists to bound the cost of a fold,
and there is exactly one fold in the system: a live match, bounded at 90 minutes plus a handful of
commands, re-derived in under a millisecond. Replaying anything after several seasons costs nothing
because nothing replays anything.

**Durable-at-commit and reproducibility are untouched by pruning.** Durable-at-commit is a property of
the write path — a command that returns has committed — and says nothing about retention. Reproducibility
comes from the world seed and the determinism chain, not from the log. What deletion does cost is
re-watchability: a background match cannot be replayed after its stream is pruned, and neither can it be
regenerated, for the same reason ticket 06 gave about background results. The human's retained fixtures
keep their streams and stay re-watchable.

### None of the five read models becomes a table

`CONTEXT.md` defines a read model as a "persisted, projector-maintained table". No such table has ever
existed, and none ships. A read model is a **query shape over authoritative tables**, and the glossary is
corrected to say so.

Each of the five, with the reason it stays a query:

- **`squad_view`** — ticket 04 measured `players(club_id)` taking it from 127 ms to 0.9 ms at 400k
  players. An index fixes it for 45 MB. A materialised squad would additionally have to be invalidated by
  every transfer, development pass, injury, and condition recovery, and `recoverClubFitness` rewrites
  fitness for both squads of every fixture in the world on every matchday.
- **`league_table`** — the obvious candidate, and it loses on the measurement. `computeStandings` takes
  302 ms at 400k because it selects *every played fixture in the save* and then discards all but one
  competition's (`season.ts:651-662`); the missing term is a `competition_id` predicate, not a missing
  projection. With that predicate and an index on `fixtures(competition_id, season_number, played)` the
  scan is one competition's ~380 rows. Materialising it would also duplicate ticket 06's
  `competition_participants`, which already freezes final position, points, goal difference, and goals
  for at `SeasonConcluded` — one fact, two sources, and the map has rejected that shape three times.
- **`match_day_timeline`** — derived by `deriveMatchEvents` from the seed and the command journal, and
  materialising it would mean invalidating and recomputing it on every mid-match command, which is the
  reason `startMatch`'s own doc comment gives for not persisting it. Ticket 06 named this read model as
  where a penalty shootout would be invisible; it is resolved by reading the shootout from
  `fixtures.home_penalties`/`away_penalties`, not from events, which is possible precisely because the
  timeline is a query and free to join.
- **`transfer_inbox`** — reads `bids`, a base table already scoped to the human's club, plus a market
  listing. Its slowness is `loadAllPlayersEcon`'s O(players x positions) JS, a read-path defect ticket 04
  measured and the map has ruled out of scope. A projection cannot fix a bug.
- **`season_summary`** — derived from `competition_participants` and `board_objective` at one row per
  Season. There is nothing to save.

The general rule, and the condition under which one of these becomes a table: **a read model is
materialised when its query remains O(world) after ticket 12's index list, and its inputs change less
often than it is read.** None of the five satisfies both today.

### `player_transfers`, and what career history is

Ticket 08 rejected a career-history table because completed transfers append `PlayerTransferredOut` and
`PlayerTransferredIn` to both clubs' streams (`transfers.ts:387-397`). Two things break that premise at
once: writing the same transfer to both clubs' streams is already one fact with two sources, and the
Club stream now exists only for the human's club, so a transfer between two AI clubs would be recorded
nowhere.

A transfer is a fact about a player and two clubs and belongs to neither club's stream. **One
`player_transfers` table** carries it: the player, the from-club (nullable — a free agent or a generated
squad has none), the to-club, the in-world date, and the fee.

**Row cost.** Zero rows at generation, so nothing is added to ticket 04's ~450 bytes and ~55
microseconds per player. At runtime it grows at the rate of completed transfers, not at the rate of
players or seasons: `runAiTransferWindow` bids for one target per weak position per club per window
(`apps/desktop/src/main/aiClubs.ts:150-215`), so assuming ~2 completed transfers per club per Season,
16,000 clubs produce ~32,000 rows a Season at ~100 bytes — **~3 MB a Season, ~64 MB over twenty
Seasons**, against ticket 04's measured 335 MB world. That is the single largest permanent growth this
decision accepts, and it is accepted because it is the one background fact a human can still see years
later: a player who eventually joins their club arrives with a real history.

**Career history is therefore not a materialised read model.** `player_career_history` in the sense
ticket 08 and this ticket asked about — a denormalised per-player spell list rebuilt from a log — does
not ship. A player's career is `players.club_id` plus their `player_transfers` rows ordered by date: a
query over authoritative state, consistent with every other read model here.

**Deletion follows the player.** A player deleted when their club is relegated into a `results-only`
tier (ticket 07) takes their transfer rows with them, exactly as ticket 09 deletes a scouted player's
progress. The alternative is dangling rows naming a player who no longer exists.

## Glossary reconciliation

`CONTEXT.md` is corrected in the same change, per this effort's standing preference.

- **Decider** currently says the Club Decider is "one stream per club, x20 per save" and folds
  Contracts, Transfer Budget, Wage Budget, Board Objective, and the Consecutive-Miss Counter. It becomes
  human-club-only, its invariants are described as enforced against tables, and the Match Decider's
  stream is named as keyed on the Fixture. Its Season/Calendar clause loses "Matchday counter" for the
  date-bearing Calendar's `current_date`.
- **Read model** currently asserts "persisted, projector-maintained tables". It becomes a query shape
  over authoritative tables, with the materialisation condition stated.
- **Stream** enters the technical contract, because the distinction between a folded stream and a
  write-only ledger is what this decision turns on and no term carried it.

## Alternatives considered

- **A stream per competition, replacing the save-wide Season stream.** Rejected: ticket 01's advance
  resolves every fixture in the world dated on or before D in one transaction, so a per-competition
  stream fragments one atomic act across hundreds of streams and still needs a save-wide stream to
  order them. The bottleneck it was proposed to relieve does not exist, because nothing folds the
  Season stream.
- **Retiring the Club Decider outright.** Genuinely weighed, since its stream is write-only and every
  invariant it claims is enforced elsewhere. Rejected because `PlayerDeveloped` for the human's own
  squad records a step that no table holds, and at one club it costs ~250 KB a career. Retiring the
  stream would delete the only record of how the human's players actually improved.
- **Keeping Club streams for every club but dropping `PlayerDeveloped`'s payload to deltas.** Cheaper
  than today and it preserves an audit trail. Rejected: the remaining traffic is transfers, which move
  to `player_transfers` regardless, leaving a per-club stream carrying nothing — and a delta payload
  still scales with the world rather than with the human.
- **Materialising `league_table`.** The strongest candidate, at 302 ms measured. Rejected on the
  measurement itself: the cost is a missing `competition_id` predicate, and a projection would duplicate
  `competition_participants`' frozen standings. Reintroduction condition: the query stays O(world) after
  ticket 12's indexes.
- **Materialising `squad_view`.** Rejected: an index is 140x for 45 MB, and the invalidation surface
  (transfers, development, injuries, per-matchday condition recovery) is larger than the read.
- **Event-sourcing background matches.** Rejected at 2,035 MB a Season, 6x the rest of the save, for a
  timeline no screen will ever open. Reintroduction condition: a surface that shows the human minute
  events from a match they did not watch — and even then the seed alone reproduces the timeline, so the
  events would still not need storing.
- **Snapshotting streams every N events.** Rejected: snapshots bound fold cost and there is one fold in
  the system, already bounded at 90 minutes.
- **Partitioning `events` by stream type.** Rejected: stream count is free, event count is what costs,
  and the PK autoindex already serves every access path.
- **Pruning by age (drop events older than N Seasons).** Rejected in favour of ticket 06's existing
  participation rule, which is already the save's retention policy. A second, differently-shaped
  retention rule would let a fixture and its match stream disagree about whether the match happened.
- **`player_career_history` as a materialised projection.** Rejected: it would project from a log this
  decision removes for exactly the clubs whose history is hardest to reconstruct.
- **Leaving career history unrecorded for AI-to-AI transfers.** The cheapest option — zero rows, and it
  follows naturally from human-only Club streams. Rejected because a player signed from a background
  nation would arrive with a blank history, which is visible to the human and wrong.
- **Keeping `created_at` as the only timestamp.** Rejected: wall-clock orders events but cannot date
  them in the world, and every screen that displays an event wants the in-world date.

## Acceptance criteria

- No `events` row exists whose `stream_type` is `club` and whose `stream_id` is not the human's club.
- A background fixture resolves with zero rows written to `events`.
- A `MatchdayResolved` payload's size is independent of how many fixtures resolved.
- `events` carries `game_date`, and no event payload carries a field named `matchday`.
- A Match stream's `stream_id` is a `fixtures.id`.
- After a rollover, a Match stream exists only for a fixture that survived rollover.
- No table named `squad_view`, `league_table`, `transfer_inbox`, `match_day_timeline`, or
  `season_summary` exists in the schema.
- `player_transfers` exists, has zero rows immediately after world generation, and gains exactly one row
  per completed transfer world-wide.
- Deleting a player deletes their `player_transfers` rows.
- `events` has no index other than its primary key.
- A player's career history is answerable by one query joining `players` and `player_transfers`, without
  reading `events`.
- `CONTEXT.md` describes a read model as a query shape and the Club Decider as human-club-only.

## Risks

- **The log stops being a safety net.** Today an appended event is an unread but complete record of what
  happened; after this it records only the human's own club and the save's calendar. A future bug that
  corrupts an AI club's squad leaves nothing to diff against. This is accepted on the same ground ticket
  06 accepted destroying background history: the world is regenerable from its seed and its results are
  not.
- **`ScoutingProgressed` is the one retained event that restates a table.** Ticket 09 stores Scouting
  Progress and keeps the event as the recovery path for a missed or double-fired matchday hook. That is
  a deliberate exception to this note's governing rule, kept rather than reopened, and it costs ~40 rows
  a Season because scouts are human-club-only.
- **`player_transfers` grows forever.** It is the only structure here with unbounded growth, at ~3 MB a
  Season on the estimate above — and that estimate is derived from `runAiTransferWindow`'s shape, not
  measured. If AI transfer volume is tuned upward later, the estimate moves with it, and the honest
  response is to measure before assuming 64 MB is still the twenty-Season figure.
- **The `MatchId`-to-`FixtureId` collapse touches the RPC contract.** It is the one decision here that
  cannot be delivered by a migration alone, and the note leaves that work unscheduled.
- **Background match resolution is not deterministic today.** `resolveFixtureScore` seeds the engine
  with `Math.random()` (`season.ts:337`), which contradicts ticket 06's determinism chain. Discarding
  the events is safe regardless — a non-reproducible timeline is one more reason not to store it — but
  the seed defect is real, belongs to whoever implements ticket 06's chain, and is recorded here because
  this is the note that decided the events are not worth keeping.
- **Restricting the Club stream is hard to reverse per save.** A save played for ten Seasons under this
  rule cannot later produce an AI club's development history, because the events were never written.
  Reintroducing them is additive for new saves and impossible for existing ones.
