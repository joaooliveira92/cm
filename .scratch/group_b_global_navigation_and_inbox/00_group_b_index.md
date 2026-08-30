# Group B: Global Navigation and Inbox

## Package contents

This package contains all specifications for **Group B: Global Navigation and Inbox**.

- [Screen 22: Global Application Shell](22_global_application_shell.md)
- [Screen 23: Continue and Advance Time](23_continue_and_advance_time.md)
- [Screen 24: News Inbox](24_news_inbox.md)
- [Screen 25: Individual News Message](25_individual_news_message.md)
- [Screen 26: News Filters](26_news_filters.md)
- [Screen 27: Background Processing and Updating Game](27_background_processing_and_updating_game.md)
- [Screen 28: Calendar and Schedule](28_calendar_and_schedule.md)
- [Screen 29: Manager Notebook](29_manager_notebook.md)
- [Screen 30: Manager History](30_manager_history.md)
- [Screen 31: Manager Profile](31_manager_profile.md)
- [Screen 32: Manager Chat and Multiplayer Communication](32_manager_chat_and_multiplayer_communication.md)

## Functional flow

```text
Global Application Shell
  -> Continue and Advance Time
  -> Background Processing and Updating Game
  -> News Inbox
      -> News Filters
      -> Individual News Message
  -> Calendar and Schedule
  -> Manager Notebook
  -> Manager History
  -> Manager Profile
  -> Manager Chat and Multiplayer Communication
```

## Shared architectural requirements

- Stable IDs and immutable revisioned read models.
- Active-manager privacy and permission filtering.
- Narrow validated renderer commands.
- Safe navigation history and focus restoration.
- Virtualized lists and cancellable asynchronous queries.
- Deterministic canonical simulation and idempotent actions.
- Full keyboard, screen-reader, localization, high-scaling, and RTL support.

## Suggested Git commit

```text
docs(game-ui): add global navigation and inbox specifications
```
