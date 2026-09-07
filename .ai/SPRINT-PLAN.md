# Sprint Plan

## Immediate next action

`.scratch/club-staff-presence/implementation/03-club-staff-screen-and-route` — the club-staff-presence
implementation frontier: lowest-numbered open build ticket in that effort. Re-derive from
`.scratch/club-staff-presence/implementation/` before starting; plan rows decay, the tracker is
truth.

## Queue

The world-data-model implementation queue the previous plan named is fully shipped (tickets 01-18
closed in the git log), so its rows decayed. The live frontier is **club-staff-presence**, charted
and specced on 2026-09-07, sliced into four implementation tickets (in dependency order, all
`ready-for-agent` unless noted):

- 01 presence-staff-derivation ← done (shipped this session)
- 02 get-club-staff-rpc-read ← done (shipped this session)
- 03 club-staff-screen-and-route ← next (blocked by 02)
- 04 presidents-voice-in-board-news (blocked by 01)

The group C ledger (`docs/specs/group_c_club_information/RECONCILIATION.md`) and the CONTEXT.md
Staff vocabulary already shipped during charting (`af572ab`, `8a243c7`); no implementation ticket
owes either.

See `implementation/README.md` for the authoritative sequence and blockers.