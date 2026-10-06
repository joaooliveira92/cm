# Group S — Screen inventory (264–277)

**Question:** Which screens in Group S (Search, Utilities, Reference) already exist in shipped code,
under what names, and which remain unimplemented?

---

## Sources

| Source | What it provides |
|--------|------------------|
| [`apps/desktop/src/renderer/actions/`](obsidian://open?path=/Users/joao/dev/audit/apps/desktop/src/renderer/actions/) | The Action registry, dispatch, scope state, binding state, types, overrides |
| [`apps/desktop/src/renderer/discoverability/CommandPalette.tsx`](obsidian://open?path=/Users/joao/dev/audit/apps/desktop/src/renderer/discoverability/CommandPalette.tsx) | The command palette implementation |
| [`apps/desktop/src/renderer/discoverability/HelpOverlay.tsx`](obsidian://open?path=/Users/joao/dev/audit/apps/desktop/src/renderer/discoverability/HelpOverlay.tsx) | The keyboard-help overlay + rebinding surface |
| [`apps/desktop/src/renderer/discoverability/TeachingSplash.tsx`](obsidian://open?path=/Users/joao/dev/audit/apps/desktop/src/renderer/discoverability/TeachingSplash.tsx) | One-shot shortcut teaching splash |
| [`apps/desktop/src/renderer/discoverability/ActionKeyBadge.tsx`](obsidian://open?path=/Users/joao/dev/audit/apps/desktop/src/renderer/discoverability/ActionKeyBadge.tsx) | Inline badge showing keyboard binding on buttons |
| [`apps/desktop/src/renderer/discoverability/ShortcutHint.tsx`](obsidian://open?path=/Users/joao/dev/audit/apps/desktop/src/renderer/discoverability/ShortcutHint.tsx) | Prefix-hint badge during `g-` navigation |
| [`apps/desktop/src/renderer/discoverability/rank.ts`](obsidian://open?path=/Users/joao/dev/audit/apps/desktop/src/renderer/discoverability/rank.ts) | Palette ranking algorithm (exact → prefix → substring → binding → scope → word-initials) |
| [`apps/desktop/src/renderer/table/paletteActions.ts`](obsidian://open?path=/Users/joao/dev/audit/apps/desktop/src/renderer/table/paletteActions.ts) | Sort/filter palette actions for Squad, Market, Free Agents tables |
| [`apps/desktop/src/renderer/table/squad/playerStatus.tsx`](obsidian://open?path=/Users/joao/dev/audit/apps/desktop/src/renderer/table/squad/playerStatus.tsx) | The Term Disclosure abbreviation legend implementation |
| [`apps/desktop/src/renderer/managerProfile/ManagerProfileScreen.tsx`](obsidian://open?path=/Users/joao/dev/audit/apps/desktop/src/renderer/managerProfile/ManagerProfileScreen.tsx) | Irreversibility Disclosure for retirement |
| [`apps/desktop/src/renderer/router/mainMenu.tsx`](obsidian://open?path=/Users/joao/dev/audit/apps/desktop/src/renderer/router/mainMenu.tsx) | Main menu with version/database line, Credits dialog |
| [`external-reference/renderer/shell/global-search-state.ts`](obsidian://open?path=/Users/joao/dev/audit/external-reference/renderer/shell/global-search-state.ts) | Prototype `filterSearchTargets` — not wired into app |
| `.agents/notes/proposed/architecture/2026-08-29-contextual-help-mechanical-provenance.md` | Full contextual help architecture (proposed Agent Note) |
| `CONTEXT.md` (lines 830–872) | Domain glossary: Contextual Help, Mechanical Provenance, Term Disclosure, Irreversibility Disclosure, Readiness Blocker |
| `docs/specs/group_s_search_utilities_and_reference/*.md` | All 14 spec documents (264–277) |
| `.scratch/group-s-search-utilities-and-reference/map.md` | Group S wayfinder map — summarizes shipped/absent per screen |

---

## Findings

### Screen 270 — Command Palette and Quick Actions: SHIPPED

**Existing code:**

| File | Role |
|------|------|
| `apps/desktop/src/renderer/actions/types.ts` | Action model (`Action`, `ScopeState`, `ScreenName`, `Keystroke`) |
| `apps/desktop/src/renderer/actions/allActions.ts` | All 70+ registered Actions at startup — every screen operation is a named, scoped, dispatchable record |
| `apps/desktop/src/renderer/actions/registry.ts` | Registry builder with collision checks, scope tier filtering, locked infra keys |
| `apps/desktop/src/renderer/actions/dispatch.ts` | Runtime handler registration + dispatch by stable Action id |
| `apps/desktop/src/renderer/actions/scopeState.ts` | Live `ScopeState` published by mounted screens for availability predicates |
| `apps/desktop/src/renderer/actions/bindingState.ts` | Live override map for effective binding projection |
| `apps/desktop/src/renderer/actions/overrides.ts` | Validation, normalisation, effective-binding computation for rebinding |
| `apps/desktop/src/renderer/discoverability/CommandPalette.tsx` | The palette UI: combobox, ranking, keyboard dispatch |
| `apps/desktop/src/renderer/discoverability/rank.ts` | Palette ranking algorithm |
| `apps/desktop/src/renderer/table/paletteActions.ts` | Table sort/filter palette entries |
| `apps/desktop/src/renderer/discoverability/ActionKeyBadge.tsx` | Inline binding badge on screen-scoped buttons |
| `apps/desktop/test/renderer/discoverability/command-palette.test.tsx` | Tests |
| `apps/desktop/test/renderer/actions/registry.test.ts` | Tests |

**How it is surfaced:**
- Opened with **`Primary+K`** (Cmd+K on macOS, Ctrl+K on other platforms).
- A modal combobox lists all currently-available Actions for the active scope union (app-global + career-global + current-screen).
- Type to filter; available actions rank above unavailable; unavailable actions show disabled-with-reason (never hidden).
- Arrow keys navigate, Enter dispatches, Escape closes.
- Key badges on some screen buttons show effective bindings.

**Commands/actions that exist (~50 unique):**
- **app-global**: `open-palette` (Primary+K), `open-help` (Primary+/), `open-rebind`
- **career-global**: `continue` (Space), `go-back` (g b), 19 `go-to-<section>` (g 1..g 19)
- **squad**: `go-to-transfers`, `retry-squad-table`, `restore-squad-columns`, table sort/filter actions
- **transfers**: `focus-bid` (b), `place-bid`, `sign-free-agent`, `respond-accept`, `respond-reject`, `respond-counter`, `accept-counter`, `withdraw-bid`, `retry-market-table`, `retry-free-agents-table`, table sort/filter actions for market + free agents
- **tactics**: `save-tactic` (primary), `set-formation`, `set-mentality`, `set-tempo`, `set-pressing`, `assign-slot-player`
- **match**: `start-match`, `quick-result`, `toggle-control-panel`, `apply-live-tactics`, `set-live-mentality`, `set-live-tempo`, `set-live-pressing`, `set-live-substitute-off`, `set-live-substitute-in`, `make-substitution`, `play-on`, `bring-off`, `commit-matchday`
- **mainMenu/loadCareer**: `retry-save-list`

**Does it match the spec's "Command Palette" intent?**
- **Partial match.** The spec lists "Search screens, entities, and supported commands". The existing palette searches and dispatches **only registered Actions** (screen navigation + commands). It explicitly **does not search entities** (players, staff, clubs) — the file docstring says "No game-data search exists by construction — the only rows are registry Actions."
- The spec also describes a full dedicated screen reachable through navigation. The existing palette is a **transient modal overlay**, not a route-addressable screen.

---

### Screen 271 — Keyboard Shortcuts Reference: SHIPPED

**Existing code:**

| File | Role |
|------|------|
| `apps/desktop/src/renderer/discoverability/HelpOverlay.tsx` | The help overlay + rebinding surface |
| `apps/desktop/test/renderer/discoverability/help-overlay.test.tsx` | Tests |
| `apps/desktop/test/renderer/discoverability/rebinding.test.tsx` | Tests |

**How it is surfaced:**
- Opened with **`Primary+/`** (Cmd+/ on macOS, Ctrl+/ on other platforms).
- Also reachable via the palette's "Rebind…" command (`open-rebind`).
- Modal overlay with three tabs: **All**, **Global**, **This screen**.
- Every row shows the Action label, its effective binding, an availability indicator, and a **Rebind** button.
- Rebinding captures the next keystroke, validates it (locked keys, collisions, unexpressible shapes), and persists through RPC. Shows coded default beneath an override. Per-Action reset + Reset All.
- Status region feedback for errors/success.

**What shortcuts are documented:**
Every registered Action — the full registry's active set for the current scope union — is listed in one of the three tabs. There are ~50+ entries.

**Does it match the spec?**
- **Partial match.** The spec describes a full utility screen ("Keyboard Shortcuts Reference") reachable through the Global Application Shell navigation. The existing implementation is a **transient modal overlay** opened by key chord — not a full route-addressable screen with search, filtering, and export. However, the rebinding surface exceeds the spec's requirements.

---

### Screen 272 — Contextual Help and Onboarding: CONTRACTED (architecture defined, partially implemented)

**Agent Note:**
`.agents/notes/proposed/architecture/2026-08-29-contextual-help-mechanical-provenance.md` (423 lines, status: **proposed**)

This defines the full architecture:
- **Mechanical Provenance**: Every help claim must trace to authoritative game data/model.
- **Term Disclosure**: Visible, focusable, keyboard-operable inline expansion — never modal or hover-only.
- **Irreversibility Disclosure**: Architectural provenance for irreversible actions (match start, retirement).
- **Help never tapers**: No seen/dismissed/experience state.
- **Readiness Blocker contract**: Typed backend data → renderer language.
- **Presentation registries** live in `packages/shared` as exhaustive typed mappings.

**CONTEXT.md terms (lines 830–872):**
- **Contextual Help** — any explanation about the game's own model, permanently available.
- **Mechanical Provenance** — every claim traces to authoritative game data.
- **Player-Facing Attribute** — subset read by at least one shipped mechanic.
- **Term Disclosure** — single affordance, keyboard-operable, non-modal.
- **Irreversibility Disclosure** — architectural provenance, before commitment.
- **Readiness Blocker** — typed reason the human's Fixture cannot start.

**Components that implement parts of it:**

| File | What it implements |
|------|-------------------|
| `apps/desktop/src/renderer/discoverability/TeachingSplash.tsx` | One-shot teaching splash on first career load: shows 3 shortcuts (Cmd+K, Cmd+/, g-key navigation). Stored in localStorage. |
| `apps/desktop/src/renderer/table/squad/playerStatus.tsx` (lines 257+) | Term Disclosure: abbreviation legend for Status column — keyboard-operable, non-modal |
| `apps/desktop/src/renderer/managerProfile/ManagerProfileScreen.tsx` (line 40) | Irreversibility Disclosure for retirement confirmation |
| `apps/desktop/test/renderer/discoverability/teaching-splash.test.tsx` | TeachingSplash tests |
| `apps/desktop/test/renderer/table/status-column.test.tsx` (line 185) | Term Disclosure legend tests |

**Does it match the spec?**
- **Partial match.** The architecture is thoroughly defined (Agent Note + CONTEXT.md terms). Individual patterns (Term Disclosure for Status, Irreversibility Disclosure for retirement, TeachingSplash) are implemented. But the full spec — a dedicated screen with tours, empty-state guidance, validation explanations, searchable reference topics — **does not exist as a route-addressable screen**.
- The proposed Agent Note is status `proposed`, not `implemented`.

---

### Screen 277 — Application Information and Content Manifest: PARTIAL

The main menu at `apps/desktop/src/renderer/router/mainMenu.tsx` shows (lines 19–29, 254–259):
- `APP_VERSION = "0.0.0"` (tracks package.json version)
- `DATABASE_EDITION = "Fictional 2003/04 dataset"`
- A Credits dialog triggered from the menu (opens a scrollable `LightweightDialog`)
- Footer line: "Version {version}" / "Database: {edition} · Mods: none"

**Does not match the spec's full "Application Information and Content Manifest"** — no build info, save compatibility display, content pack checksums, support summary, or third-party licenses beyond a simple Credits dialog.

---

### Screens 264–269, 273–276: ABSENT

| Screen | Code status | Details |
|--------|-------------|---------|
| 264 Global Search | **Prototype only** | `external-reference/renderer/shell/global-search-state.ts` + `.test.ts` — a `filterSearchTargets` function. **Not wired into the app.** No route, no component. |
| 265 Advanced Search Builder | **Absent** | No code found. |
| 266 Search Results and Entity Preview | **Absent** | No code found. |
| 267 Recent Items and Navigation History | **Absent** | Table focus bookmarks (`focusBookmark.ts`) are session-scoped row restoration — not user-facing "recent items". No route, no component. |
| 268 Favorites and Pinned Items | **Absent** | No "favorites" or "bookmarked entities" model in the codebase. Column pinning (`columnPreferences.ts`) is table-column pinning, not entity pinning. |
| 269 Saved Views and Filters | **Absent** | Column visibility preferences are persisted per table (`columnPreferences.ts`) but there is no user-facing "save view" feature with naming, listing, or applying presets. |
| 273 Glossary and Football Terms | **Absent** | No glossary model, no route, no component. The `Term Disclosure` pattern is the closest analogue (abbreviation legend), but covers only the Status abbreviation set. |
| 274 Rules and Data Definitions Reference | **Absent** | No code found. |
| 275 Notification and Reminder Centre | **Absent** | The only notification UI is the News Inbox (Screen 31). No reminder system, no notification preferences, no snooze/dismiss model. |
| 276 Import/Export and Sharing Utilities | **Absent** | No code found. Known overlap with Group F Screen 88 (per `.ai/SPEC-ROADMAP.md`). |

---

## Recommendations

### Facts the implementator may rely on

1. **Screen 270 (Command Palette)** exists as a modal overlay under `discoverability/CommandPalette.tsx`, activated by `Primary+K`, covering only Action dispatch (no entity search). Its registry, dispatch, and binding infrastructure are production-grade.

2. **Screen 271 (Keyboard Shortcuts Reference)** exists as `discoverability/HelpOverlay.tsx`, a modal overlay activated by `Primary+/`, which also serves as the rebinding surface for user key overrides.

3. **Screen 272 (Contextual Help and Onboarding)** has a fully-architected but **proposed** Agent Note at `.agents/notes/proposed/architecture/2026-08-29-contextual-help-mechanical-provenance.md`. Term Disclosure is partially implemented in `playerStatus.tsx`. Irreversibility Disclosure is implemented in `ManagerProfileScreen.tsx`. TeachingSplash implements one-shot shortcut onboarding.

4. **Screen 277 (Application Information)** has a minimal footer version line and Credits dialog in `mainMenu.tsx`, but no dedicated screen.

5. **Screens 264–269, 273–276** have no shipped code. The global search prototype in `external-reference/` is a standalone utility function, not wired into the renderer.

### Design choices remaining (not facts)

- Whether the Command Palette should be promoted from transient modal to a route-addressable full screen.
- Whether the Help Overlay should be promoted from transient modal to a route-addressable full screen.
- Whether Contextual Help should ship as a route-addressable screen or remain purely contextual (popovers, inline) on existing screens.
- Whether to build Import/Export in Group S or Group F.
- What entity-search infrastructure Group S's search screens depend on from Groups D–L.

---

## Gaps

- The existing Command Palette is explicitly an Actions-only surface. Entity search would require new infrastructure (player/club/staff search indexing, bounded queries).
- No "favorites" or "bookmarks" model exists in persistence or state — that would need schema additions for manager-scoped entity references.
- Notifications beyond News Inbox have no model, no persistence, no UI.
- Glossary terms have no registry outside the domain model — the `AttributePresentation` registries described in the contextual help Agent Note are not yet implemented in `packages/shared`.
- Import/Export has zero implementation; it is marked as overlapping Group F Screen 88, which must be reconciled.
- Application Information has only a footer line; no build info, save compatibility, content manifest, licenses, or support summary exists.