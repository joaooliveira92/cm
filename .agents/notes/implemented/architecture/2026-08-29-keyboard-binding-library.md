# Agent Note: Key bindings use react-hotkeys-hook behind an internal seam

Status: implemented

## Problem

The CM clone was to become keyboard-first: every action reachable without a mouse, a command palette for discovery, and grid navigation in the data tables. The renderer was greenfield for this — no `onKeyDown`, `tabIndex`, or `autoFocus` existed anywhere in `apps/desktop/src/renderer`, and the Playwright suite is 37 `click()` calls with no keyboard interaction.

A binding library was needed, and TanStack Hotkeys was the presumptive candidate because the wider effort was already adopting TanStack packages, and because a command palette and a help overlay both need to *enumerate* live bindings rather than merely register them.

## Decision

Key bindings use **`react-hotkeys-hook@5.x`**, wrapped behind one internal module (`renderer/hotkeys.ts`) so the choice is a single-file swap. TanStack Hotkeys is not adopted.

### Why TanStack Hotkeys fails

The disqualifier is **no scopes and no priority layering**, the hardest requirement: a key must mean different things on different screens, and a modal or the command palette must take precedence over whatever is bound beneath it. Its dispatch loops over every registration on the target and fires *every* match in registration order; `stopPropagation` affects the DOM event, not that internal loop. `HotkeysProvider` is a default-options bag, not a scope container. The upstream issue tracking this has been open since 2026-02-24.

Both packages are pre-1.0 and self-declared alpha — `@tanstack/hotkeys@0.8.0` and `@tanstack/react-hotkeys@0.10.0`. Their open defects land precisely on this app's plan: `?` is not expressible as a hotkey (the conventional help key); single-key hotkeys fire while a focused grid or listbox owns the key; `Space` overrides native activation; and `useHotkeyRegistrations` itself carries a setState-in-render defect.

### Why react-hotkeys-hook

It is stable at 5.x, roughly 3.4 KB gzipped, and covers every requirement TanStack misses:

- **Real scopes** — `enableScope`/`disableScope`/`toggleScope`, the screen-scoping and modal-priority mechanism the Action model depends on.
- **Enumeration is not exclusive to TanStack.** `useHotkeysContext().hotkeys` exposes `hotkey`, `keys`, `scopes`, `description`, `metadata` and `isSequence` for every registration — enough to drive both the help overlay and the command palette from live bindings rather than a hand-maintained duplicate list.
- **Key sequences**, for prefix-style navigation such as `g` then a screen letter.
- **`enableOnFormTags` and `enableOnContentEditable`**, which handle the text-input collision problem at the library level (AC-19 suppression).

### The seam

Screens and the Action registry import the local seam (`renderer/hotkeys.ts`), never `react-hotkeys-hook` directly. The renderer-boundary lint (`scripts/effect-lint.ts`) forbids direct `react-hotkeys-hook` imports in enforced renderer files, exempting only the seam, so the choice stays reversible and enforced.

The dispatch-priority stack (one keystroke, at most one action — AC-17) lives in the pure `renderer/keymap/` modules, which the spine mirrors through the seam.

### TanStack provides no focus management anywhere

Confirmed while evaluating: the entire published type surface of `@tanstack/react-router` mentions "focus" once, in a `preloadDelay` doc comment, and its accessibility issue has been open since January 2024. TanStack Table is headless and renders no DOM. Roving tabindex, focus restoration and modal focus trapping are this application's work regardless of any library choice here. Router and Table remain adopted for routing and table data models respectively; neither contributes to the keyboard layer.

## Verification

- `test/renderer-boundary-lint.test.ts` — the lint rejects a direct `react-hotkeys-hook` import via a fixture; the seam `hotkeys.ts` is exempt.
- `test/keymap-priority.test.ts`, `test/keymap-prefix.test.ts` — the pure priority stack, prefix lifecycle and AC-19 suppression.
- `pnpm install` resolves `react-hotkeys-hook@5.x` via the workspace catalog; `pnpm check:all` green.

## Risks

- **A second binding library later.** If a need appears that `react-hotkeys-hook` cannot serve, the temptation will be to add rather than replace. The seam exists to make replacement the easy path; two binding systems would make key precedence unreasonable.
- **Scope discipline is a convention, not a mechanism.** Nothing mechanically prevents registering a global binding that should have been screen-scoped. If this recurs, it is a candidate lint rule per the repo's rule on routing repeat review findings.
- **Enumeration metadata can drift from reality.** The palette and overlay read `description` and `metadata`, which are author-supplied strings; they can be wrong even when the binding works.
- **Bundle and behaviour on Electron specifically** were judged from documentation, not measured in this app. The prototype in the global key map ticket is where that gets verified.
