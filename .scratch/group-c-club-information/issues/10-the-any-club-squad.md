# 10: Screen 35 — an any-club squad, which is not the shipped Squad screen with a flag

Split out of [07](07-any-club-squad-fixtures-and-transfers.md) on 2026-09-19, after an attempt there
showed the two are not the same kind of work.

## Why this is its own ticket

`renderer/squad/` is **2044 lines across thirteen files** — `SquadProvider`, `SquadTable`,
`SquadPositionList`, `MatchDayBar`, `lineupDrag`, `lineupEdits`, `useSquadScreen`,
`useSquadSession`, `useSquadTable`, `useSquadColumns`, `useSquadAnnouncements`. It is a **lineup
manager**: the manager picks a side on it.

`renderer/fixtures/` is 113 lines. `renderer/transferHistory/` is 108. That is what a read-only club
surface costs here, and it is the shape an any-club squad wants.

So "the same screen with its affordances gated" would mean one `isUserClub` boolean threaded through
thirteen files, switching off drag, selection, lineup edits, the match-day bar and most of the
columns. That is not a gate, it is two screens sharing a name.

## The rule this ticket has to settle

[The club-scoped rule](../../../.agents/notes/proposed/architecture/2026-09-19-a-club-screen-is-club-scoped-unless-only-your-club-has-one.md)
says one screen per subject, club-scoped, with an own-club resolver — and its only stated exception
is **subject existence**. Squad does not fit that exception: every club has a squad. It worked twice
(Screens 38 and 34) because both are read-only whoever is looking.

**The discriminator the rule is missing is whether the manager's own surface *acts* on the data or
only reads it.** Settle that here and amend the note, because Group L will hit it — a nation's squad
and a competition's table are reads, but the own-club equivalents may not be.

## Options

- **A second, read-only screen.** `ClubSquadDetailScreen` alongside `squad/`, sharing the row
  rendering if anything, reached at `club/$clubId/squad`. Honest about being a different surface.
  Costs a second list implementation, which is the thing ticket 07 warned against — though that
  warning assumed the two *were* one list.
- **Extract the roster from the manager.** Pull the read-only table out of `squad/` as a shared
  component; the own-club screen wraps it with the editing surface, the club-scoped one renders it
  bare. More work, one list, and it is the answer that would make the rule true rather than
  excepted.
- **A gated single screen.** Rejected above, but record *why* rather than leaving the next reader to
  re-measure 2044 lines.

## Recommended

The second. It keeps one list implementation, which is what the rule was protecting, while being
honest that a lineup manager and a roster are different surfaces over it. Read
`SquadTable`/`useSquadColumns` first to see how much of the table is genuinely about editing.

## Acceptance

- [ ] An any-club squad renders at `club/$clubId/squad`, reached from a surface that names a club
- [ ] It is read-only: no selection, no drag, no lineup edit, no match-day bar
- [ ] There is one row/table implementation, not two that will drift
- [ ] A club that is not the manager's is marked, as `ClubStaffScreen` marks it
- [ ] `clubSquadDetail/`'s placeholder is gone, with its route and screen-scope entries
- [ ] The club-scoped rule's note is amended with the act-versus-read discriminator, whichever way
      this goes
- [ ] `pnpm check:all` green and e2e green

**Blocked by:** None. Prefer after [07](07-any-club-squad-fixtures-and-transfers.md), which settles
the club-scoped view shape on two simpler screens.

**Status:** ready-for-agent
