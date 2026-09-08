# 06: Keyboard arrival focus lands on an unlabelled wrapper, on every screen

**What to build:** an answer to where keyboard arrival focus should land, and the change that makes
it land there. Today it lands on a `<div>` with no accessible name, so an assistive user who
navigates to any screen hears nothing about where they arrived.

**What is actually happening:** `requestFocus({ screen })` carries no `region`, so
`querySemanticTarget` resolves it to `[data-focus-id="<screen>"]`
(`apps/desktop/src/renderer/focus.ts`). That selector matches the `RouteView` wrapper —
`<div data-focus-id={screenId} tabIndex={-1}>` — which sits *outside* the screen's `<main>` and
carries no label. Several screens already label their `<main>` well: Club Staff's is
`aria-labelledby` the club heading, so it would announce "Northport Rovers · Club Staff" if it were
the target. The wrapper wins the selector, so none of that is heard.

This surfaced while closing club-staff-presence ticket 03, whose acceptance criterion promised
"keyboard arrival lands on the club header (the `<main>` region's label)". That criterion was
amended rather than met, because the behaviour is app-wide and predates the ticket. It is filed
here so the amendment does not quietly become the end of it.

**Why it is not a one-line fix:** moving `data-focus-id` onto each screen's `<main>` changes the
focus target for all fifteen screens at once, and screens differ in what they would then announce —
some `<main>` elements are labelled, some are not. The alternatives are worth weighing before any
of them ships: label every `<main>` and move the target; keep the wrapper but give it the screen's
accessible name; or resolve arrival to the screen's `<h1>` where one exists. Each has a different
answer for the screens with no heading at all.

**Blocked by:** none.

**Status:** ready-for-agent

**Files:** `apps/desktop/src/renderer/focus.ts`, `apps/desktop/src/renderer/router/RouteView.tsx`,
every screen's `<main>`, and the renderer focus tests.

- [ ] Arrival focus lands on an element with an accessible name, on every screen, and a test
      asserts the announced name rather than the element's identity.
- [ ] The choice between labelling `<main>`, naming the wrapper, and targeting the `<h1>` is
      recorded with its reason, including what happens on a screen with no heading.
- [ ] Back-restoration (`BACK_RESTORE_MARKER`) lands on the same target as forward arrival, so
      leaving and returning are not two different experiences.
- [ ] `pnpm check:all` is green, and the desktop e2e suite passes.
