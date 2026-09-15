# 05: One advance at a time, all of it or none of it

**What to build:** Pressing Continue twice cannot advance the career twice, and an advance that
fails part-way leaves the save exactly where it started.

The Calendar advance does a great deal in one call — it lapses pending Bids, resolves every due
Fixture in the world, draws cup rounds, runs AI transfer activity, moves the date, and at a season's
end freezes standings, judges the board objective, develops every player, and rolls the world over
into the next season — and it does all of it outside a transaction, unlike the career's other
writing command. A failure in the middle commits everything before it: a save whose date advanced
but whose season never concluded, or whose Fixtures resolved twice.

Nothing in the main process refuses a second advance, either. The renderer's disabled button is the
only guard, which makes a presentation detail the integrity boundary: a repeated key press that
outruns a re-render, or a second window, reaches the command twice and two sweeps interleave.

So: the advance commits as a unit or not at all, and a second advance for a Save while one is
already running is refused with a typed failure rather than queued or interleaved. The refusal is
observable to the player as a sentence, not a silent no-op. The renderer's disabled control stays,
demoted to what it always should have been — a convenience.

Seam: the advance gains one new observable failure in its error channel, which the renderer must
render like any other typed failure. The command's success shape is unchanged, so nothing that
consumes the result has to move.

**Decisions:**

- A Save is durable at commit: every Command that succeeds has already been written, so there is no
  partially applied advance for the player to recover from. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-08-30-durable-at-commit-persistence.md).
- Domain failures are typed and travel in the error channel rather than as thrown defects, so a
  refused advance is a value the caller can render. See [Agent Note](../../../.agents/notes/implemented/architecture/2026-08-29-tagged-domain-errors.md).

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] The advance's writes commit as one transaction; an induced failure part-way leaves the save's
      date, Fixtures, Bids, and season phase exactly as they were before the press.
- [x] A second advance for the same Save while one is in flight is refused with a typed failure and
      mutates nothing.
- [x] The refusal renders a player-facing sentence wherever typed failures are rendered.
- [x] The guard lives in the main process; disabling the renderer's control is not what enforces it.
- [x] A refused or failed advance leaves no partial event appended to the Season stream.
- [x] `pnpm check:all` is green.
