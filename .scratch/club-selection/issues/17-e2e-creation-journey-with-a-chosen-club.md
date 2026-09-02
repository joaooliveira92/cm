# 17: End-to-end creation journey with a chosen club

**What to build:** One end-to-end journey through the critical path proves the whole loop: a
player creates a career through the existing creation flow, picks a club on the Club Selection
step, Continues to a Review that shows the chosen club's name, creates the career, and arrives in
it with the chosen club as the user club. The journey also confirms that no `temp-club-id`
placeholder reaches the commit anywhere in the flow, and asserts the pick button's keyboard
reachability once the e2e harness can drive the list.

The slice's edge: verification over the real launched app — no new wire surface; it exercises the
commit path and the selection the earlier slices wired, and fails if the hardcoded placeholder
reappears.

**Decisions:** None — verification work with nothing to promote.

**Blocked by:** 10 — Two-column workspace in a full-width creation band; 11 — World-bound selection
record that reaches commitCareer; 15 — Level-2 listbox keyboard and accessibility.

**Status:** ready-for-agent

- [ ] The existing creation journey e2e is extended to: pick a club, Continue, verify the Review
      `Club:` row shows the chosen club, Create Career, and assert arrival in the career with the
      chosen club as the user club.
- [ ] The journey fails if a `temp-club-id` placeholder reaches `commitCareer`.
- [ ] Once Playwright drives the list, the pick button is keyboard-reachable in the journey.