# Agent Note: Arrival focus lands on the screen's labelled `<main>` region

Status: implemented

## Problem

Keyboard and palette navigation ask the focus coordinator for a semantic target,
and `querySemanticTarget({ screen })` resolves a bare `{ screen }` request to
`[data-focus-id="<screen>"]`. That selector used to match the `RouteView`
wrapper — a layout `<div>` sitting *outside* the screen's `<main>`, carrying no
accessible name. An assistive user who keyboard-navigates to any screen heard
nothing about where they arrived, and `g b` restored to that same silent div.
Screens already labelled their `<main>` region well (Club Staff's
`aria-labelledby` the club heading; News Inbox's `aria-label`), but the wrapper
won the selector, so none of it was ever heard.

This also misplaced the focus ring: the wrapper rendered it around the whole
route surface, so a keyboard arrival appeared to focus a frame rather than
content.

## Decision

**The screen's labelled `<main>` region is the arrival and back-restoration
target.** A bare `{ screen }` focus request resolves to `[data-focus-id="<screen>"]`
on that screen's `<main>`, which carries `tabIndex={-1}` and the focus ring
beside its accessible name. `RouteView` is a plain layout container and is never
a focus target.

Every state of a navigable screen renders inside the labelled `<main>` —
loading, ready, and error alike — so arrivals land on the named target fast or
slow, not just once the read settles. This is the detail that makes the change
safe: it is exactly the state that still renders as a bare `<p>` (a routine
class of loading/error surface) that would otherwise silently swallow arrival
focus the moment the target moved off the always-present wrapper.

### The accessible name

- Where the screen's heading is a stable screen name (Squad, Transfers, League
  Table, Fixtures, Match day, Season Summary, Tactics, Tactics Overview), the
  `<main>` names itself with either `aria-label` or `aria-labelledby`.
- Where the heading names something more specific than the screen (Club Staff
  is `aria-labelledby` its club heading, so arrival announces "Northport Rovers
  · Club Staff"), keep that — the announced name is *where the user is*, and the
  club is what distinguishes this arrival.
- **Screens with no heading at all get an `aria-label` on the `<main>`.** A
  label on the region does not depend on a heading existing, which is exactly
  the freedom the loading and error states need — those states have no heading
  to point at, and neither does a ready screen whose visible title is a view
  label rather than a screen title.

The announced name for an intervening loading state is the screen's name, not a
state sentence: the label is *where you arrived*, the state line is content.

Back-restoration (`BACK_RESTORE_MARKER`) and forward arrival resolve to the same
target: `RouteView` focuses `{ screen: screenId }` in both cases, and the
screen's main region carries the identity. The non-career shells (`mainMenu`,
the creation flow) are button-driven and never request focus themselves, so they
keep no semantic target.

## Alternatives considered

- **Name the wrapper and keep it the target.** The minimal diff, but it
  announces the screen from a div entirely outside the content region, already
  duplicates the `<main>` landmark as a focus stop, and does nothing about the
  loop of screens whose ready state is a labelled `<main>` that wants to be
  heard. It also keeps the ring on a full-surface frame rather than content.
- **Keep the wrapper, retarget the selector to it with a name.** Same cost as
  the chosen option for none of its reading-order benefit.
- **Resolve arrival to the screen's `<h1>`.** The heading is the natural "where
  you are" announcement for a reading screen, but screens are not uniform: a
  ready screen can render an `<h2>` where its `<h1>` once stood (Squad's list
  view), and the loading and error states of several screens have no heading at
  all. Every one of those cases would need a synthetic focusable heading —
  inventing structure to justify a selector. Labelling the region that exists in
  every state is the smaller, uniform mechanism, and it lets Club Staff's
  heading label the region through `aria-labelledby` without the heading itself
  becoming a focus stop.
- **Focus the first interactive control on arrival.** Rejected by the existing
  focus model: prescriptive arrival is the level-1 target; a screen's primary
  interaction is a per-screen concern the screens already manage when they want
  it. Reads like the League Table would burst straight into a row for no action.

## Consequences

- A bare `{ screen }` focus request and a back-restore marker both resolve to an
  element with an accessible name on every career screen. Screens whose states
  had only a bare `<p>` (league, fixtures, season summary, manager, news, scout
  report, tactics editor) now render every state inside the labelled main.
- The announced name is asserted rather than identity: the focus-coordinator
  resolution test checks `aria-label` on the resolved target, and the read-only
  fixture/season-summary and club-staff screen tests pin both the identity key
  and the name on the same element.
- The `RouteView` wrapper carries no focus identity and is not a target.
- Arrival on `loadCareer` (a `RouteView`-owned surface outside the career tree)
  also lands on its labelled main.
- **The gate is not fully green at the time of writing**: the dev baseline was
  already red before this change — `Navbar.tsx` passes `revealKey`/`revealKeys`
  props its extracted components do not declare (typecheck), and the match
  live-panel specs (`live-keyboard.test.tsx`, the two match e2e flows) fail at
  HEAD. This diff adds no new failures on any gate (typecheck, lint, renderer
  tests, keyboard/router e2e).

## Risks

- **A screen added later might render its states without the labelled `<main>`
  and silently regress arrival focus.** The wrapper no longer backstops these
  states, so the invariant is now the screens'. The focus-coordinator test pins
  the announced-name contract, but nothing mechanically enumerates the screen
  set; the e2e keyboard spec is the backstop that names the screens it visits.
- **Doubling the number of labelled mains (one per state) invites name drift**
  between a screen's states. The names are stable literals at each screen's
  call sites, so drift would be visible in review rather than silent.