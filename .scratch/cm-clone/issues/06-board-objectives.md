# Board objectives & win/loss conditions

Type: grilling
Status: resolved

## Question

Decide what the "board" sets and judges each season for v1: league-position objectives, budget
constraints tied to those objectives, and what happens when objectives are missed or exceeded (sacked,
praised, budget change next season). Also decide whether there's any explicit "win" state for a
career (e.g. win the league N times) or if it's open-ended. This defines the season-end command/event
vocabulary alongside ticket 04.

## Answer

Board Objective is a League-position band per club per Season, derived from the club's Stature Tier
(a fixed `packages/shared` tier→band constant table, exact bands left as tuning data) — a **sibling**
of Transfer/Wage Budget (also Stature-Tier-derived per ticket 05), not a driver or consequence of it.
Stature Tier stays permanently fixed for v1; no mechanic moves a club between tiers. Only the player's
club gets a Board Objective and is judged (AI clubs have no other managed state, so no judgment layer
for them either).

Judged strictly at Season end: `SeasonConcluded` fires off the final Matchday, then
`BoardObjectiveJudged` (player's club only) compares final position to the band and records a Verdict
— `Exceeded` / `Met` / `Missed`. A per-club Consecutive-Miss Counter increments on `Missed`, resets to
zero on `Exceeded`/`Met`. Counter 0→1 fires `ManagerWarned` (no mechanical effect). Counter 1→2 fires
`ManagerSacked`, which archives the save (read-only, no further commands) and returns the player to
the "continue career" list — no re-hire-elsewhere flow. Exceeding is flavor-only; it does not escalate
next Season's band.

No explicit win state — careers are open-ended; `ManagerSacked` is the only career-ending event.

Vocabulary and event/data definitions added to [CONTEXT.md](../../../CONTEXT.md) under "Board &
objectives" (and a new Stature Tier definition under "Transfers & contracts"). Architecture rationale
in [ADR-0006](../../../docs/adr/0006-board-objectives-and-manager-sacking.md).
