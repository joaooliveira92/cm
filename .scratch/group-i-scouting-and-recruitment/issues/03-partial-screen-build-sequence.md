# 03: Build sequence

Type: grilling
Status: resolved
Blocked by: 01, 02

## Question

Given the inventory (01) and scope decisions (02), what is the dependency-ordered build sequence for
the in-scope screens? Prefer screens that build on existing domain logic, and name the shared
components several screens reuse.

## Answer

| Priority | Screen | Rationale |
|---|---|---|
| 1 | 121 Scouting Assignment | Every command and the read already exist (`getScouting`, `assignScout`, `assignScoutToClub`, `unassignScout`); only a screen is missing. Club targets are picked from the existing League Table read. Creating a Player target waits for [decision request 01](../decision-request-01-knowledge-limited-player-reads.md), because no Player list outside the manager's club is knowledge-limited; existing Player targets are shown and can be ended. |
| 2 | 126 Scouting Knowledge | One new read-only RPC over `scouting_progress`: per Club, the scouted Players, `squadCoverage` and Knowledge Confidence; per Player, name, Club and Scouting Progress. No Attribute and no exact figure. |
| 3 | 118 Scouting Centre | Landing page over the two above: the Scout roster with each Scout's target and progress, a coverage summary from 126's read, and links to 121 and 126. Built last. |

### Shared components

- **Scout roster row**: Scout name, quality, target and Scouting Progress. Used on 121 and 118.
- **Coverage summary**: Clubs with scouted Players and their Knowledge Confidence. Used on 126 and 118.

