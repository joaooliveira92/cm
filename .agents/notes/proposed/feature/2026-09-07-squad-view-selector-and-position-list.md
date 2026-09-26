# Agent Note: the Squad screen gets a View selector, and opens on a position list

Status: proposed

Class: feature

## Problem

The Squad screen had one layout — a dense attribute table — and one control over it, a "Columns"
preset selector. Two things follow from that, and both were wrong for the screen's most common use.

The first is that opening a career put a manager in front of an attribute grid before they knew who
was in the squad. CM 03/04 opened on the opposite reading: two balanced columns of *name and the
positions that player can fill*, one line per player, the whole squad on screen without scrolling.
The attribute tables were somewhere you went, not where you landed.

The second is that "Columns" named the mechanism rather than the question. A manager choosing
between "who plays where" and "how quick are they" is choosing a **view**; that one of those choices
is a layout and five are column sets is an implementation fact they should not have to hold.

Screen 70 (`docs/specs/group_e_squad_management/70_squad_view_selector.md`) already specified the
selector — presets, a persisted manager-scoped preference, presentation-only semantics — and nothing
implemented it under that name.

## Decision

**One View selector owns both the layout and the columns.** `renderer/squad/squadViews.ts` is the
catalogue: `positions` (the list) plus one entry per shipped column preset. Choosing a view is a
single act — it sets the layout and, for a table view, applies that preset's columns — so the two can
never disagree, because nothing else can set the layout. The screen heading repeats the chosen view's
name (`Players (Position(s))`, `Players (Personal details)`), which is where CM put it and where a
reader looks to answer "what am I looking at".

**The position list is the default, and it is a list.** `SquadPositionList.tsx` renders two balanced
columns, left column longer on an odd count, each row a status runner, a name (surname first, as the
list reads) and the player's positions tinted by Familiarity Tier. It is not a `<table>`: there is
one field beside the name, so a table would buy a header row, per-column sort semantics and a grid
navigation model for a single column of data.

It shares everything that matters with the table layouts. The row order comes from the same TanStack
table, so filters, sorting and the command palette drive both. Focus follows the table's model
exactly — one focusable control per row, the same `data-focus-id`, one roving tab stop — so a focus
bookmark survives a view change. Arrow keys read the geometry: up/down move down a column,
left/right cross to the same offset in the other column, and the crossing is clamped rather than
wrapped so the odd row at the foot of the left column does not jump to the top.

**A "Personal details" view carries the second information set.** The reference screenshot's own
second view is a contract view — wages, expiry dates, asking prices — and the engine models none of
that. Inventing those columns would breach Mechanical Provenance, so the view is built from fields
`SquadPlayerView` already carries: Nationality, Birthplace, Condition and Training Focus. The
*character* of the reference is what was reproduced — a view that changes the kind of information on
screen, not just which attribute group — and a contract view remains available the day contracts are
modelled, as one more entry in the catalogue.

## Consequences

- The chosen view persists across restarts under its own key, beside the column preferences and for
  the same reason: which view a manager reads their squad in is a standing preference. An unknown or
  corrupt stored value reconciles to the default rather than leaving the screen with no layout.
- The "Restore defaults" button and the show/hide column checkboxes render only for table views. On
  the list they would offer choices that change nothing on screen.
- The unit and e2e tests that assert the *table's* grid behaviour now pin a table view first. That is
  a real cost of moving the default, and it is paid once, in the tests' setup rather than in their
  assertions.

## Not done here

- A Sort control on the list. Sorting comes from the table headers and the palette; the list has no
  header row to click, so a sort dropdown would be a new control rather than a relocated one.
- Custom, saveable views (Screen 70's "save, rename, duplicate, delete a personal view"). The shipped
  catalogue is the built-in preset half of that spec.
- Player colouring for transfer-listed, loaned or wanted players. Those states are reserved in the
  status vocabulary and unmodelled by the engine; the list renders what `statusesOf` derives and
  invents nothing.
