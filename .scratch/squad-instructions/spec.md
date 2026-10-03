# Spec: squad-instructions remainder

Three changes to the shipped Squad screen, from [ticket 01's reconciliation](issues/01-reconcile-the-loose-squad-instruction.md).

1. **Contract view** ([02](issues/02-contract-view.md)). `SquadPlayerView` carries each player's
   Contract wage, Contract expiry date and Transfer Value, all exact for the own club. A "Contract"
   column preset shows them beside the base columns. They sort numerically, or by date for expiry,
   and format at the presentation boundary (`formatCredits`, the app's date format).
2. **Match-day column in the table** ([03](issues/03-match-day-column-in-the-table.md)). The table
   layouts gain the match-day indicator the position list already leads each row with: starting,
   bench, or not selected. It reads the same draft `MatchDayBar` edits.
3. **Sort control for the position list** ([04](issues/04-sort-control-for-the-position-list.md)).
   The list layout's toolbar gets a Sort select that drives the shared table sort: Position, Name,
   Age, Overall, Condition, and after 02, Wage, Contract ends and Transfer Value.

Nothing here adds a model, a stored field or a second Squad screen. 02 widens one IPC view schema.
