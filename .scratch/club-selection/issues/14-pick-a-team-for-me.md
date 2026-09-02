# 14: Pick a team for me

**What to build:** A player who wants help choosing can press `Pick a team for me` to have a club
suggested. One press picks a uniformly random club from the loaded list — every club, not a league
— always different from the one currently selected, so a re-press is always observable, and
selects-and-stays so the player still reads the panel and presses Continue themselves. The
suggestion is deliberately unseeded (the world seed never reaches the renderer) and is never
persisted. Focus stays on the button, and the picked club is announced through a live region typed
so it names the club and the panel ("Picked X. The panel shows X."). The button renders subdued
below the list, and is disabled while the list is loading or failed so it can never pick over zero
rows.

The slice's edge: pure renderer behaviour over the already-loaded list — no new RPC, no seed
enters the scene, nothing is persisted; the button's only guard is whether the list holds rows.

**Decisions:**

- The pick is one press of `Math.random()` over the loaded clubs, excluding the currently selected
  one — unseeded (the world seed never reaches the renderer, and the suggestion isn't persisted),
  every club, not a league; focus stays on the button with the result announced through an
  `aria-live` region; a subdued button below the list, disabled while the list is empty. See
  [Agent Note: `Pick a team for me` is an unseeded, exclusion-rolled assist](../../../.agents/notes/implemented/architecture/2026-09-01-pick-a-team-for-me-semantics.md).

**Blocked by:** 11 — World-bound selection record that reaches commitCareer.

**Status:** ready-for-agent

- [ ] Pressing the button selects a club other than the one currently selected when one is selected;
      with nothing selected it picks a uniformly random club from the loaded list.
- [ ] Re-pressing always changes the selection in a list of more than one club.
- [ ] The pick is unseeded and nothing about it is persisted; focus remains on the button; the
      announced text names the picked club.
- [ ] The button is subdued, below the list, and disabled while the list is loading or failed.
- [ ] Picking does not advance the step; Continue remains the player's action.