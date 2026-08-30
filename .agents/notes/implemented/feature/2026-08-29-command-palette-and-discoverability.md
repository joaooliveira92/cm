# Agent Note: Command palette and discoverability

Status: implemented

## Problem

A keyboard-first app is only usable if players can learn what the keyboard does. The Action model (ADR-0012) defined what actions exist and the Global key map (feature/2026-08-29-global-key-map) assigned them bindings, but neither specified how a player discovers those bindings — whether through a searchable palette, a help reference, inline key hints on buttons, or first-run teaching. Without these mechanisms, level 3 (mouse-free) was unreachable: every action might be bound, but a player who didn't know the bindings would reach for the mouse.

## Decision

Four discovery mechanisms work together; none is an alternative to the others. They ship as one deliberate big-bang in Stage 4, gated on every career screen dispatching registered Actions, so the palette and help are always consistent with the live registry — never the half-migrated lie.

### Command palette (`Cmd+K` / `Ctrl+K`)

- Exists, opened from any screen (`app_global`, always active). The primary discovery surface.
- Lists global + current-screen actions: not "global only" (misses screen context) and not "all screens" (noise).
- Available actions ranked above unavailable, then by label match score: exact → prefix → substring → binding → scope/screen → word-initials fuzzy. (The "+10 boost" is realized as the available-tier split; AC-04's "within each tier" is the unambiguous reading.)
- Unavailable actions shown disabled with a plain-language reason ("Select a player first"), never hidden.
- Entries navigate as Actions ("Go to Squad"), never instant navigation on select — every entry dispatches an Action record.
- Strictly a command surface. Game-data search (players/clubs/competitions) is out of scope.

### Help overlay (`Cmd+/` / `Ctrl+/`)

- Persistent key-map reference, opened from any screen.
- Tabs: All / Global / This screen. The player chooses the level of detail.
- Lists every registered Action with its binding, derived from live registrations (the overlay is a snapshot of the registry), with an availability indicator for entries whose predicate is currently true.

### Inline affordances

- Screen-scoped action buttons display their key binding as a small badge (e.g. "b" on the Bid-draft cluster), via `ActionKeyBadge`/`actionBadgeBinding` reading only registry-owned bindings.
- Toggleable per screen via registry metadata (`SCREEN_METADATA`, `keyBadgesEnabledFor`). Navigation `g <key>` actions have no visible button and rely on palette/help.

### First-run teaching

- A brief, dismissible splash on the **first load of a career screen** (never the creation step), exactly three lines: `Cmd+K` palette, `Cmd+/` help, `g <key>` navigation.
- Never re-shown: a `cmClone.teachingSplashSeen` flag (renderer-local `localStorage`) is written on dismissal. This is a cosmetic UI preference, not authoritative game state, so renderer-local storage is consistent with the contract's no-localStorage-for-authoritative-state rule; the Stage 6 rebinding store (keybindings.json under userData via RPC) is the separate home for applied-everywhere mechanical settings.

### Escape layering (AC-20)

- `Escape` closes only the topmost transient layer — splash (when visible) > palette | help > `g` prefix. Opening an overlay is pure React state, never a router/history call, so overlays create no history entries.
- While an overlay is open, nothing beneath it fires (dispatch priority 2); type-to-filter keys go to the palette field.

## Verification

- `test/discoverability-rank.test.ts` — pure `rankPaletteActions` ordering (available tier first; label-match chain) and per-action unavailable reasons.
- `test/discoverability-command-palette.test.tsx` — listing, ranking, disabled-with-reason, never hidden, filtering, roving, Enter dispatch, Escape.
- `test/discoverability-help-overlay.test.tsx` — All/Global/This-screen tabs; overlay == registry snapshot (`actionsInTiers(ALL_ACTIONS, screen)`); availability indicators.
- `test/discoverability-key-badges.test.ts` — metadata toggle + `actionBadgeBinding` (a badge never claims a binding the registry doesn't own).
- `test/discoverability-teaching-splash.test.tsx` + `discoverability-escape-layering.test.tsx` — first career-screen load, exactly three shortcuts, dismiss persists, remount silent, focused-button Escape.
- `pnpm check:all` green.

## Risks

- **Palette latency.** The registry is O(n) with n < 50; ranking is a pure function over the active set, so filtering is not a bottleneck.
- **Inline affordance collisions on small buttons.** A single-letter badge is positioned to avoid overflow; button min-width can absorb long labels.
- **Help overlay staleness.** Availability is a snapshot at help-open time; the binding table itself is always accurate (derived from the registry).
- **Splash timing.** Showing on first load of a career screen (not creation) gives the player context; write-on-dismiss-only means leaving without dismissing legitimately re-offers it.
