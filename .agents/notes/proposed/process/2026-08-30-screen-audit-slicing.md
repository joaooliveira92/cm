# Agent Note: Screen audit slicing for Group A screens 2–17

Status: proposed

## Problem

The imported spec carries 21 Group A screens. Screens 1 and 7 are already resolved (1 audited as the shell, 7 removed). Screens 18–21 were resolved in earlier wayfinder tickets (removed or redesigned). The remaining fifteen screens — 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17 — have an implementation to compare against (or confirm the absence of), and the question was how to slice the audit work across tickets.

The original estimate assumed fifteen tickets, each roughly the size of the Screen 1 shell audit at 15 sections per session. A factual inventory of the renderer's route tree and component surface found that nine of the fifteen screens have no route, no component, and no implementation at all; the remaining six are small files, not 1,900-line specs.

## Proposal

Slice the fifteen screens by implementation reality, not by spec file count:

- **Group the nine absent screens** into three cheap "confirm absence" tickets by thematic cluster: creation-form screens (3 League/Nation, 4 Competition Detail, 5 Database Size), identity screens (9 Nationality/Languages, 10 Background), and management screens (14 Save/Save As, 15 Delete, 16 Preferences, 17 Display/Sound). Each cluster is one session: scan surviving sections, distribute across `out-of-scope` / `contradicted` / `deferred`, register survivors, and flip to `Reviewed`.
- **Audit the six real screens individually**, each one session: Screen 2 (New Game — backend orchestration, no screen), Screen 6 (Loading/World Gen — masked wait, thin), Screen 8 (Personal Details — name field only), Screens 11 & 12 together as a single creation-flow-commitment ticket (shared `createFlow.tsx`, broken `temp-club-id` commit), and Screen 13 as a thin complement to the shell audit (shares `saveList.tsx`).
- **Record the unreachable-commit defect** in the flow ticket and cut a defect follow-on ticket.

The absent screens use the `Reviewed` status from the screen-audit note, which asserts nothing; the real screens get `Reviewed` entries whose rows are the material conflicts. No `unscheduled` rows survive.

## Alternatives considered

- **One ticket per screen** (15 tickets). What the ticket body initially assumed. The nine absent-screen tickets would each burn most of a session reading a 1,600–1,900-line spec to confirm nothing implements it. This is the honest per-section pass, but it costs nine sessions to produce nine ledger entries with the same shape: "nothing implements this, everything is either `out-of-scope` or `deferred`." Grouping lets one session cover a cluster, reading the shared CONTEXT-design reasoning once.
- **One ticket per flow** (new-game entry, manager creation, save management, preferences). Four or five tickets, each plainly too big by the screen-audit note's 15–20 section estimate.
- **Cheap inventory pass first, then slice.** Rejected during ticket 11's discussion: a pass that only lists which sections have an implementation produces a list nobody reads.

## Acceptance criteria

- The fifteen screen audits land as 8 tickets (3 grouped-absence, 5 individual/flow/complement), each sized to one session.
- Grouped screens share one `Reviewed` status across their cluster, not one per screen.
- The creation-flow ticket records the unreachable-commit defect and cuts a follow-on ticket.
- Screen 13's ticket records only what 13's spec demands that the shell audit (ticket 04) didn't already row.

## Risks

- **Grouped tickets can hide uneven workloads.** A cluster's single session assumes each screen inside it is empty enough to scan quickly. If one screen in a cluster unexpectedly has substantial survivors, the session overflows without a clean break to make a second ticket. This risk is bounded: the ledger already carries the blanket-trim rows, so the surviving section count per screen is known before the audit starts.