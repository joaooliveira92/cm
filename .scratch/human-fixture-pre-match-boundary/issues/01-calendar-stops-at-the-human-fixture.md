# 01: Continue stops before the human club's Matchday

**What to build:** A press of Continue that reaches a Matchday containing the human club's Fixture
resolves none of that Matchday and stops. The player is left in a state they can inspect and repair:
the Fixture is due, the Fixture is unplayed, the Calendar has not crossed it, and preparation can be
examined and fixed.

Today the advance resolves every due Fixture in the world including the human's, so there is no
moment at which a readiness rule could execute. This ticket creates that moment and nothing else —
the Fixture is not yet playable from it, which arrives in ticket 02.

The boundary is durable state on the season, naming which Fixture is pending, rather than a new
season phase: a phase value would record that *some* Fixture is pending without saying which, mixes
pending-action vocabulary into a lifecycle enum, and leaks to the player as raw text.

Pressing Continue again at the boundary mutates nothing at all. No Transfer Window closes twice, no
AI transfer activity re-runs, no date moves, no Fixture resolves. That safety is structural — the
boundary is a function of unresolved state — not a guard bolted on afterwards.

Reading the boundary reports the pending Fixture, the opponent, whether the human club is home or
away, and the currently derived blockers. Those blockers are advisory on read: the player may repair
one a moment later, and nothing about readiness is persisted.

Contradictory states — a match linked to no Fixture, a pending Fixture already played, a pending
Fixture that does not include the human club — fail loudly with typed integrity errors. They are
never repaired heuristically.

Seam: the advance's success shape grows a boundary the caller can be stopped at, and the calendar
gains a first branch that returns the existing boundary unchanged while one is pending. Failures
gained here are integrity violations, which are conditions the caller can observe, not defects.

**Decisions:**

- Continue advances to the human club's scheduled Fixture and stops before resolving any of that
  Matchday; the stop is the authoritative readiness gate. A real stop leaves the application in
  stable, inspectable state, where inline preflight would require inventing an "advancement stopped"
  result type plus retry semantics. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-08-29-human-fixture-pre-match-boundary.md).
- The boundary is two nullable columns on the season, not a new `season.phase` value, which would
  name no Fixture and leak as literal text to the player. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-08-29-human-fixture-pre-match-boundary.md).
- Blocking is boundary-aware: incomplete preparation does not block calendar advancement in general,
  it blocks crossing into the human's match. See [Agent Note](../../../.agents/notes/proposed/feature/2026-08-29-continue-as-global-career-loop.md).

**Blocked by:** `.scratch/continue-and-advance-time/issues/05-advance-is-atomic-and-single-flight.md`
— the boundary is durable state written by the advance, and writing it outside a transaction
reintroduces exactly the half-applied Matchday this note exists to prevent.

**Status:** ready-for-agent

- [ ] A Continue press reaching a Matchday containing the human club resolves zero Fixtures of that
      Matchday and stops.
- [ ] The pending Fixture is persisted durably and survives an application restart; the season's
      phase is unchanged and no new phase value exists.
- [ ] Repeated Continue presses at the boundary mutate nothing — no window transition, no AI
      transfer activity, no date movement, no Fixture resolution, no appended event.
- [ ] Reading the boundary reports the pending Fixture, opponent, home-or-away role, and derived
      blockers; no readiness state is stored.
- [ ] Contradictory boundary states fail with typed integrity errors rather than being repaired.
- [ ] Background Competitions still resolve as their dates pass, unchanged.
- [ ] `pnpm check:all` is green.
