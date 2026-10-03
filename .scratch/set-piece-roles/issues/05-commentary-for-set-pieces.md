# 05: Commentary for the new set-piece outcomes

Spec: [spec.md](../spec.md)

**What to build:** commentary sections for what the new outcomes produce (a short corner, a flick-on, a
volley from the edge, a crossed free kick, a free kick kept), in `events.cfg`, with the file version raised
so older player files are offered them.

**Acceptance:** every new outcome reads correctly over whole simulated matches with instructions set; no
placeholder left unfilled.

**Blocked by:** 02, 04

**Status:** resolved

## Answer

- New sections in `events.cfg`: `Corner:short`, `Corner:edgeOfArea`, `Corner:nearPost`, `Corner:farPost`,
  `Corner:edgeOfSixYardBox`, `FreeKick:cross`, `FreeKick:kept`, and a `flickOn` shot kind in `Goal`,
  `ShotOnTarget` and `ShotMissed` (the near-post flicker as `{assist}`). File version 3, so an older
  player's file is offered them.
- Set-piece events record the delivery that actually happened (a short or edge-of-area corner with nobody
  there is recorded as `default`; a crossed free kick with nobody to head it records none), since
  commentary only reads backwards.
- `set-piece-roles.test.ts` plays 30 matches with near-post flick-ons and crossed and kept free kicks,
  checks every placeholder fills, and that each outcome draws from its own section.
