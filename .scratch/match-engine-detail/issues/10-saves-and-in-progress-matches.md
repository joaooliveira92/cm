# Saves, stored timelines and matches in progress

Type: grilling
Status: ready-for-agent
Blocked by: 03, 06

## Question

Committed matches keep their stored timelines ([note](../../../.agents/notes/implemented/architecture/2026-09-19-committed-matches-store-their-timeline.md)),
so old matches show no new columns: are their cells "-" and does that need saying on screen? A match
in progress across an app upgrade re-derives under the new engine: if ticket 03 keeps outcomes
byte-identical nothing visible changes; if not, it restarts from kickoff with the existing notice. Does
the stored-timeline schema, `player_match_lines`, or the save schema version need to change, and do
any of the determinism tests' expected timelines need regenerating?
