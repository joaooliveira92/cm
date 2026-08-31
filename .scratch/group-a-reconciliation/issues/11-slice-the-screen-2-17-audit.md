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

Ticket 04 stays as it is: the application shell is audited first regardless, and its result is an input
here.

## Done when

The screen 2–17 audit exists as a wired set of tickets on this map, each sized to one session, with
ticket 10's Blocked-by list updated to include them.
