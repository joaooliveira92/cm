# Saves, stored timelines and matches in progress

Type: grilling
Status: resolved
Blocked by: 03, 06

## Question

Committed matches keep their stored timelines ([note](../../../.agents/notes/implemented/architecture/2026-09-19-committed-matches-store-their-timeline.md)),
so old matches show no new columns: are their cells "-" and does that need saying on screen? A match
in progress across an app upgrade re-derives under the new engine: if ticket 03 keeps outcomes
byte-identical nothing visible changes; if not, it restarts from kickoff with the existing notice. Does
the stored-timeline schema, `player_match_lines`, or the save schema version need to change, and do
any of the determinism tests' expected timelines need regenerating?

## Answer

**Results never change, so nothing restarts. Stored timelines and player lines gain the new event
kinds; matches stored before them show "-" for the new figures.**

- **In progress across an upgrade.** Outcomes are byte-identical ([03](03-attribution-without-moving-the-seed.md)),
  so a re-derived live match shows the same play with new events added. The existing restart-from-kickoff
  behaviour after an app restart is unchanged and needs no new notice.
- **Stored-timeline schema.** The stored timeline decodes against an explicit union of event schemas.
  `Tackle`, `Interception`, `HeaderDuel` and `PossessionTally` must join it and `Foul` gains optional
  `fouledPlayerId`, in the same change as the engine, or committed timelines silently drop them. A
  test commits a match and reads every new tag back.
- **Older stored matches.** A timeline with no `PossessionTally` predates the change; its possession
  stays unavailable and its new per-player figures render "-", never 0. The marker is the absence of
  any tally, checked once per timeline.
- **`player_match_lines`.** Gains count columns for tackles, interceptions, headers attempted and won,
  and fouls suffered, nullable so pre-change rows read "-". That is a DDL change, so
  `SAVE_SCHEMA_VERSION` moves and older saves are refused; saves are disposable during development.
  If the line table has not shipped when this lands, its columns are simply added to that ticket.
- **Determinism tests.** Tests that compare whole timelines for equality between two runs keep
  passing (both runs carry the same new events). Any test asserting an exact event list or count for a
  seed is updated in the engine change; the attribution guarantee test is the new invariant.
