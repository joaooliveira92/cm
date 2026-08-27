# Calendar advances by Matchday, not by calendar date

The Calendar could have been a day-by-day clock (as in real-world football sims), with the player
advancing one simulated day at a time and Fixtures and Transfer Window boundaries falling on specific
dates. We rejected that for v1: training, scouting, and press are all out of scope, so a day with no
Fixture has no player-facing content — a day-by-day clock would just be empty "next day" clicks with
nothing to show.

Instead, the Calendar's only unit of advance is the next scheduled event: a Matchday's Fixtures, or a
Transfer Window opening/closing. Matchday (1–38) is a League-wide round number, not a date, and
Transfer Window boundaries are defined against Matchday number (pre-season: until Matchday 1;
mid-season: after Matchday 19 until Matchday 20) rather than a calendar date. This is a smaller
surface to build and keeps the event-sourced vocabulary (`MatchdayReached`, `TransferWindowOpened`,
`TransferWindowClosed`, `SeasonEnded`) free of a real-calendar concept the game never needs.

Reintroducing calendar dates later (e.g. if training or press are added in a future map) would mean
retrofitting a date onto every existing Matchday-keyed event — a real but bounded cost, acceptable to
defer rather than build speculatively now.

Each Season's Fixture list is regenerated from scratch (shuffled double round-robin, no seeding by
prior Season's League Table) since there is no promotion/relegation or qualification bracket to seed
against — the League's 20 clubs are a fixed set. League Table tie-breaks stop at points → goal
difference → goals scored; head-to-head is deliberately omitted as a rare edge case not worth a
separate per-pair-result derivation for v1.
