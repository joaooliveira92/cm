# 03-action-model

Type: grilling
Status: resolved

## Answer

**Yes — a first-class Action registry. Every operation becomes a named, scoped, dispatchable record; buttons, palette, key bindings and help overlay are four views of the same record. Migration is all-or-nothing per screen. Availability predicates are best-effort frontend optimisations; the backend still validates.** See [Agent Note](../../../.agents/notes/implemented/architecture/2026-08-29-action-model.md) and [ADR-0012](../../../docs/adr/0012-action-registry-for-keyboard-first.md).

## Question

Is a screen operation a first-class **Action** — a named, scoped, dispatchable record — or do
keyboard handlers simply call the same functions the buttons call today?

This is the map's spine. Nearly every other ticket reads differently depending on the answer.

Today every operation is an inline closure wired straight to a button: `onAdvanceCalendar` in
`LeagueTableScreen.tsx`, `onBid` / `onSignFreeAgent` / `onRespondToBid` in `TransfersScreen.tsx`,
the substitution and tactics handlers inside `MatchDayScreen.tsx`. Nothing anywhere knows what
operations exist or whether one is currently available.

An Action registry would give each operation an identity (id, human label, screen scope, an
availability predicate, a handler) so that a key binding, a command palette entry, a help overlay
row, and a rendered button are four *views* of the same record. The cost is an indirection layer
over nine screens that currently need none, and a discipline that new operations must be registered
rather than just written.

Decide:

- **Registry or not.** If not, how do the command palette and help overlay enumerate what is
  possible? If they cannot, that concedes level 3 from the destination — say so explicitly rather
  than letting it erode.
- **Shape, if yes**: what an Action record contains, where it is declared (colocated per screen, or
  a central table), and how availability is expressed — a boolean predicate over current state, or
  simply absence from the active registry.
- **Scoping**: how an Action's scope relates to a screen, and what happens to global Actions
  (navigate, open palette, open help) that are available everywhere.
- **Relationship to buttons**: does every existing button become an Action dispatch, or do Actions
  layer alongside the current handlers? A half-migrated state where some operations are Actions and
  some are not will make the palette lie about what is possible.
- **Does this earn an ADR?** Per the map's Notes, UI vocabulary stays out of `CONTEXT.md`, but a
  formal Action concept is a structural decision, hard to reverse once nine screens depend on it,
  and the kind of thing a future reader would ask "why" about. Judge it against the three ADR tests
  in the `domain-modeling` skill and record the verdict either way.
