# The Overview: incidents, half-time score and fixture panel

Type: grilling
Status: resolved
Blocked by: 05

## Question

CM's Overview shows *Match Incidents* (each side's scorers with minutes), the half-time score, and a
*Fixture* panel with competition, referee, venue, date, weather and attendance. The live **Match** tab
today is `MatchDayLayout` (commentary stream and control panel); the post-match **Summary** is
`PostMatchSummary`. What does each gain, from which data, and what about the fixture fields the world
does not model?

## Answer

**Both the live Match tab and the post-match Summary gain one shared `MatchIncidents` panel and one
shared `FixturePanel`; referee, weather and attendance are not shown.**

**Match Incidents.** Two columns, home left, away right, each listing that side's goalscorers in
order of their first goal, one line per scorer with every minute: `Isaac Okoronkwo 45, 57`. A
penalty goal (a `Goal` directly preceded by a `Penalty` event for the same player) gets `(pen)` after
its minute. A red card is listed in the same column as `Sent off: <name> 63`. Minutes use the existing
`formatMinute`, so stoppage time reads as it does elsewhere. Live, the panel is cut at the revealed
position. Built from a new read field rather than in the renderer: the screen composes text and
computes nothing about the match, as the Report already does.

**Half-time score.** "Score at half time: 2-4" from `HalfTimeReached`, shown once that event is
revealed; before it, the line is absent rather than reading 0-0.

**Fixture panel.** Competition name and round, date (game calendar), and venue as
`<home club stadiumName>, <home club city>` — both already columns on the club. Referee, weather and
attendance are **not drawn**: no referee, weather or crowd model exists, and an invented value breaks
the standing rule ([note](../../../.agents/notes/implemented/architecture/2026-09-19-the-match-model-shows-only-what-it-produces.md)).
Attendance in particular is not derived from stadium capacity: a capacity is not a crowd. These three
are listed under the map's Out of scope.

**Layout.** On the live Match tab the incidents and fixture panels sit above the commentary stream
and control panel, which stay where they are. On the Summary they sit above the existing summary
content.

No Agent Note: every choice here applies an existing rule or arranges existing data.
