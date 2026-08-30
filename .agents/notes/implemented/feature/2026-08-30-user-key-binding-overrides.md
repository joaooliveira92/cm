# Agent Note: User key binding overrides

Status: implemented

## Problem

The Action model (ADR-0012) and the global key map (feature/2026-08-29-global-key-map) settle the
default bindings: every Action may carry an optional `binding`, and the registry is the single
source the palette, help overlay, and key handler read. They leave open whether the map is fixed or
user-configurable, and if configurable, where overrides persist.

A keyboard-first app makes the keyboard the primary input path. A fixed map is the cheapest option —
the player learns it once and the help overlay is the only reference — but it commits the game to a
single layout and hand shape. Non-QWERTY layouts, non-US keyboards, and one-handed or ergonomic play
cannot adapt a fixed map.

## Decision

**Binding overrides are user-configurable, stored machine-locally, and never part of a save.**

- **Configurable: yes.** An override is a mapping from Action `id` to a new binding string
  (`record<string, string>`), applied over — never replacing — the coded defaults. Rebinding
  replaces the whole binding string, so a two-step `g <key>` navigation binding is rebound as one
  entry; the prefix mechanism itself is unchanged.
- **The renderer-vs-backend line: the override data is renderer-authored, but the file I/O runs in
  main through the existing typed RPC seam.** Four new `AppRpcs` methods
  (`getKeyBindingOverrides`, `setKeyBindingOverride`, `resetKeyBinding`, `resetAllKeyBindings`)
  carry the data over the same schema-validated channel the app already uses. Main owns a
  `keybindings.json` under Electron `userData` (a sibling of `saves/`), exactly as `saves.ts` owns
  save files; the renderer never touches the filesystem, and no binding ever enters an event stream,
  the SQLite save, a migration, or the determinism/save-compat contract.
- **Single decision point.** The registry (`ACTION_REGISTRY`/`ALL_ACTIONS`) stays the one membership
  authority; overrides are spine-owned state fetched through the seam, and one pure projector
  (`withEffectiveBindings`) layers `overrides[id] ?? binding` onto the registry's output at every
  consumption point (active set → `resolveDispatch`, tier slice → palette/overlay, career-g →
  prefix completions/indicator). No parallel mirror, no second source of truth.
- **Locked invariants.** Rebinding is offered for career-global, screen-scoped, and prefixed
  bindings, but not for the app_global infrastructure keys — `Escape` (close topmost transient
  layer), `Primary+K` (palette), `Primary+/` (help) — whose semantics are architectural, nor for
  `Enter`, which is focused-control activation, not a registry binding. The lock is checked in both
  directions: a target whose *effective* binding is a locked key is non-rebindable, and no *new*
  binding may itself be a locked key. Attempting either is rejected with a reason, never ignored.
- **Collision validation.** A new binding must not collide with the *effective* binding of another
  Action live in the same scope tier; the conflicting Action is named in the rejection. Shape and
  scope-expressibility checks reject bindings the framework cannot express (lone `g`, arrows,
  function keys, `Primary+<multiple keys>`, and shapes that would never fire for the target's scope
  — bare/Space on app-global, `Primary+` off app-global, `g x` off career-global).
- **Discovery: the help overlay is the rebinding surface.** The contextual help overlay shows each
  Action with its **effective** binding (the coded default recovered when the override is reset),
  supports in-place rebind (select the Action, press the new key), per-Action reset, and reset-all.
  The palette lists a "Rebind…" command (a real registry Action, `open-rebind`, so the palette stays
  a strict command surface) that opens the overlay.
- **Reset semantics.** Per-Action reset and reset-all are both offered; deleting an override returns
  the Action to its coded default, which is always visible, so the action is inherently reversible.
- **Tolerant decode.** A corrupt or truncated `keybindings.json` falls back to defaults (a corrupt
  file is never a startup error) and is fixed on the next write.

## Verification

- `packages/contracts/test/roundtrip.test.ts` — the four procedures' payload/success/error shapes
  (incl. the rejected-write error union) round-trip through the hand-rolled `AppRpcs` group.
- `apps/desktop/test/keybindings.test.ts` — set→get→fresh-file-read persistence under `userData`
  (restart = fresh file parse), two-step-as-one-entry, accumulation/last-write-wins, per-key and
  reset-all, tolerant corrupt-file decode + fixed-on-next-write, main-side string-level guards.
- `apps/desktop/test/override-validation.test.ts` — the pure validator: locked set (both
  directions), collisions naming the conflicting Action against effective bindings, the full
  shape/scope-expressibility matrix.
- `apps/desktop/test/discoverability-rebinding.test.tsx` — effective-binding rendering with the
  rebound marker, in-place capture → seam call → map adoption, Primary-chord canonicalization,
  Escape-cancel (no write), rejection rendering, per-Action reset, reset-all.
- `apps/desktop/test/main-renderer-guard-match.test.ts` — semantics agreement between main's
  backstop and the renderer validator for the locked set and the binding grammar (both sides now use
  `Primary\+\S` = literal `Primary+` + exactly one key; the unescaped forms were a real divergence).
- `apps/desktop/test/keyboard-spine-rebinding.test.tsx` — the mount-fetch/rebind race guard and the
  `open-rebind` → help-overlay wiring.
- `pnpm check:all` green.

## Alternatives considered

- **Fixed map, no rebinding.** Rejected: cheapest to ship, but commits a primary-input pathway to a
  single layout and hand shape, with no adaptation path for non-QWERTY, non-US, or one-handed play.
- **Overrides persisted in the backend's event-sourced store (a `SetKeyBinding` command).**
  Rejected: a key-binding preference is not game state — not deterministic, not part of a career,
  and should survive across saves/machines; the event stream keeps only the game.
- **`localStorage`.** Rejected: renderer-owned, resides in the Chromium profile, evictable, and a
  brand-new persistence mechanism for one preference. The app already has one durable-state story
  (`userData`), so the override file extends it instead of adding a second.
- **Overrides in the per-save directory.** Rejected: bindings are a machine property, not a career
  property; per-save storage fragments the map across saves.
- **A dedicated rebinding screen / settings screen.** Rejected for v1: no settings screen exists,
  and the help overlay already renders the exact data (Action → binding) the edit needs.
- **Configurable infra keys (`Escape`, `Primary+K`, `Primary+/`, `Enter`).** Rejected: their
  semantics are load-bearing — single-layer Escape, discoverable palette, focused-control Enter —
  and rebinding them invites designs that break those invariants for no access win.

## Risks

- **Rebinding is easy to mis-discover.** It lives inside the help overlay; mitigation is the
  palette's "Rebind…" command as a second entry point, and the teaching splash can mention it.
- **Prefix rebound to a non-prefix shape.** A `g s` binding replaced by something arbitrary could
  produce an entry the prefix layer cannot express; validation rejects unexpressible shapes.
- **Config file corruption.** Decode tolerantly in main, fall back to defaults, fix on next write.
- **Inline key badges lag overrides (shipped limitation).** The palette, help overlay, and key
  dispatch reflect effective bindings, but the inline `ActionKeyBadge` on screen buttons still
  renders the registry default, so a badge can advertise a key that no longer fires after a rebind.
  Stage 6 targets the overlay/palette/dispatch; the badge (a Stage-4 surface) must be reconciled, or
  dropped, before Stage 7 calls a screen "no-mouse driveable".
- **Cross-tier shadowing is a decision request.** Validation rejects same-scope collisions and
  inexpressible shapes, but a rebind that a higher-priority tier silently owns (a career-global
  Action reclaiming a screen key; a screen Action bound to `Space` under Continue) currently passes.
  Routed to `.scratch/keyboard-first-renderer/decision-request-binding-collision-tiers.md`; ships
  same-scope-only until resolved.
- **The inert contract variant.** `CollidingOverrideError` is pinned by a roundtrip test but no
  producer emits it (the renderer short-circuits collisions before the wire; main cannot know
  registry defaults). It stays as the forward-compatible error surface for a future unbounded write
  path.