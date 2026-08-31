# Group D: Player and Staff Records

## Package contents

- [Screen 50: Player Profile](50_player_profile.md)
- [Screen 51: Player Attributes](51_player_attributes.md)
- [Screen 52: Player Positions](52_player_positions.md)
- [Screen 53: Player Form](53_player_form.md)
- [Screen 54: Player Statistics](54_player_statistics.md)
- [Screen 55: Player History](55_player_history.md)
- [Screen 56: Player Contract](56_player_contract.md)
- [Screen 57: Player Transfer Status](57_player_transfer_status.md)
- [Screen 58: Player Happiness](58_player_happiness.md)
- [Screen 59: Player Injuries](59_player_injuries.md)
- [Screen 60: Player Discipline](60_player_discipline.md)
- [Screen 61: Player Development and Training Effects](61_player_development_and_training_effects.md)
- [Screen 62: Player Action Menu](62_player_action_menu.md)
- [Screen 63: Player Comparison](63_player_comparison.md)
- [Screen 64: Staff Profile](64_staff_profile.md)
- [Screen 65: Staff Contract](65_staff_contract.md)
- [Screen 66: Staff History](66_staff_history.md)
- [Screen 67: Coach Report](67_coach_report.md)
- [Screen 68: Scout Report](68_scout_report.md)

## Functional flow

```text
Player or Staff Source List
  -> Profile
      -> Attributes, Positions, Form, Statistics, History, Contract
      -> Transfer, Happiness, Injuries, Discipline, Development
      -> Action Menu and Comparison
  -> Coach or Scout Report
```

## Shared requirements

- Knowledge-limited values and explicit uncertainty.
- Permission-aware private data.
- Stable IDs and immutable revisioned read models.
- Safe actions through narrow authoritative commands.
- Original portraits, biographies, labels, and data.

## Suggested Git commit

```text
docs(game-ui): add player and staff record specifications
```
