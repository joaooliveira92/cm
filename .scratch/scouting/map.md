# Map: Scouting

Label: wayfinder:map

## Destination

A written **spec document** (`.scratch/scouting/spec.md`), mirroring cm-clone's and Training's shape,
for a **Scouting** system: full attribute fog-of-war for every player outside the manager's own club
(own squad stays full-info), resolved via an assignment-based scout mechanic (manager assigns Scouts
to Players, Scouting Progress narrows Attribute Range toward Fully Scouted over time). Bids stay legal
on any player regardless of scouting state — negotiating with worse information, not a blocked action.
AI clubs are exempt, always acting on full information, matching Training Focus's "AI clubs stay
dumb" precedent. Ready to hand off to a separate implementation effort.

## Notes

- Cut from v1 scope during cm-clone's destination-setting (full-information attributes were the
  direct consequence); revived as its own map, same precedent as Training.
- Vocabulary locked in [CONTEXT.md](../../CONTEXT.md)'s new `### Scouting` section while charting
  this map: Scout, Scouting Assignment, Scouting Progress, Attribute Range, Fully Scouted.
- Architecture precedent this milestone follows, not re-litigates: Attribute Range/Fully-Scouted
  Transfer Value are **derived on read** from real stored Attributes plus stored Scouting Progress —
  same "wide table, derived ratings never stored twice" pattern as Position Rating/Overall
  Rating/Transfer Value ([ADR-0001](../../docs/adr/0001-derived-player-ratings-and-value.md)).
  Scouting Progress itself (a per-human-club, per-Player percentage) is the one genuinely new
  persisted primitive this milestone introduces.
- Scouting Assignments are club-scoped resource state, living on the existing **Club Decider**
  (alongside Contracts/Budgets) — no new Decider warranted.
- Exact numeric tuning (Scout count per Stature Tier, Attribute Range noise-band width, Progress
  accrual rate per Matchday) is tuning data settled as part of each ticket's answer, not pre-decided
  here — same treatment as Board Objective's tier→band table.
- v1 screen list grows from six to **seven**: a new dedicated Scouting screen (assign/manage Scouts,
  see active assignments + progress) is in scope. This is a deliberate amendment to cm-clone's
  "locked" screen list, not an oversight.
- Skills every session should consult: `grilling`, `domain-modeling` for the design tickets;
  `prototype` for the UI ticket.

## Decisions so far

- [Scout resource model & assignment mechanics](issues/01-scout-resource-and-assignment-model.md):
  Stature-Tier-derived Scout count, strict 1:1 assignment, explicit assign/unassign (no auto-swap),
  no separate paused state, Free Agents unspecialized, Progress discarded on own-squad signing but
  persists across other-club moves.
- [Progress accrual & Attribute Range computation](issues/02-progress-accrual-and-attribute-range.md):
  linear per-Matchday Progress accrual, one shared linear noise-band formula for every Attribute
  (including Potential Ability/Injury Proneness, no per-category rates or threshold), Transfer Value's
  range reuses the exact formula evaluated at the Attribute Range's low/high bounds.
- [Scouting technical contract: events, Club Decider extension, RPC surface](issues/03-technical-contract.md):
  Progress advances via a batched per-club `ScoutingProgressed` event hooked into the existing
  per-Matchday `advanceCalendar` boundary (stored/incremented, not computed-on-read); two new tables
  for assignment vs. progress; commands mirror `setTrainingFocus`; `MarketPlayerView` gains nullable
  rating/value ranges; new `ScoutingScreenView`/`getScoutingStatus` RPC.

## Not yet specified

- Exact tuning constants (Scout count per Stature Tier, noise-band `maxWidth`, per-Matchday accrual
  increment) — the *shape* of each formula is settled (tickets 01 and 02), and ticket 03 settled how
  they're wired (event/table/RPC shape), but the actual numbers are still open; settled during
  implementation, not a separate decision ticket.
- Per-screen UI layout/interaction detail for the new Scouting screen beyond "it exists and does
  what" — ticket 04 is a prototype ticket; finer layout polish is the same kind of fog cm-clone left
  for its other six screens.

## Out of scope

- "Watch a Club" assignment target (a Scout progressing an entire roster at once) — Player-only
  targeting keeps this milestone's design surface bounded; may return as a follow-on.
- Scout-as-entity sub-system (individual Scouts with their own skill/attributes affecting scouting
  accuracy or speed) — Scouts stay an undifferentiated countable resource in this milestone.
- Youth-player/wonderkid discovery mechanics — no youth academy exists yet; Training's map already
  ruled this out for the same reason.
- Scouting affecting match-day information (e.g. pre-Fixture opposition scouting reports) — this
  milestone is squad/transfer-market scouting only.
- Per-attribute Attribute Range display (a Player Detail view showing individual Attributes,
  Potential Ability, Injury Proneness as ranges) — surfaced during the technical contract (ticket 03):
  no detail view exists anywhere today for market players, and building one just to show this would be
  new scope the destination didn't ask for. The noise-band formula is still implemented (Transfer
  Value's range depends on it as an input); it's just not wired to any RPC/screen this milestone.
