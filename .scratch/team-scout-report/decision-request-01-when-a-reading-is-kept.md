# Decision Request: When is a Team Scout Report reading kept?

## Question

Ticket 08 lists a club's earlier reports. Nothing stores a report today, because each one is derived
live when it is opened. At what moment should a reading be written down so it can be listed later?

## Why this is blocking

It adds a table to every save, and the save schema is deliberately cost-conscious: three indexes,
each measured, and an event log that "records only facts no table holds". The moment chosen fixes
both the storage growth and what "previous report" means to the player. Guessing wrong means a
migration or a list that shows the wrong things.

## What is already settled

- **Team Scout Report** (CONTEXT.md): "a reading of one Club, pinned to the revision at which it was
  taken and unchanged by later ones", and "the delivered artifact of a Club-targeted Scouting
  Assignment".
- **Freshness** (CONTEXT.md): "A decayed report stays readable and is never silently rewritten; the
  manager renews it by taking a new reading at the current revision."
- The superseding note: "Renewing takes a new reading alongside the previous ones rather than
  rewriting one in place."
- Ticket 07 shipped Club-targeted assignments, and a report's id is `<clubId>:<calendar date>`.

## Options

### Option A — Keep a reading when a Club assignment ends

- **What the player experiences**: when a scout is redirected, unassigned, or the season rolls over,
  the report they produced is filed. The Previous Reports tab lists what each completed watch
  concluded.
- **What it costs to build**: one table (club, date, report blob), written from the reassign,
  unassign and rollover paths. Growth is one row per ended Club assignment, which is small.
- **What it forecloses**: history for knowledge gathered only by per-player scouting.
- **Save compatibility**: new table, no change to existing rows.

### Option B — Keep a reading when the manager renews

- **What the player experiences**: pressing Renew files the current reading, then starts a new one.
- **What it costs to build**: the same table, written only from `assignScoutToClub` when the club
  already had a report.
- **What it forecloses**: history for a watch that simply ended without a renewal.
- **Save compatibility**: new table.

### Option C — Keep a reading every Matchday a scout watches

- **What the player experiences**: a fine-grained timeline of how knowledge grew.
- **What it costs to build**: written from the calendar advance, with growth of watched clubs times
  Matchdays, around 40 rows per watched club per season. It needs a retention rule.
- **What it forecloses**: nothing, but it is the most storage and the noisiest list.
- **Save compatibility**: new table.

## Recommendation

Option A, plus a manual Renew that ends and restarts the watch, which therefore also files a reading.
It matches "the delivered artifact of an assignment" literally, grows with manager actions rather than
with time, and covers Option B as a special case.

## What is blocked, and what is not

- Blocked: ticket 08 (Previous Reports).
- Proceeding meanwhile: nothing else in this effort. Tickets 01–07 are resolved.

## Answer

2026-09-13: the human said "start the first one" without choosing an option, so the recommendation was
taken, narrowed to what the code can observe. **A reading is kept when a Club assignment ends**: the
scout is redirected to a player or another club, or unassigned. A reading for the same club on the
same date replaces the earlier one, because both derive from the same knowledge at the same revision.

Two cases deliberately file nothing:
- **Another scout takes the club over.** The club is still watched, so no watch ended.
- **The manager leaves the club.** The readings go with the rest of that club's scouting, because
  knowledge belongs to the club that gathered it.

"Renew" needs no special case. It appears only when nobody watches the club, so the watch that
produced the decayed reading has already ended and filed it.

Recorded in the Agent Note
[Team Scout Report readings are kept when a Club watch ends](../../.agents/notes/implemented/feature/2026-09-13-team-scout-readings-kept-when-a-watch-ends.md).
