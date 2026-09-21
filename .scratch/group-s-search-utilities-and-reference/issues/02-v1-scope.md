# 02: Which screens of Group S are in v1 scope?

Type: grilling
Status: resolved

Blocked by: 01

## Question

[Ticket 01](01-screen-inventory.md) found three shipped/contracted screens (270, 271, 272), one
partial (277), and ten absent (264–269, 273–276).

The screens group into four bands:

### Band 1 — Shipped but as modals, not screens

Shipped under `discoverability/` but as modals, not route-addressable screens:

| Screen | Shipped form | Gap from spec |
|--------|-------------|---------------|
| 270 Command Palette | `CommandPalette.tsx` — action dispatch only | No entity search. Predominantly keyboard-opened (Primary+K). |
| 271 Keyboard Shortcuts | `HelpOverlay.tsx` — lists actions + bindings | Not a full route-addressable reference screen. |
| 272 Contextual Help | Agent Note defined; partial impl (Term Disclosure, TeachingSplash) | No dedicated screen — embedded as inline widgets. |

**Recommendation:** renamed. The concepts exist; the spec envisions full screens. The shipped modal
form is acceptable for v1. The contextual help Agent Note is `proposed` — would need promotion when
the full help surface ships.

### Band 2 — Absent, dependent on other groups

Screens that need data from Groups D–L before they pay off:

| Screen | Dependency |
|--------|-----------|
| 264 Global Search | Needs entity index across clubs, players, competitions (Groups D–L) |
| 265 Advanced Search Builder | Same dependency |
| 266 Search Results / Entity Preview | Same dependency |

**Recommendation:** deferred. These pay off only once the entity screens exist.

### Band 3 — Absent, needs new models

| Screen | Problem |
|--------|---------|
| 267 Recent Items / Nav History | No recent-items model |
| 268 Favorites / Pinned Items | No favorites/bookmarks model |
| 269 Saved Views / Filters | No saved-view/filter model |
| 273 Glossary / Football Terms | No glossary model |
| 274 Rules / Data Definitions | Could be derived but no surface exists |
| 275 Notification / Reminder Centre | Overlaps News Inbox (Screen 24) — would need a combined or separate surface decision |

**Recommendation:** deferred. Each needs a new data model or a redesign of an existing surface.

### Band 4 — Overlaps another group

| Screen | Overlap |
|--------|---------|
| 276 Import / Export Utilities | Overlaps Group F Screen 88 (per SPEC-ROADMAP) |
| 277 Application Information | Partial — version footer + Credits dialog exists |

**Recommendation:** 276 → needs reconciliation with Group F. 277 → either renamed (partial existing
impl) or deferred (no full information screen).

## Options

**A — Accept the recommendations above.** 270/271/272 → renamed. 264–269, 273–275 → deferred. 276
→ blocked on Group F reconciliation. 277 → renamed.

**B — Promote 270/271/272 to full screens.** Build dedicated route-addressable screens for Command
Palette, Keyboard Shortcuts, and Contextual Help. Largest option — closest to spec's intent.

**C — Defer everything except the three shipped modals.** The shipped modals stay as they are,
marked renamed. All absent screens deferred. Group F owns 276's reconciliation.

## Recommendation

**Option C.** The shipped modals adequately serve their purpose. Promoting them to full screens is a
cosmetic change with no mechanical difference. The absent screens depend on other groups or new
models and should not be chartered before those dependencies resolve.

## Answer

**Option C.** The shipped modals stand in for 270, 271 and 272 (renamed), and 277 is renamed to the
version footer and Credits dialog. 264–269 and 273–275 are deferred; 276 is deferred to Group F's
reconciliation of Screen 88. Decided under the human's standing delegation (2026-09-21). Recorded as
[Group S v1 scope](../../../.agents/notes/proposed/architecture/2026-09-21-group-s-v1-scope.md);
the per-screen register is in [spec.md](../spec.md).
