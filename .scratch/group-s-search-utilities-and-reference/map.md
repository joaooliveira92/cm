# Map: Group S — Search, Utilities and Reference

Label: `wayfinder:map`

## Destination

A reconciliation spec and deviation register for screens 264–277 (Global Search through Application
Information and Content Manifest), deciding per screen whether it is in v1 scope, deferred,
renamed, contradicted, out of scope, or already shipped under another name.

## Notes

**Domain**: local single-player football-management sim, Electron + event-sourced Effect domain
layer.

**Group S is unique**: three screens are already shipped under other efforts — the rest are absent.

| Screen | Status in shipped code |
|--------|----------------------|
| 270 Command Palette and Quick Actions | **Shipped** — `renderer/actions/registry.ts` etc. |
| 271 Keyboard Shortcuts Reference | **Shipped** — key binding system and help overlay |
| 272 Contextual Help and Onboarding | **Contracted** — full architecture defined in `contextual-help-mechanical-provenance.md` Agent Note; CONTEXT.md defines the terms |
| 264–269, 273–277 | **Absent** — no routes, no components, no data models |

**Known overlaps with shipped concepts:**
- 264 Global Search would need Groups D–L to exist before it pays off.
- 267–269 Favorites/Pinned/Saved would need a model for marking entities as favourites.
- 275 Notification and Reminder Centre overlaps the existing News Inbox and would need a clear
  boundary.
- 276 Import/Export overlaps Group F Screen 88.
- 277 Application Information overlaps the existing About/version screen.

## Decisions so far

- [01 — Screen inventory](issues/01-screen-inventory.md): three screens shipped as modals (270, 271,
  272), one partial (277), ten absent (264–269, 273–276). Shipped forms are modal/overlay, not
  route-addressable screens.
- [02 — v1 scope](issues/02-v1-scope.md): Option C. 270–272 and 277 renamed to their shipped forms; 264–269, 273–275 deferred; 276 goes to Group F. [Agent Note](../../.agents/notes/proposed/architecture/2026-09-21-group-s-v1-scope.md).