# 01-tanstack-hotkeys-viability

Type: research
Status: resolved

## Answer

**No — TanStack Hotkeys is alpha and has no scopes or priority layering; use `react-hotkeys-hook@5.x` behind an internal seam. Router and Table confirmed to provide no focus management.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-08-29-keyboard-binding-library.md) and [research findings](../research/01-tanstack-hotkeys-viability.md).

## Question

Is TanStack Hotkeys the right primitive for this app's key-binding layer, and does anything else in
the TanStack lineup help with focus?

Establish, from primary sources (TanStack docs, repo, releases, npm):

- **TanStack Hotkeys maturity**: current version and release status (stable / beta / alpha), release
  cadence, React 19 compatibility, bundle cost, and whether it is framework-agnostic core plus a
  React adapter or React-only.
- **Capability fit** against what a keyboard-first CM clone needs: scoped or contextual bindings
  (a key means different things on different screens), sequence bindings (`g` then `s`), suppression
  inside text inputs and `contenteditable`, priority or layering when a modal is open, and
  programmatic enumeration of active bindings — the last one matters because a help overlay and a
  command palette both need to *read* the current key map, not just register into it.
- **Router and Table focus story**: confirm or refute that TanStack Router provides no focus
  management on navigation and TanStack Table provides no DOM or focus handling. If either offers
  anything (focus restoration, a11y hooks, a documented grid recipe), record exactly what.
- **Alternatives**, judged on the same axes: `react-hotkeys-hook`, `tinykeys`, and rolling our own
  (~150 lines over a `keydown` listener plus a scope stack). For each, state what it does *not* do
  from the capability list above.

Answer with a recommendation and the facts behind it. If TanStack Hotkeys is too green to depend on,
say so plainly — the rest of the map does not depend on the answer being "yes".
