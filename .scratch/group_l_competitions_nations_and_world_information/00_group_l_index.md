# Group L: Competitions, Nations and World Information

## Package contents

- [Screen 161: Competition Overview](161_competition_overview.md)
- [Screen 162: Competition Table](162_competition_table.md)
- [Screen 163: Competition Fixtures](163_competition_fixtures.md)
- [Screen 164: Competition Results](164_competition_results.md)
- [Screen 165: Competition Statistics](165_competition_statistics.md)
- [Screen 166: Competition Player Statistics](166_competition_player_statistics.md)
- [Screen 167: Competition Team Statistics](167_competition_team_statistics.md)
- [Screen 168: Competition Rules](168_competition_rules.md)
- [Screen 169: Competition Stages and Qualification](169_competition_stages_and_qualification.md)
- [Screen 170: Competition Draw](170_competition_draw.md)
- [Screen 171: Competition Awards](171_competition_awards.md)
- [Screen 172: Competition History](172_competition_history.md)
- [Screen 173: Competition Records](173_competition_records.md)
- [Screen 174: Nation Overview](174_nation_overview.md)
- [Screen 175: Nation Competitions](175_nation_competitions.md)
- [Screen 176: National Team Overview](176_national_team_overview.md)
- [Screen 177: National Team Squad](177_national_team_squad.md)
- [Screen 178: International Fixtures and Results](178_international_fixtures_and_results.md)
- [Screen 179: World Rankings](179_world_rankings.md)
- [Screen 180: World Football Overview](180_world_football_overview.md)

## Functional flow

```text
World Football Overview
  -> Nation Overview
      -> Nation Competitions
      -> National Team Overview
          -> National Team Squad
          -> International Fixtures and Results
  -> Competition Overview
      -> Table, Fixtures, Results, Statistics
      -> Rules, Stages, Qualification, Draw
      -> Awards, History, Records
  -> World Rankings
```

## Shared requirements

- Explicit competition identity, edition, season, stage, group, and round scopes.
- Authoritative standings, qualification, draws, awards, records, eligibility, and rankings.
- Explicit simulation-detail coverage without fabricated information.
- Accessible alternatives for tables, brackets, maps, graphs, and charts.
- Audited corrections and stable historical labels.

## Suggested Git commit

```text
docs(game-ui): add competition nation and world information specifications
```
