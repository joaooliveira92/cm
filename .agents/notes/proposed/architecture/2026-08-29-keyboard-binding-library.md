# Agent Note: Key bindings use react-hotkeys-hook behind an internal seam

Status: proposed

## Problem

The CM clone is to become keyboard-first: every action reachable without a mouse, a command palette
for discovery, and grid navigation in the data tables. The renderer is greenfield for this — no
`onKeyDown`, `tabIndex`, or `autoFocus` exists anywhere in `apps/desktop/src/renderer`, and the
Playwright suite is 37 `click()` calls with no keyboard interaction.

A binding library was needed, and TanStack Hotkeys was the presumptive candidate because the wider
effort was already adopting TanStack packages, and because a command palette and a help overlay both
need to *enumerate* live bindings rather than merely register them — a capability
`useHotkeyRegistrations` appeared to offer uniquely.

## Proposal

Key bindings will use **`react-hotkeys-hook@5.x`**, wrapped behind one internal module so the
choice is a single-file swap. TanStack Hotkeys will not be adopted now.

### Why TanStack Hotkeys fails

The disqualifier is **no scopes and no priority layering**, which was the hardest requirement: a key
must mean different things on different screens, and a modal or the command palette must take
precedence over whatever is bound beneath it. Its dispatch loops over every registration on the
target and fires *every* match in registration order; `stopPropagation` affects the DOM event, not
that internal loop. `HotkeysProvider` is a default-options bag, not a scope container. The upstream
issue tracking this has been open since 2026-02-24.

Both packages are pre-1.0 and self-declared alpha — `@tanstack/hotkeys@0.8.0` and
`@tanstack/react-hotkeys@0.10.0`. Several of their open defects land precisely on this app's plan:
`?` is not expressible as a hotkey, which is the conventional help-overlay key; single-key hotkeys
fire while a focused grid or listbox owns the key, which directly contradicts the planned table grid
navigation; `Space` overrides native activation; and `useHotkeyRegistrations` itself carries a
setState-in-render defect.

### Why react-hotkeys-hook

It is stable at 5.x, roughly 3.4 KB gzipped, and covers every requirement TanStack misses:

- **Real scopes** — `enableScope` / `disableScope` / `toggleScope`, which is the screen-scoping and
  modal-priority mechanism the Action model depends on.
- **Enumeration is not exclusive to TanStack.** `useHotkeysContext().hotkeys` exposes `hotkey`,
  `keys`, `scopes`, `description`, `metadata` and `isSequence` for every registration — enough to
  drive both the help overlay and the command palette from live bindings rather than a
  hand-maintained duplicate list. This was the assumption most worth testing, and it did not hold.
- **Key sequences**, for prefix-style navigation such as `g` then a screen letter.
- **`enableOnFormTags` and `enableOnContentEditable`**, which handle the text-input collision
  problem at the library level rather than in app code.

### The seam

Screens and the Action registry will import a local module, never `react-hotkeys-hook` directly.
This keeps the choice reversible: if TanStack Hotkeys ships scopes and priority layering and reaches
1.0, adopting it is a one-file change. The same discipline applies to the renderer data layer under
[[2026-08-29-renderer-data-layer-effect-atom]].

### TanStack provides no focus management anywhere

Confirmed while evaluating: the entire published type surface of `@tanstack/react-router` mentions
"focus" once, in a `preloadDelay` doc comment, and its accessibility issue has been open since
January 2024. TanStack Table is headless and renders no DOM. Roving tabindex, focus restoration and
modal focus trapping are this application's work regardless of any library choice here. Router and
Table remain adopted for routing and table data models respectively; neither contributes to the
keyboard layer.

## Alternatives considered

- **TanStack Hotkeys.** Presumptive choice. Rejected on the scopes and priority gap above, its alpha
  status, and open defects that hit the help overlay and grid navigation specifically. Worth
  revisiting at 1.0.
- **tinykeys.** A key matcher, not a system: no scopes, no registry, no React binding. Rejected
  because the Action model would have to supply all three, which is the expensive part.
- **Rolling our own.** Roughly 150 lines over a `keydown` listener plus a scope stack, and initially
  attractive given the app's small surface. Rejected because it understates sequence matching and
  keyboard-layout edge cases, for no gain over a 3.4 KB stable dependency — and because the
  enumeration API needed by the palette is more than a weekend's work to get right.

## Acceptance criteria

- Exactly one module imports `react-hotkeys-hook`; no screen imports it directly.
- The help overlay and command palette both derive their contents from live binding registrations,
  not a hand-maintained list — so a binding added without a matching overlay entry is impossible.
- Bindings are screen-scoped, and an open palette or modal takes precedence over bindings beneath it.
- Typing in the save-name, bid-amount and counter-offer fields does not trigger bindings.
- `pnpm check:all` passes.

## Risks

- **A second binding library later.** If a need appears that `react-hotkeys-hook` cannot serve, the
  temptation will be to add rather than replace. The seam exists to make replacement the easy path;
  two binding systems would make key precedence unreasonable.
- **Scope discipline is a convention, not a mechanism.** Nothing mechanically prevents registering a
  global binding that should have been screen-scoped. If this recurs, it is a candidate lint rule
  per the repo's rule on routing repeat review findings.
- **Enumeration metadata can drift from reality.** The palette and overlay read `description` and
  `metadata`, which are author-supplied strings; they can be wrong even when the binding works.
- **Bundle and behaviour on Electron specifically** were judged from documentation, not measured in
  this app. The prototype in the global key map ticket is where that gets verified.
