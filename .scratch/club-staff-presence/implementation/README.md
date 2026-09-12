# Implementation tickets: Club Staff — presence people, a club-scoped route, and the President's voice

These are the **implementation** tickets sliced from [spec.md](../spec.md), the finished output of
the club-staff-presence wayfinder map. They live here rather than in [issues/](../issues) because
that directory holds the map's six **decision** tickets, all resolved and now history; putting
implementation work into the same numeric sequence would make two different kinds of ticket share
one set of numbers. The file conventions are the tracker's own — one file per ticket, `NN-<slug>.md`
numbered from `01`, a `**Status:**` line near the top, comments appended at the bottom. See
[issue-tracker.md](../../../docs/agents/issue-tracker.md).

Numbering is dependency order: blockers come before the tickets they block. Ticket 04 has no
blocker beyond the derivation and can run in parallel with 02 and 03.

## What these tickets cover

The spec's four bodies of work: the presence derivation in `rules/staff.ts`, the `getClubStaff` RPC
read, the club-scoped route and the Club Staff screen, and the President's voice in the board news.

Two spec deliverables already shipped during charting and are **not** re-sliced here:

- **The group C reconciliation ledger.** `docs/specs/group_c_club_information/RECONCILIATION.md`
  shipped with decision ticket 06 (`af572ab`), covering screen 38 and marking the other fifteen
  screens unreconciled. Ticket 03's screen is built to the ledger's rows; the ledger itself is
  already on disk.
- **The CONTEXT.md Staff vocabulary.** Bound Staff / Presence Staff / President / Physio shipped
  with decision ticket 01 (`8a243c7`). No implementation ticket owes a glossary change, and any
  that finds one has found a contradiction worth raising rather than a chore.

No schema change ships with any of these tickets: no table, column, or migration. The `staff_role`
check constraint stays honest at `coach` and `scout`; `PRESENCE_ROLES` sits beside an unchanged
`StaffRole`.

## Sequence

| # | Ticket | Blocked by |
|---|---|---|
| 01 | [Presence Staff derive from the world seed and the club id](01-presence-staff-derivation.md) | — |
| 02 | [getClubStaff reads a club's whole backroom over the RPC](02-get-club-staff-rpc-read.md) | 01 |
| 03 | [The Club Staff screen and its club-scoped route](03-club-staff-screen-and-route.md) | 02 |
| 04 | [The President names the board's warnings and dismissals](04-presidents-voice-in-board-news.md) | 01 |
| 05 | [The club segment's keyboard identity and the two club drill-downs' entry points](05-club-segment-keyboard-identity-and-entry-points.md) | — |
| 06 | [Keyboard arrival focus lands on an unlabelled wrapper](06-arrival-focus-lands-on-an-unlabelled-wrapper.md) | — |

Ticket 05 was not sliced from the spec. It records a gap ticket 03 exposed: the club segment hangs
off the save rather than off a career screen, so a club-scoped route has no career screen identity
to inherit, and ticket 03's league table row took over the Team Scout Report's only entry point.
See the ticket for why the keyboard scope and the entry point are one root and not two bugs.

Ticket 06 likewise was not sliced from the spec. Ticket 03 promised that keyboard arrival lands on
the club header; it lands on an unlabelled wrapper `<div>`, and does so on every screen. That is an
app-wide focus-model question rather than a Club Staff defect, so the criterion was amended and the
real problem filed on its own.

## Agent Notes

Every ticket's Decisions section links the `proposed/` Agent Note it implements, with the gist
copied verbatim from the spec. The one note — [Presence Staff are derived, never
stored](../../../.agents/notes/implemented/feature/2026-09-07-presence-staff-are-derived-never-stored.md)
— is carried by ticket 01, whose code satisfies **every** note acceptance criterion (role unions,
per-role seeds, no tier variance, presence-internal collision redraw, no schema change; the
`CONTEXT.md` criterion shipped with decision ticket 01 at `8a243c7`). Promotion to `implemented/`
happens in the commit that ships the ticket carrying it, per
[notes.md](../../../docs/agents/notes.md) — here ticket 01. Tickets 02-04 realize the read path,
the screen, and the President's copy, which the note's risk section names as its *justification*
(the readers the design rests on) rather than additional acceptance criteria, so they do not delay
promotion.