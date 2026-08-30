# ADR-0012: Action registry for keyboard-first renderer

**Status:** Accepted (2026-08-29). Decided during wayfinding for the keyboard-first-renderer effort, ticket [03-action-model](../../.scratch/keyboard-first-renderer/issues/03-action-model.md).

**Context:** [Agent Note](../../.agents/notes/proposed/architecture/2026-08-29-action-model.md)

## Decision

Screen operations become first-class **Action** records — a named, scoped, dispatchable type — registered in a central registry that the command palette, help overlay, key-binding layer, and rendered buttons all read from.

## Rationale

A keyboard-first app (level 3, mouse-free) needs to enumerate what is possible and check availability at runtime. Without a registry, the command palette and help overlay would duplicate the button-wiring list in two more places with no guard against drift. A registry turns all four consumers into views of the same record.

The screens today call `window.cmClone.call` directly in inline closures with no abstraction layer — an ad-hoc approach that works for mouse-only but cannot support the command palette and help overlay without either duplication or reaching into each screen's local state.

## Consequences

- Every button on a converted screen dispatches an Action from the registry. No screen lives in a mixed state.
- Availability predicates are best-effort frontend optimisations for palette UX; the backend still validates all commands.
- Adding a new operation to a screen means adding one Action record, not four wiring sites.
- A half-migration (screens with both Action-dispatch buttons and inline-closure buttons) will make the palette incomplete and must be prevented by code review.
- The Action record shape becomes a dependency for the key map, focus model, palette, router adoption, table navigation, match day controls, and e2e strategy — nearly every subsequent ticket in the effort.