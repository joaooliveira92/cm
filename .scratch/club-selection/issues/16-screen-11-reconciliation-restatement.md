# 16: Screen 11 reconciliation register restatement

**What to build:** The Screen 11 reconciliation register is restated in the same change that ships
the code, so a register that describes a screen that no longer exists never stands. The register's
Screen 11 status block gains a re-audit note; the second audit table is replaced by the restatement
the map's ticket 07 settled — the two-column workspace and rail row, the level-2 listbox keyboard
tier and focus order, the world-bound selection record, the one widened detail payload, and the
disabled league selector — with the mode selector / availability / eligibility, search-and-filter,
and facilities / staff / performance rows ruled deliberate out-of-scope deviations with their
reasons; keyboard and state-model rows restated at level 2 and world-bound; pagination/virtualization
and autosave deferred; and the stale `temp-club-id` paragraph replaced with the wired-selection
state. Screen 12's trailing paragraph asserting the unreachable commit is updated to match.

The slice's edge: documentation only — no code, no wire contract, no services; the restatement
lands in the register, and ships gated on the code that makes it true.

**Decisions:** None — scoping call plus transcription of the decisions already recorded in the six
Agent Notes and the map; no Agent Note is written for this ticket.

**Blocked by:** 10 — Two-column workspace in a full-width creation band; 11 — World-bound selection
record that reaches commitCareer; 12 — Compact squad detail panel over one widened payload; 13 —
Degenerate league selector; 14 — Pick a team for me; 15 — Level-2 listbox keyboard and
accessibility.

**Status:** ready-for-agent

- [ ] The register's Screen 11 section matches the settled restatement: re-audit note appended to
      the status block, the second audit table replaced, and the trailing `temp-club-id` paragraph
      replaced by the wired-selection statement.
- [ ] Screen 12's trailing paragraph no longer asserts the unreachable commit; it reflects the
      club-selection effort's wiring.
- [ ] Rows the restatement keeps `out-of-scope` or `deferred` carry the reasons the recorded
      decisions fixed.
- [ ] No row still describes the old static list as the implementation.