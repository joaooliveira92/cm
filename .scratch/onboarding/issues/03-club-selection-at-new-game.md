# Club selection at new game

Type: grilling
Status: open

## Question

Today the human's club is hardcoded: `worldGeneration.ts` sets `is_user_club` on `index === 0` of
`LEAGUE_CLUBS`. Make club selection a real choice, and decide what the player is shown in order to
make it.

Per the seed doc, club selection *is* the difficulty setting — elite clubs give resources and
pressure, small clubs give scarcity and a clearer long-term goal. Stature Tier already provides that
gradient, and board objectives already vary by club, so the mechanism largely exists.

Open questions:

- All 20 clubs freely selectable (the charting-time recommendation), or any gating? Note that
  reputation-based gating is ruled out of scope on the map.
- **What does the selection screen show per club?** Stature Tier, league position last season,
  transfer and wage budget, squad size, board objective, squad quality summary? Too little and the
  choice is uninformed; too much and it is the first information-overload screen a new player meets —
  exactly the section-13 failure this effort exists to fix.
- Is the difficulty consequence stated **explicitly** ("Manchester-equivalent: strong squad, win the
  league or you're sacked") or left implicit as 03/04 did? The map keeps 03/04's simulation-first
  spine but rejects its "explained too little" failure; this is one of the sharpest places that
  tension lands.
- How does club choice interact with the archetype from ticket 01 — is there a recommended pairing, a
  warning about a bad pairing, or no relationship at all?
- **Save identity.** Today a save is a free-text name. Once a manager identity and a chosen club
  exist, "Continue career" could show *Manager — Club — Season* instead, and the name field may be
  redundant. Does the free-text name survive? What does the save list row become?
- Mechanical change: `is_user_club` moves from a generation-time constant to a creation-time choice.
  Does world generation still run before the choice (generate all 20, then flag one) or after?
