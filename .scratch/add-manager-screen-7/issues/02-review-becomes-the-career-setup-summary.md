# 02: The Review step becomes the Career Setup Summary

**What to build:** Before committing, the player can see what the career they are about to start
actually contains — not only the choices they typed, but the world those choices produced.

The Review step already summarizes the configuration read-only: save name, manager name, archetype,
club, league scope, and the pillar allocation. The spec's §22 asks the same panel to describe the
generated world alongside it: the season the career starts in, a summary of the competitions the
league scope produced, and how many players and staff were generated. These are facts about the
provisional world, not about the form, and they are the difference between confirming a set of
answers and confirming a career.

The panel stays strictly read-only. §22 is explicit that the foundations cannot be edited after
generation, and that a player who wants a different setup starts a new career rather than mutating
this one; returning to an earlier step to change the manager or the club is unaffected, because
neither is a foundation. Counts read as generated, not as estimates — the league-scope line already
shown comes from the selection snapshot's estimate, and the new figures must come from the world on
disk, or they misdescribe what is about to be committed.

Seam: the summary reads the provisional world through the pre-career surface, the same edge that
built it. It is a read, so its only observable failure is that the world cannot be read — in which
case the panel shows the configuration it already has and says the world summary is unavailable,
rather than blocking the commit or reporting zeroes. Deciding whether these figures ride on the
existing world-creation result or arrive through their own query is part of this ticket; the
constraint is that the Review step performs no work whose failure can strand a ready career.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] The Review step shows the starting season, a competition summary for the selected scope, and
      generated player and staff counts, alongside the configuration it already summarizes.
- [x] Every figure describes the world that was actually generated, not an estimate made before it.
- [x] The panel offers no way to edit the world's foundations; returning to the manager or club step
      still works and still requires no regeneration.
- [x] A world summary that cannot be read degrades to an explicit "unavailable" line; the configuration
      still renders and the career can still be committed.
- [x] The summary is reachable and readable by keyboard and screen reader, with each figure announced
      with the label it belongs to.
- [x] `pnpm check:all` is green.
