# Group F: Tactics and Match Preparation

## Package contents

- [Screen 80: Tactics Overview](80_tactics_overview.md)
- [Screen 81: Formation Editor](81_formation_editor.md)
- [Screen 82: Starting XI and Substitute Bench](82_starting_xi_and_substitute_bench.md)
- [Screen 83: Team Instructions](83_team_instructions.md)
- [Screen 84: Individual Player Instructions](84_individual_player_instructions.md)
- [Screen 85: Player Position Assignment](85_player_position_assignment.md)
- [Screen 86: Set Pieces](86_set_pieces.md)
- [Screen 87: Saved Tactics](87_saved_tactics.md)
- [Screen 88: Load and Import Tactic](88_load_and_import_tactic.md)
- [Screen 89: Pre-Match Team Selection](89_pre_match_team_selection.md)
- [Screen 90: Opposition Scout Report](90_opposition_scout_report.md)

## Functional flow

```text
Tactics Overview
  -> Formation Editor
  -> Starting XI and Substitute Bench
  -> Team Instructions
  -> Individual Player Instructions
  -> Player Position Assignment
  -> Set Pieces
  -> Saved Tactics
      -> Load and Import Tactic
  -> Pre-Match Team Selection
      -> Opposition Scout Report
```

## Shared requirements

- Authoritative tactical, competition, eligibility, and deadline validation.
- Deterministic previewable automatic actions and imports.
- Knowledge-limited opposition and player suitability information.
- Revision-bound drafts and idempotent submissions.
- Non-drag keyboard alternatives and accessible tactical editors.

## Suggested Git commit

```text
docs(game-ui): add tactics and match preparation specifications
```
