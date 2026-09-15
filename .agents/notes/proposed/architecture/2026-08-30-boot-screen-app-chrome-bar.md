# Agent Note: Boot-screen app-chrome bar

Status: proposed

## Problem

The Save List is the app's boot screen — a flat list of save files with a "Start New Career" button. It has no surface for app-level destinations: no way to Quit, open Preferences, or view Credits (ticket 04 found all three absent). The imported spec assumes a Main Menu with these entries; the app replaced the Main Menu with the Save List but never relocated those items. A design was needed for where these three destinations live when there is no menu bar.

## Proposal

An **app-chrome bar** at the top of the Save List — a single horizontal row with three icon-only buttons:

- **⏻ Quit**: launches the existing before-quit guard dialog (see [Quit confirmation design](/.agents/notes/proposed/feature/2026-08-30-quit-confirmation-design.md)). No route, no keyboard shortcut.
- **⚙ Preferences**: opens an informational dialog (no settings to configure in v1 — displays app version, data directory, and a "no configurable preferences" message). No route, no keyboard shortcut.
- **© Credits**: opens an informational dialog listing framework components and licenses. No route, no keyboard shortcut.

All three are lightweight dialogs owned by the Save List — the same pattern as Retire (dialog on Manager Profile) and Quit (dialog triggered by main process). No routes, no `NavigationDestination` entries, no command-palette entries.

## Alternatives considered

- **Hamburger menu on the Save List.** A three-dot or hamburger icon in the corner reveals a dropdown with Quit, Preferences, Credits. Discarded: the Save List already has low visual density, and a hidden menu would bury three infrequent-but-important actions behind a reveal gesture. The app-chrome bar keeps them visible at zero friction.

- **Nothing at all — rely on OS chrome.** macOS has Quit in the app menu, but Windows/Linux users have no Quit path without the window close button. Preferences and Credits have no OS-level home. Discarded: not every platform provides these affordances, and the app should be self-contained.

- **Menu bar in a framed window.** Restore a native or custom menu bar with File/Edit/View menus. Discarded: Electron frameless windows are the project's established convention, and reintroducing a menu bar for three items is heavy overbuild.

- **Command palette entries for Quit, Preferences, Credits.** Discarded: the palette serves career-mode navigation (`g <key>`) and screen-local actions. Boot-screen actions are set-and-forget; they don't benefit from palette access and would add noise.

- **Route-based destinations (Quit screen, Preferences screen, Credits screen).** Each gets its own URL, route component, and navigation entry. Discarded: three screens with trivial content — a single dialog per action is simpler and avoids router boilerplate for screens that carry no state or sub-navigation.

- **Game Status screen as the host.** Ticket 05 decided against building Game Status as a screen and redistributed its survivors. The app-chrome bar is the same pattern (boot screen as host for non-career destinations), but Game Status's survivors (season orientation, schema version) redistributed into CareerChrome and an About dialog; the app-chrome bar owns the access points to those dialogs.

## Acceptance criteria

- The Save List renders an app-chrome bar with three icon buttons: Preferences, Credits, Quit.
- Quit launches the existing before-quit guard dialog (no separate dialog code).
- Preferences and Credits open informational dialogs unique to each.
- No routes, no `NavigationDestination` variants, no command-palette entries for Quit, Preferences, or Credits.
- The Save List keyboard tier (level 2) is recorded in the screen-keyboard-tiers note.

## Risks

- **Preferences has nothing to configure in v1.** If the app later gains configurable preferences (audio, display, key bindings), this dialog must be replaced with a full preferences surface. At that point, the decision to keep it as a dialog rather than a route should be revisited.
- **Button discoverability.** Three cryptic icons on the boot screen may not communicate their meaning to all users. Mitigated by tooltips and/or aria-labels that name the action.