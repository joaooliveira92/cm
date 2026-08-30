# Group A: Application Shell and Game Lifecycle

## Clean-room interface specification

This package completes the remaining screens in **Group A: Application Shell and Game Lifecycle** for an original football-management simulation inspired by early-2000s management games.

## Included screens

- [Screen 18: Game Status](18_game_status.md)
- [Screen 19: Manager Status](19_manager_status.md)
- [Screen 20: Retire Manager](20_retire_manager.md)
- [Screen 21: Quit Game Confirmation](21_quit_game_confirmation.md)

## Previously documented Group A screens

1. Main Menu
2. New Game: Database Initialization
3. New Game: League and Nation Selection
4. New Game: Competition Detail Selection
5. New Game: Database Size and Performance Options
6. Game Loading and World Generation
7. Add Manager
8. Manager Personal Details
9. Manager Nationality and Languages
10. Manager Background
11. Club Selection
12. Manager Confirmation
13. Load Saved Game
14. Save Game and Save As
15. Delete Saved Game
16. Game Preferences
17. Display and Sound Options

## Cross-screen lifecycle

```text
Active Career
  -> Game Status
  -> Manager Status
      -> Retire Manager
  -> Quit Game Confirmation
      -> Save and Quit
      -> Quit Without Saving
      -> Cancel
```

## Shared implementation principles

- Treat renderer state as untrusted.
- Use stable identifiers instead of display names.
- Keep technical status pages read-only unless an explicit command is exposed.
- Protect destructive operations with authoritative validation and idempotency keys.
- Preserve safe checkpoints before retirement or application shutdown.
- Support keyboard navigation, visible focus, localization, high text scaling, reduced motion, and right-to-left layouts.
- Do not copy proprietary artwork, logos, exact wording, source code, or databases.

## Suggested Git commit

```text
docs(game-ui): complete application lifecycle screen specifications
```
