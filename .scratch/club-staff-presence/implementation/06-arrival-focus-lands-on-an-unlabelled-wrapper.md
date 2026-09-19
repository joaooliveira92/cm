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

**Status:** resolved

**Files:** `apps/desktop/src/renderer/focus.ts`, `apps/desktop/src/renderer/router/RouteView.tsx`,
every screen's `<main>`, and the renderer focus tests.

- [x] Arrival focus lands on an element with an accessible name, on every screen, and a test
      asserts the announced name rather than the element's identity.
- [x] The choice between labelling `<main>`, naming the wrapper, and targeting the `<h1>` is
      recorded with its reason, including what happens on a screen with no heading.
- [x] Back-restoration (`BACK_RESTORE_MARKER`) lands on the same target as forward arrival, so
      leaving and returning are not two different experiences.
- [x] `pnpm check:all` is green, and the desktop e2e suite passes.

---

**Comments**

- Implemented 2026-09-09. The decision (recorded in
  `.agents/notes/implemented/architecture/2026-09-09-arrival-focus-lands-on-the-labelled-main-region.md`)
  labels every `<main>` and moves the target onto it; a screen with no heading gets an `aria-label`
  on the region. Every state (loading/ready/error) of the keyboard-navigable screens renders inside
  the labelled main, so arrival lands the same way fast or slow.
- Reviewer: ACCEPT. Criterion 4 checked with a caveat — `pnpm check:all` is red at the dev baseline
  (see "Repo-level block", `.ai/SPRINT-PLAN.md`): 2 typecheck errors in `Navbar.tsx` and the match
  live-panel failures reproduce with this diff stashed. This diff adds zero new failures on any gate
  (typecheck, lint, effect-lint, verify-*, renderer tests, and the keyboard/router e2e specs — the
  "g <key> / g b", AC-15 pointer-keyboard, and palette focus assertions all pass).
- Deferred (not gates, other work's debt):
  1. `Navbar.tsx` calls its extracted nav components with `revealKey`/`revealKeys` props they no
     longer declare — the keyboard reveal-keys went unrendered when the react-composition-audit
     extraction landed. The caller still computes them, so re-wiring belongs to that effort's ready
     ticket 09, not here.
  2. `test/renderer/match/live-keyboard.test.tsx` (16) and the two match-family e2e flows
     (`keyboard.spec` AC-20, `router.spec` "Match Day arrival") fail at HEAD — the same live-panel
     family as the squad work's red tests. Not filed anywhere; the next desktop-suite-red pass
     should split it into its own ticket.
