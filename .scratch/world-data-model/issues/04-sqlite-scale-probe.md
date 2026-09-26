# 04 - How large a multi-nation save actually gets

Type: prototype
Status: resolved

## Question

Charting settled that `standard`-depth competitions carry full generated squads. A ten-nation pyramid
is plausibly hundreds of thousands of player rows, each with 28 attribute columns, plus positions,
contracts, and fitness. Nobody has measured whether that is fine or fatal, and several later tickets
(07 especially) are choosing between designs whose only real difference is cost.

Build a throwaway probe that answers, with numbers rather than intuition:

- File size and generation wall-clock for synthetic saves at roughly 20k, 100k, and 400k players,
  using the current `players` table shape.
- Query latency for the reads that matter: a squad view, a league table, and a player search across
  the whole world.
- Where the cliff is, if there is one, and whether it is rows, columns, indexes, or write throughput.
- What the numbers imply for the Advanced Options entity estimate, which currently prices a cost it
  has never measured.

This is a `task`/`prototype` ticket: it decides nothing by itself, it hands ticket 07 the facts it
needs. Throwaway code on a scratch branch; link the results here, do not paste them.

## Answer

Measured, not estimated. Full numbers, per-table byte breakdown, and query plans:
[RESULTS.md](../../../apps/desktop/src/main/db/prototype-scale-probe/RESULTS.md). Probe code:
[probe.ts](../../../apps/desktop/src/main/db/prototype-scale-probe/probe.ts) — real DDL from
`migrations.generated.ts`, real driver (`node:sqlite`), real queries from `squad.ts`, `season.ts`,
and `transfers.ts`.

**The premise behind the worry is false. Players are cheap.** A 400,000-player world — ten nations of
full squads, all 28 attribute columns, positions, contracts, fitness — is **~335 MB and ~22 seconds to
generate**, and both scale dead linearly (5x the players gave 5.02x the bytes at every step). Per
player: ~450 bytes, ~55 microseconds. Per club: ~2.4 KB. Nothing about full generated squads at
`standard` depth is fatal, or even uncomfortable.

**The 2.37 GB headline figure is the event log, and it is a hypothetical, not the current build.** The
probe assumed every background fixture is event-sourced at ~40 events per match, which cost 2,035 MB —
86% of the file and 6x the entire rest of the save. Today `resolveMatchday` writes scorelines straight
to the `fixtures` row and only the human's watched match writes a `match` stream, so this is a
measured price tag on the design **ticket 11** is weighing, not a cost anyone is paying yet.

**Three cliffs, and only one is SQLite's.**

1. **The save has no indexes at all.** `grep -c "CREATE INDEX" migrations.generated.ts` returns `0`;
   `EXPLAIN QUERY PLAN` on the squad view returns `SCAN p`. Adding `players(club_id)`,
   `fixtures(season_number, played)`, and `contracts(player_id)` takes the squad view from **127 ms to
   0.9 ms** at 400k — 140x, and faster than the *unindexed 20k* save — for 45 MB and 1.6 s. Cheapest
   result in the probe.
2. **`computeStandings` reads the whole world to render one league**, then discards all but 20 clubs.
   302 ms at 400k, unimproved by indexes because the scan is by construction.
3. **The real cliff is quadratic JS, not storage.** `loadAllPlayersEcon` runs
   `positionRows.filter(...)` per player — O(players x positions). SQL underneath is fine (1.6 s);
   the JS on top is **~4.8 hours** at 400k. `aiClubs.ts` compounds it by looping every club calling
   the unindexed `loadSquadPlayers`: ~6.4 billion row visits per transfer window.

**What this hands the blocked tickets.** Ticket 07 must now justify `results-only` on generation
time, per-matchday simulation cost, or read-path cost — *not* on bytes, because bytes are a
non-issue. Ticket 11 has a measured argument for leaving background matches un-event-sourced. Ticket
12 must carry an index list; the Advanced Options entity estimate can now be priced in real units.

No Agent Note: this ticket asserts no choice, design, or convention — it is fact-finding whose
decisions are made in 07, 11, and 12 (skill criterion (ii)).
