# 06 — Screen 19: Manager Status redefined, and the name collision

Type: grilling
Status: resolved
Blocked by: 03

## Question

Settled on the map: Screen 19 becomes the single-manager profile-and-tenure screen, absorbing the meaning
already carried by the `manager_status` table (`consecutiveMisses`, `sacked`, `lastOutcome`). What remains
is the design.

- **Content**: which of Manager Pillars, Pillar Distribution, Archetype, Board Objective, Verdict,
  Consecutive-Miss Counter, career record, and employment detail belong on this screen — and which
  already have a home elsewhere, notably the season summary screen.
- **Sacking risk**: how close-to-being-sacked is expressed. `CONTEXT.md` defines Consecutive-Miss Counter
  and Manager Warned; whether the screen shows the raw counter, a band, or the warning state is a
  player-facing design call with a mechanical-provenance obligation attached.
- **Vocabulary**: `CONTEXT.md` currently has no term for this screen's subject. Adding one is part of
  closing this ticket, and it must not re-collide with Board Objective or Verdict.
- **Sacked-save behaviour**: what the screen shows once the save is archived read-only.

Both `Manager Status` readings are in play in the repo today, so the resolution must state plainly which
survives and what the other is called instead, if anything.

## Answer

**Screen is "Manager Profile", showing profile identity (name, archetype, pillars, club, tenure) with a passive Active/Archived status badge; all sacking/outcome detail stays exclusive to Season Summary; "Manager Status" retired as domain term.** See [Agent Note](/.agents/notes/implemented/feature/2026-08-30-manager-profile-screen.md). Reconciliation ledger updated with `renamed`/`contradicted` rows for the survivors.

## Done when

Screen content is specified, and `CONTEXT.md` carries the term with the collision resolved.