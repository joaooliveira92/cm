# 01: The redesigned navbar reports every navigation as pointer intent, breaking AC-15

Type: bug
Status: ready-for-agent

## What was measured

Found on `dev` at `9cc3ca1` while repairing the e2e suite. `e2e/router.spec.ts` "pointer nav does
not force focus; keyboard nav focuses the destination (AC-15)" fails in 1.6s — a clean assertion
failure, not a timeout:

```
Expected: "tactics"
Received: null
```

The test focuses the Tactics nav item and presses Enter, then reads
`document.activeElement?.getAttribute("data-focus-id")`. Keyboard navigation is supposed to move
focus to the arriving screen; nothing is focused.

## Root cause

`src/renderer/navigation/components/Navbar.tsx:154`:

```ts
const goTo = (destination: CareerDestination["type"]) => {
  clearTransient();
  navigateCareer({ type: destination, saveId }, "pointer");
};
```

The intent is hardcoded to `"pointer"`. `PrimaryNavItem` wires `goTo` to `onClick`, and a keyboard
Enter on a focused `<button>` fires `onClick` — indistinguishable from a mouse click at that seam,
so every navbar navigation is reported as a pointer arrival.

`navigation/adapter.ts` is doing its job correctly and documents the contract:

```ts
/** Navigate to a career destination, requesting destination focus on keyboard/
 *  palette intent (pointer arrival leaves focus where it is). */
export const navigateCareer = (destination: CareerDestination, intent: NavigationIntent): void => {
  if (!isPointerIntent(intent)) requestFocus({ screen: destination.type });
```

So the focus coordinator never gets a `requestFocus` from the navbar. The mechanism is intact; only
the call site lost the distinction. The vertical tab strip the navbar replaced passed the real
intent — this is a regression introduced by the redesign, not a missing feature.

## Why it matters beyond one test

AC-15 is the focus policy for the whole app: keyboard users must land *in* the screen they
navigated to, not be stranded on the nav item they just activated. With this hardcoded, every
keyboard navigation through the navbar leaves focus on the navbar, so the next Tab starts from the
chrome rather than the content. The `g <key>` spine still requests focus correctly (it calls
`navigateCareer` with its own intent), which is why the bug hides — until the navbar is driven.

## Fix sketch

`PrimaryNavItem` and `ContextNav` need to report how they were activated. The usual discriminator
is `event.detail === 0` on the click event (keyboard-synthesised clicks report 0), or wiring
`onKeyDown` for Enter/Space separately from `onClick`. Whichever is chosen, the same treatment is
needed for the context-strip items, which navigate through the same `goTo`.

Note this is unrelated to the renderer wedge in `.scratch/renderer-input-wedge/` — that one is a
CPU spin, this one is a clean wrong-value bug. They were found in the same session but do not share
a cause.

- [ ] Navbar and context strip report keyboard activation as keyboard intent
- [ ] `e2e/router.spec.ts` AC-15 passes without weakening the assertion
- [ ] A unit test at the `PrimaryNavItem` seam covers Enter-vs-click intent, so this cannot regress
      silently again
