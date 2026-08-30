# 06-intra-screen-focus-model

Type: prototype
Status: resolved
Blocked by: 03

## Question

How does focus move *within* a screen, and what does "the currently focused thing" mean?

The renderer has no focus handling whatsoever today — no `tabIndex`, no `autoFocus`, no focus
styling. Browser-default tab order is what exists, and on a 30-column table it is unusable.

Build a rough prototype on one real screen to react to.

Decide:

- **Roving focus vs native tab order**: whether lists and tables use a roving tabindex with arrow
  keys (one tab stop per region) or remain a flat tab sequence. Roving is the level 3 answer but
  needs a "current item" concept per region.
- **Regions**: whether a screen is formally divided into focusable regions that a key cycles
  between, or whether focus is one flat sequence.
- **Focus on arrival**: what receives focus when a screen is entered by keyboard, and whether that
  is remembered when the player leaves and returns.
- **Focus ring**: the visual treatment in Tailwind, and whether it differs for keyboard-initiated
  versus mouse-initiated focus.
- **Selection versus focus**: whether a focused table row is also selected, or whether selection is
  a separate state a key commits. This determines whether "focused row" can be an Action's implicit
  argument — which the Action model's availability predicates will depend on.
- **Focus during async work**: what happens to focus while a mutation is in flight and the screen
  re-renders with new data. Every screen currently refetches wholesale after a write.

## Answer

**Hybrid model: native Tab for regions, roving for composite widgets; selection separate from focus; identity-based async restoration; one `:focus-visible` ring.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-08-29-intra-screen-focus-model.md). Prototype: [focus model demo](../prototype/focus-model.html).
