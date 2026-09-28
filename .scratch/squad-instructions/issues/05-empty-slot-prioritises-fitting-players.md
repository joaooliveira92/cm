# 05: selecting an empty lineup slot brings the players who fit it to the top

**What to build:** when the manager selects an empty starter slot in `MatchDayBar` (say DC), the
Squad roster keeps every player but moves the ones who can play that slot's position to the top and
marks them. Nothing is hidden. Clearing the selection restores the roster's own order. This is the
instruction's §11.2 "clicking a position filters or highlights applicable players", in the form
the human ruled on 2026-09-28: **additive and highlight-driven, not a destructive filter.**

**Decisions:** ruled by the human on 2026-09-28, answering the open question in
[01](01-reconcile-the-loose-squad-instruction.md).

- **A soft context, not a `FilterClause`.** It is not the Position filter and does not touch the
  filter state or the URL, so it can never hide a player. Rows that fit sort first, the rest follow
  in the current sort order, and both groups stay visible. A fitting row shows a visible mark with an
  accessible name, not colour alone.
- **Fit** means the player's `positions` include the slot's position at any familiarity. Order the
  fitting group by familiarity (natural first), then by the current sort. Starter slots only: a bench
  slot (SB1…) has no position, so selecting one sets no context.
- **Escape hatch.** Escape clears the context, so does selecting the slot again, and so does filling
  the slot. A visible "Showing players for DC · Clear" line above the roster names it and clears it.
  Any player, fitting or not, can still be dragged or carried into the slot: this only reorders.
- **The keyboard carry is unchanged.** Enter or Space on a *filled* slot still picks it up, Enter on
  another slot places it, and Escape releases a carry first. Only Enter or Space on an *empty* slot
  with nothing carried sets the context, and it never starts a carry. With a carry in progress,
  Escape releases the carry. A second Escape clears the context.
- It lives in the Squad provider beside the lineup draft, and both the table and position-list
  layouts read it. It is session state: it does not persist and resets when the screen unmounts.

**Blocked by:** None.

**Status:** ready-for-agent

## Tests

- Selecting an empty DC slot puts every player who can play DC above every player who cannot, with
  natural before accomplished before others, and hides no one.
- Selecting it again, pressing Escape, or filling the slot restores the previous order exactly.
- A bench slot sets no context.
- Keyboard: Enter on an empty slot sets the context without starting a carry. Enter on a filled slot
  still picks it up. With a carry held, the first Escape releases it and the second clears the
  context.
- A non-fitting player can still be carried or dragged into the slot while the context is on.
- The mark has an accessible name, and `level1-a11y` still passes.

## Acceptance criteria

- [ ] An empty starter slot brings its fitting players to the top of both layouts, marked, with no
      one hidden.
- [ ] The context clears by Escape, re-selection, filling the slot, or the visible Clear control.
- [ ] The existing carry and drag interactions behave exactly as before.
- [ ] `pnpm check:all` is green, and the Squad e2e specs pass.
