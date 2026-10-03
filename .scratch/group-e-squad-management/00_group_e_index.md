# Group E: Squad Management

## Package contents

- [Screen 69: Squad Selection](69_squad_selection.md)
- [Screen 70: Squad View Selector](70_squad_view_selector.md)
- [Screen 71: Selection Filters](71_selection_filters.md)
- [Screen 72: Player Sorting](72_player_sorting.md)
- [Screen 73: Shirt Number Assignment](73_shirt_number_assignment.md)
- [Screen 74: Captain Selection](74_captain_selection.md)
- [Screen 75: Set-Piece Takers](75_set_piece_takers.md)
- [Screen 76: Squad Registration](76_squad_registration.md)
- [Screen 77: Availability and Eligibility](77_availability_and_eligibility.md)
- [Screen 78: Player Interaction and Grievance](78_player_interaction_and_grievance.md)
- [Screen 79: Team Meeting and Discipline Decision](79_team_meeting_and_discipline_decision.md)

## Functional flow

```text
Club Squad
  -> Views, Filters, and Sorting
  -> Squad Selection
      -> Availability and Eligibility
      -> Shirt Numbers, Captaincy, Set Pieces, Registration
  -> Player Interaction and Grievances
  -> Team Meetings and Discipline
```

## Shared requirements

- Authoritative competition, medical, contract, and eligibility validation.
- Deterministic previewable automatic actions.
- Manager-private and knowledge-limited information.
- Revision-bound drafts and idempotent submissions.
- Complete keyboard, screen-reader, localization, scaling, and RTL support.

## Suggested Git commit

```text
docs(game-ui): add squad management specifications
```
