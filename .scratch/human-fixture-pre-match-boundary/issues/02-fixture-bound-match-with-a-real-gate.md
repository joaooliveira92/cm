# 02: Match day is the scheduled Fixture, and it refuses to start unprepared

**What to build:** From the pre-match boundary the player plays their actual League Fixture — the
right opponent, at the right ground, with the right side of the tie — or takes the result without
watching it. Both routes run the same simulation and produce the same match stream; the only
difference is whether the timeline is revealed as it happens.

Quick result is not a lightweight, simplified, or approximate simulation. It runs the authoritative
match with an empty command journal and skips the live reveal. A quick-resulted match stays fully
inspectable afterwards, because it has the same stream any played match has. Quick result means *do
not make me watch this now*, never *discard this match's history*.

Starting either way is where readiness stops being advice. The command recomputes readiness itself
and refuses with a typed failure carrying the current blockers: a disabled control in the renderer
is a convenience, and a stale or bypassed client must not be able to start an invalid Fixture. The
line this draws is between strategic failure and accidental failure — a weak formation, an unbalanced
selection, a tired but legally selectable player are all allowed and their consequences land;
structurally absent required state is not a failure the player chose.

The match's seed is derived from the Season seed and the Fixture, so the same Fixture is always the
same match. This closes a save-scumming path a new player can stumble into and never unlearn:
quitting and restarting must not re-roll the result. A rejected start derives nothing, records
nothing, and cannot affect the seed a later valid start receives.

Two shipped behaviours are deleted rather than narrowed. The free-opponent exhibition path goes: it
always seats the player at home so it cannot express an away Fixture, it writes back to no Fixture,
and it forces a new player to distinguish a career match from a sandbox at exactly the moment they
should be preparing for their first real one. And the tactic fallbacks go, for every club, not only
the human's — a fallback that fires is indistinguishable from one that does not, which is precisely
how the player's club came to be silently assigned a machine-picked formation without anyone
noticing. A missing Tactic becomes a typed failure carrying enough context to say whose it is.

The compatibility consequence is accepted: development saves written before AI Tactic assignment
shipped will fail loudly rather than limping.

Seam: starting a match becomes Fixture-bound and gains typed refusals — blocked by readiness, not
the pending Fixture, already started — that a caller can render. Match resolution stays where it is;
nothing about the engine changes.

**Decisions:**

- Play and Quick result share Fixture identity, readiness validation, seed policy, team setups, the
  persisted start event, the simulation, and the completion command, differing only by live reveal;
  resolving Quick result as though the human Fixture were an AI Fixture would make a presentation
  choice decide whether a career match has a stream at all. See [Agent Note](../../../.agents/notes/implemented/architecture/2026-08-29-human-fixture-pre-match-boundary.md).
- The Fixture seed is derived from the Season seed and the Fixture id, independent of wall-clock
  time, renderer state, and presentation mode, to close the quit-and-retry-until-you-win path. See
  [Agent Note](../../../.agents/notes/implemented/architecture/2026-08-29-human-fixture-pre-match-boundary.md).
- Match day becomes Fixture-bound and the free-opponent exhibition path is removed from v1; the
  Tactic fallbacks are deleted for every club rather than narrowed to exclude the human's. See
  [Agent Note](../../../.agents/notes/implemented/architecture/2026-08-29-human-fixture-pre-match-boundary.md).
- Readiness is recomputed authoritatively when resolution is requested and rejects with typed
  blockers; client-side disabled controls are never the integrity boundary. See [Agent Note](../../../.agents/notes/implemented/feature/2026-08-29-continue-as-global-career-loop.md).

**Blocked by:** 01 (Continue stops before the human club's Matchday) — there is no pending Fixture to
bind to until the boundary exists.

**Status:** resolved

- [x] Match day derives its Fixture from authoritative season state; the player cannot choose or
      override the opponent, and an away Fixture is played away.
- [x] Play and Quick result produce the same stream shape for the same Fixture; a quick-resulted
      match is inspectable afterwards.
- [x] The same Fixture simulated twice from the same save produces the same result; abandoning and
      returning resumes the same match rather than re-rolling it.
- [x] A start requested with a blocking readiness condition is refused with a typed failure carrying
      the blockers, records no start event, and creates no stream — including when the renderer's
      control is bypassed.
- [x] Navigating away and returning, and restarting the application, both resume the started match.
- [x] A Fixture with a started match cannot be started again.
- [x] No match-start path manufactures a missing Tactic for any club; a missing Tactic is a typed
      failure naming which club it belongs to.
- [x] The free-opponent exhibition entry point no longer exists in the product or the contract.
- [x] `pnpm check:all` is green.
