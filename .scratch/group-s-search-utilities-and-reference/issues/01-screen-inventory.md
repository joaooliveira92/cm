# 01: Screen inventory — what of screens 264–277 exists

Type: task
Status: resolved

## Answer

Group S has three shipped/contracted screens, one partial, and ten absent.

| Screen | Category | Detail |
|--------|----------|--------|
| 264 Global Search | **Absent** | No global search UI or index. Prototype exists in `external-reference/` - standalone, unwired. |
| 265 Advanced Search Builder | **Absent** | No advanced search infrastructure. |
| 266 Search Results / Entity Preview | **Absent** | No entity search results surface. |
| 267 Recent Items / Nav History | **Absent** | No recent items model. |
| 268 Favorites / Pinned Items | **Absent** | No favorites/bookmarks model. |
| 269 Saved Views / Filters | **Absent** | No saved search/filter model. |
| 270 Command Palette | **Shipped** — as `discoverability/CommandPalette.tsx` (Primary+K modal). Action dispatch only, no entity search. Does not match spec's full vision. |
| 271 Keyboard Shortcuts | **Shipped** — as `discoverability/HelpOverlay.tsx` (Primary+/ modal). Lists actions with bindings, includes rebinding. Not a full route-addressable screen. |
| 272 Contextual Help | **Contracted** — full architecture defined but Agent Note is `proposed` (not implemented). CONTEXT.md defines five terms. Partial implementation: `playerStatus.tsx` (Term Disclosure legend), `ManagerProfileScreen.tsx` (Irreversibility Disclosure), `TeachingSplash.tsx` (one-shot onboarding). |
| 273 Glossary / Football Terms | **Absent** | No glossary or terms reference. |
| 274 Rules / Data Definitions | **Absent** | No rules reference surface. |
| 275 Notification / Reminder Centre | **Absent** | Overlaps News Inbox (Screen 24). No combined notification surface. |
| 276 Import / Export Utilities | **Absent** | Overlaps Group F Screen 88 per SPEC-ROADMAP. Needs reconciliation. |
| 277 Application Information | **Partial** — version footer + Credits dialog in `mainMenu.tsx`. No full information screen. |

See [Research note](../../../docs/research/group-s-screen-inventory.md).