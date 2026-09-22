# Agent Note: A Youth Intake is the squad floor

Status: proposed

## Problem

Contract expiry removes players from every club and nothing replaces them at the human club. Played to
season 3, most worlds leave the human club on ten players: no legal Tactic, a pre-match boundary that
cannot be crossed, and a career over with no in-game recovery
([decision request](../../../../.scratch/gate-red-on-dev/decision-request-01-squad-decay-has-no-floor.md)).
AI clubs tolerate it only because their Fixtures resolve from strength numbers.

## Proposal

- **Youth Intake.** At every Season rollover, after contract expiry, each club, the human's included,
  gains generated players aged 16 to 18: two to four per club per season, plus as many more as it takes
  to reach a squad of **16** (eleven and a full bench). They are drawn with world generation's player
  draw, seeded from the world seed and the Season, so a world stays reproducible. Each gets an ordinary
  Contract on the signing terms (formula wage, default length), written directly rather than as a Free
  Agent signing, so there is no transfer record and no per-player signing item. The human club's intake
  is reported in the News Inbox, as one item.
- **Short-squad advisory.** When the human club's squad would fall below 16 at the coming rollover
  (players with `years_remaining` of 1 are about to leave), a Continue readiness advisory says so and
  links to the players who can still be renewed. An advisory, not a Readiness Blocker.
- **No youth squad.** Intake players join the senior squad directly. CONTEXT.md's cut of youth
  integration and youth promotion stands, and **Youth Intake** is defined so the two are not confused.

Decided under the human's standing delegation (2026-09-21).

## Alternatives considered

- **The human's own transfer activity as the floor (A).** The follow-up, not the floor: the Free Agent
  pool is only whoever happened to expire, so a manager can do everything right and still find nobody
  to sign.
- **AI-style auto-renewal for the human club (C).** Rejected: it deletes the expiry mechanic.
- **A machine-picked fallback Tactic.** Already rejected (`TacticMissingError`'s doc comment); it
  hides the state instead of preventing it.

## Consequences

- Squad size is a weaker source of pressure. Losing players still costs quality, since an intake
  player is young and raw.
- No schema change: intake players are new rows in existing tables.
- A spec may play a career past season 2 without meeting `HumanClubCannotFieldElevenError`.
- Intake wages count against the Wage Budget with no gate: a floor a budget could refuse would not be a
  floor. (Amended 2026-09-22 with ticket 07: the Free Agent signing path would have written a false
  transfer record and one News Inbox item per player.)

## Acceptance criteria

- After any number of rollovers, every club's squad is at least 16, proved by a seed sweep that plays
  worlds 7, 46, 298 and 381 (which fell below eleven at season 2) through three rollovers.
- The same world seed produces the same intake.
- The short-squad advisory appears when, and only when, the coming rollover would take the human club
  below 16.
