# 13: The Match Rating reads recorded involvement

**What to build:** A player's Match Rating rises with assists, key passes and saves and falls slightly
with fouls and offsides, everywhere the rating is shown. The involvement comes from the Match Player
Line fold, so the counting rules exist once. Committed matches re-rate on read.

**Decisions:**

- Yes: the rating adds assists, key passes, saves, fouls and offsides as event weights, read from the same Match Player Line fold; committed matches re-rate on read, by design. See [Agent Note](../../../.agents/notes/proposed/feature/2026-10-03-the-match-rating-reads-recorded-involvement.md).

**Blocked by:** 12

**Status:** ready-for-agent

- [ ] Each new weight moves the rating by its constant from an otherwise identical involvement (one test per weight).
- [ ] A goalkeeper with saves in a defeat rates above one with none in the same defeat.
- [ ] The Ratings tab and the Rat column show the same number for the same player and match.
- [ ] The rating module remains the only place naming a weight, and its header comment states the current inputs.
