# Group S: Search, Utilities and Reference

## Package contents

- [Screen 264: Global Search](264_global_search.md)
- [Screen 265: Advanced Search Builder](265_advanced_search_builder.md)
- [Screen 266: Search Results and Entity Preview](266_search_results_and_entity_preview.md)
- [Screen 267: Recent Items and Navigation History](267_recent_items_and_navigation_history.md)
- [Screen 268: Favorites and Pinned Items](268_favorites_and_pinned_items.md)
- [Screen 269: Saved Views and Filters](269_saved_views_and_filters.md)
- [Screen 270: Command Palette and Quick Actions](270_command_palette_and_quick_actions.md)
- [Screen 271: Keyboard Shortcuts Reference](271_keyboard_shortcuts_reference.md)
- [Screen 272: Contextual Help and Onboarding](272_contextual_help_and_onboarding.md)
- [Screen 273: Glossary and Football Terms](273_glossary_and_football_terms.md)
- [Screen 274: Rules and Data Definitions Reference](274_rules_and_data_definitions_reference.md)
- [Screen 275: Notification and Reminder Centre](275_notification_and_reminder_centre.md)
- [Screen 276: Import Export and Sharing Utilities](276_import_export_and_sharing_utilities.md)
- [Screen 277: Application Information and Content Manifest](277_application_information_and_content_manifest.md)

## Functional flow

```text
Global Search
  -> Advanced Search Builder
  -> Search Results and Entity Preview
Recent Items, Favorites, and Saved Views
Command Palette and Keyboard Shortcuts
Contextual Help and Onboarding
Glossary and Rules Reference
Notification and Reminder Centre
Import, Export, and Sharing Utilities
Application Information and Content Manifest
```

## Shared requirements

- Stable typed identities and permission-aware search.
- Manager-private recents, favorites, views, reminders, and onboarding state.
- Registered context-bound commands that cannot bypass owning workflows.
- Versioned help, glossary, rules, metrics, and data definitions.
- Trusted isolated import and export processing with format sanitization.

## Suggested Git commit

```text
docs(game-ui): add search utilities and reference specifications
```
