# Ticket 04 results: how large a multi-nation save actually gets

Measured 2026-09-01 on the current `players` table shape, the real DDL from
`migrations.generated.ts`, and the real driver (`node:sqlite` — what `@effect/sql-sqlite-node` v4
uses). Probe: [probe.ts](probe.ts). Machine: darwin arm64, Node 24.18, SQLite defaults (no `PRAGMA`
appears anywhere in `apps/desktop/src`, so the app runs rollback-journal, not WAL).

Shape of each synthetic save: 25 players per club, 20 clubs per league, ~2.3 position rows per
player, one fitness and one contract row per player, a fully played double round-robin per league.

## The numbers

| scenario | players | clubs | file | generate | squad view | league table | world search (SQL) | world search (JS) |
|---|---|---|---|---|---|---|---|---|
| 20k | 20,000 | 800 | 115 MB | 1.0 s | 1.0 ms | 11 ms | 57 ms | ~43 s |
| 100k | 100,000 | 4,000 | 580 MB | 5.2 s | 77 ms | 74 ms | 343 ms | ~1,030 s |
| 400k | 400,000 | 16,000 | 2,370 MB | 21.8 s | 127 ms | 302 ms | 1,556 ms | ~17,235 s |
| 400k **+3 indexes** | 400,000 | 16,000 | 2,414 MB | 23.4 s | **0.9 ms** | 338 ms | 1,856 ms | ~17,430 s |

The three queries are the real ones, not synthetic: `loadSquadPlayers` (`squad.ts`),
`computeStandings` (`season.ts`), and `loadAllPlayersEcon` (`transfers.ts`) with its JS
post-processing reproduced faithfully.

## Where the bytes actually go

Per-table breakdown at 400k (`dbstat`):

| table | bytes | share |
|---|---|---|
| `events` + its PK index | 2,035 MB | 86% |
| `player_positions` + its PK index | 104 MB | 4.4% |
| `players` + its PK index | 89 MB | 3.8% |
| `fixtures` | 39 MB | 1.6% |
| `player_fitness` | 21 MB | 0.9% |

**The players are not the problem.** A 400k-player world — every squad in ten nations, all 28
attribute columns, positions, contracts, fitness — is about **335 MB**. That is a large but entirely
ordinary file. Storage per player is ~450 bytes all-in, and it scales dead linearly (5x the players
gave 5.02x the world bytes at every step).

The 2.37 GB figure is the event log, and it is there because the probe assumed every background
fixture is event-sourced at ~40 events per match. **Today it is not**: `resolveMatchday` calls
`resolveFixtureScore` and writes the scoreline straight to the `fixtures` row; only the human's
watched match writes a `match` stream through `decider.ts`. So the events column here is not a
measurement of the current build — it is a **price tag on a design ticket 11 is still weighing**, and
the price is 6x the entire rest of the save.

## Where the cliffs are

Three, and only one of them is SQLite's.

**1. No index in the save file. Anywhere.** `grep -c "CREATE INDEX" migrations.generated.ts` returns
`0`. `EXPLAIN QUERY PLAN` on the squad view returns `SCAN p`: opening one club's squad reads all
400,000 player rows. That is what turns a 1.0 ms query at 20k into 127 ms at 400k — 127x slower for
20x the data, because the scan also starts missing page cache. `players(club_id)` and
`fixtures(season_number, played)` are the two that matter.

Adding three indexes (`players(club_id)`, `fixtures(season_number, played)`, `contracts(player_id)`)
takes the squad view from **127 ms to 0.9 ms** — a 140x improvement, and *faster at 400k than the
unindexed 20k save was*. It costs 45 MB (1.9% of the file) and 1.6 s of generation time. This is the
cheapest result in the whole probe.

Note what the indexes do *not* fix: the league table (302 -> 338 ms) and the world search (unchanged)
are unaffected, because both read the whole world by construction. Indexes fix cliff 1 and nothing
else.

**2. `computeStandings` reads the whole world to render one league.** It selects *every* club in the
save and *every* played fixture of the season, then tallies in JS, before discarding all but the 20
clubs in the league being displayed. 302 ms at 400k, and it is on the path of every table view, every
season rollover, and the Board Objective judgment.

**3. The real cliff is quadratic JS, not SQLite.** `loadAllPlayersEcon` pulls every player and every
position row into memory, then for each player runs `positionRows.filter(p => p.playerId === row.id)`
— an O(players x positions) scan. The SQL underneath is fine (1.6 s at 400k). The JS on top is
**~4.8 hours** at 400k, and ~17 minutes at 100k. It is called from four places in `transfers.ts` and
from `aiClubs.ts`.

`aiClubs.ts` compounds it: it loops over every club in the save calling `loadSquadPlayers(club.id)`,
each of which is an unindexed full scan. At 16,000 clubs against 400,000 rows that is ~6.4 billion
row visits per transfer window, before the quadratic join runs.

None of cliff 3 is a storage problem. It is a read-path problem that a single-league world has been
hiding, and no schema decision fixes it.

## What this means for the tickets waiting on it

- **Ticket 07 (depth persistence).** The premise that `standard`-depth squads are expensive on disk
  is false: they are ~450 bytes a player and linear. If `results-only` exists to save *bytes*, it is
  not earning its place — 400k players is 335 MB. It has to earn its place on generation time
  (21.8 s and linear, which is the number a user actually feels), on simulation cost per matchday, or
  on read-path cost, none of which is storage. Choose between the depth designs on those grounds.
- **Ticket 11 (event streams).** Event-sourcing background matches costs 6x the rest of the save
  combined and is the single largest object in the file by a wide margin. The current build already
  avoids it. This is a measured argument for keeping it that way.
- **Advanced Options entity estimate.** It currently prices a cost nobody had measured. The honest
  units are ~450 bytes and ~55 microseconds of generation per player, plus ~2.4 KB per club — a
  ten-nation world is a few hundred MB and about 20 seconds, not a gigabyte and not minutes.

## What was not measured

Write throughput under simulation (the probe writes in one big transaction, which is not how a
matchday writes), WAL vs rollback journal, concurrent reads, and save-file load time into the
Electron main process.

## `player_transfers` key and index (open question 22)

Measured by `player-transfers-key-probe.ts`, a focused harness beside this one. The original probe
was not revived for it: that harness builds a whole world against a DDL that has since moved on —
`clubs.name`, `season.current_matchday` and `fixtures.matchday` are all gone — and the question is
about one table's key and one read.

640,000 transfers (20 seasons x 32,000), 400,000 players, 16,000 clubs, 36-character ids. The read is
`WHERE player_id = ? ORDER BY transferred_on ASC`, averaged over 25 players on a cold connection.

| Candidate | Rows kept | File | Career read | Plan |
|---|---|---|---|---|
| Surrogate `id`, no index | 640,000 | 82.5 MB | 26.821 ms | `SCAN` + `USE TEMP B-TREE FOR ORDER BY` |
| Surrogate `id` + `(player_id, transferred_on)` | 640,000 | 123.9 MB | 0.149 ms | `SEARCH ... USING INDEX` |
| `PRIMARY KEY (player_id, transferred_on)` | 596,120 | 112.8 MB | 0.139 ms | `SEARCH ... USING sqlite_autoindex` |
| `PRIMARY KEY (player_id, transferred_on, to_club_id)` | 597,520 | 137.9 MB | 0.143 ms | `SEARCH ... USING sqlite_autoindex` |
| The same, `WITHOUT ROWID` | 597,520 | 85.8 MB | 0.088 ms | `SEARCH ... USING PRIMARY KEY` |

Unindexed is not viable: 26.8 ms per career read, scanning every transfer in the save and sorting
into a temp B-tree, against the one table with unbounded growth.

Both composites dropped rows under `INSERT OR IGNORE` — the probe draws players, clubs and dates at
random over a small date space, so the collision rate is an artefact rather than a prediction. What
it shows is that uniqueness under a natural key rests on a domain claim, never on construction.

`WITHOUT ROWID` stores the row inside the primary-key B-tree rather than beside it, which is why it
beats a surrogate plus a separate index on both size and speed. The choice is 38 MB against a key
whose correctness is an argument rather than a shape. The decision itself belongs to ticket 22.
