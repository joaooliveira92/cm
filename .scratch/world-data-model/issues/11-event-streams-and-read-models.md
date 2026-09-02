# 11 - Event streams and read models at world scale

Type: grilling
Status: open
Blocked by: 06, 07

## Question

The `events` table is a single append-only log keyed by (stream_type, stream_id, seq). ADR-0007's
three Deciders assume one save with twenty clubs and one season stream. None of the five read models
`CONTEXT.md` names — `squad_view`, `league_table`, `transfer_inbox`, `match_day_timeline`,
`season_summary` — exists as a table; every query computes from base tables today.

- Do the three Deciders survive? A Season/Calendar Decider with one stream per save is a bottleneck
  once every competition in the world advances through it; a Club Decider per club is now hundreds or
  thousands of streams.
- Are background-competition matches even event-sourced, or resolved and written straight to results?
  A full match timeline for every fixture in a ten-nation world is an enormous number of events for
  something no player will ever read.
- Which read models become real tables now that computing them on demand means scanning a much larger
  world, and which stay computed. `league_table` per competition per season is the obvious first
  candidate.
- Whether the event log needs partitioning, pruning, or snapshotting, and whether that contradicts
  the "durable at commit" and reproducibility properties the project relies on.
- What replaying a stream costs after several seasons, and whether anything depends on being able to.

## Handoff from ticket 08

[08](08-player-provenance-and-nationality.md) ruled out a `player_career_history` table: completed
transfers already append `PlayerTransferredOut`/`PlayerTransferredIn` to both clubs' streams, so a
career history is a projection over an existing log rather than new authoritative state. What this
ticket inherits is the sharpened question — **does `player_career_history` join the materialised
read-model set?** Reconstructing one player's history means scanning both clubs' streams, which is the
scale problem this ticket already owns.
