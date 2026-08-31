# 11 — Slice the screen 2–17 audit into tickets

Type: grilling
Status: open
Blocked by: 03

## Question

Charting parked this as fog because the slicing depended on how much of each spec the blanket trim
removed. Ticket 03 answered that: for most screens, almost nothing. Screens 2, 3, 4, 6, 8, 9, 10, 12
and 17 lose only scaffolding and a handful of clauses; screen 5 loses one section; screens 13, 14, 15
and 16 lose roughly a quarter each; only screen 7 collapses. Sixteen screens and something close to
25,000 surviving lines still have to be audited against an implementation.

So the merge-slices-together option the fog anticipated is off the table. What is the slicing?

Open sub-questions:

- **One ticket per screen, or per flow?** Per-screen is sixteen tickets and several of the specs
  (13 Load, 14 Save, 16 Preferences, 17 Display and Sound) are 1,600–1,900 lines even after the trim,
  which is close to a whole session on its own. Per-flow (new-game entry, manager creation, save
  management, preferences) is four or five tickets and each is plainly too big.
- **Does the audit need a cheaper first pass?** A per-screen inventory that records only which sections
  have an implementation to compare against would cost far less than a full audit and would size the
  real work. It also risks being a ticket that produces a list nobody reads.
- **What does an audit ticket actually output?** Ticket 04 is the worked precedent for the shell.
  Whatever it produces per screen is what the other fifteen should produce, and if that shape is wrong
  it is cheaper to find out at ticket 04 than at ticket 16.
- **Which screens can be dropped from the audit entirely?** Screen 7 is already gone — the trim plus
  the new-game-flow note leave nothing of it. Others may have no implementation to audit, making them
  new design rather than audit.

## What ticket 04 measured

Ticket 04 is resolved, and it is the sizing input this ticket was waiting on.

**Screen 1 cost.** 15 sections, 374 spec lines, 28 ledger rows, one session with budget left over —
and that was the *expensive* kind of screen, because Screen 1's sections constrain the whole shell and
the audit had to read `router/`, `navigation/`, `keymap/`, `actions/`, `KeyboardSpine.tsx` and the
main-process entry. Later screens read one component.

**Screen 1 is not representative of the rest.** Section counts for the surviving screens:

| Screen | Sections | Lines | | Screen | Sections | Lines |
|---|---|---|---|---|---|---|
| 2 New Game | 29 | 1141 | | 10 Background | 47 | 1688 |
| 3 League/Nation | 35 | 1828 | | 11 Club Selection | 56 | 1795 |
| 4 Competition Detail | 42 | 1672 | | 12 Confirmation | 61 | 1696 |
| 5 Database Size | 49 | 1939 | | 13 Load Saved Game | 77 | 2174 |
| 6 Loading/World Gen | 40 | 1725 | | 14 Save/Save As | 71 | 1903 |
| 8 Personal Details | 43 | 1642 | | 15 Delete Saved Game | 59 | 1554 |
| 9 Nationality/Langs | 48 | 1627 | | 16 Preferences | 82 | 1894 |
| | | | | 17 Display and Sound | 68 | 1645 |

807 sections across the fifteen surviving screens (screen 7 excluded — the trim plus the new-game-flow
note leave nothing of it). The average screen is 53 sections, three and a half times Screen 1. Screens
13, 14, 16 and 17 are four to five times it.

**Estimate, from one data point, so treat it as soft:** if a comfortable session is somewhere near 15
to 20 sections, the remaining audit is on the order of 40 sessions. Per-screen tickets would therefore
be too big for at least the eight largest screens, and the answer is probably *sections per ticket*
rather than screens per ticket — one screen splitting into two to five tickets by section range, with
the small screens staying whole.

## One cheap option is already dead

The obvious saving was to audit the cross-cutting sections once for the whole group instead of sixteen
times. Every screen carries roughly four of them (Accessibility, Keyboard interaction, Responsive,
Localization), and in a template-generated import they looked like boilerplate.

They are not. Ticket 04 checked: spec 3 §25 Accessibility describes an accessible *tree grid* with
division depth and dependency reasons; spec 13 §66 describes an accessible *list* of saves with
synchronization state and integrity. Same shape, entirely screen-specific content. There is nothing to
factor out, so this ticket should not plan around it.

Ticket 04 stays as it is: the application shell is audited first regardless, and its result is an input
here. The output shape it settled — read the implementation, write ledger rows, change no code — is
recorded in the [screen-audit note](../../../.agents/notes/proposed/process/2026-08-30-screen-audit-against-imported-spec.md)
and is what the remaining tickets should copy, with the caveat that Screen 1's reach across six
directories was specific to the shell and would be scope creep on a single-component screen.

## Done when

The screen 2–17 audit exists as a wired set of tickets on this map, each sized to one session, with
ticket 10's Blocked-by list updated to include them.
