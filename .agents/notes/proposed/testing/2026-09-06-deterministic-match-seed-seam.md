# Agent Note: A deterministic match seed seam

Status: proposed

## Problem

`startMatch` drew every match's seed from `Date.now() ^ hashString(randomUUID())` and offered no way
to pin it. `apps/desktop/test/main/match/commands.test.ts` compensated with three retry loops: one
started up to 40 clock-seeded matches and asserted that at least one produced an Injury, and two
sibling helpers started up to 25 apiece looking for a match with no Injury (and, for the ForceOff
tests, no RedCard either). Those are probabilistic assertions, so they had a real failure rate —
three consecutive runs of unchanged code on 2026-09-05 gave 2 failures, then 1, then 0.

A suite that has to be run three times before a red result means anything stops being able to answer
the question it exists for.

`.agents/notes/implemented/testing/2026-08-28-match-day-structural-extension.md` rejected exactly
this trial-and-error shape at the e2e level, for exactly this reason. It landed at the unit level
instead, where the reliability contract that rejected it does not reach.

## Proposal

Add `MatchSeedSource`, a `Context.Reference<() => number>` exported from
`apps/desktop/src/main/match/start.ts` (and re-exported from the subsystem barrel), whose default
value is the clock-derived draw the line always was. `startMatch` reads it and calls it.

A `Context.Reference` is a service key **with a default**, so its `Requirements` is `never`:
`startMatch`'s type is byte-for-byte what it was, `rpcServer.ts` provides nothing, and there is no
new layer to wire. A test pins a match with
`startMatch(...).pipe(Effect.provideService(MatchSeedSource, () => 3))`.

It holds a *function* rather than a number because a `Context.Reference`'s default is computed once
and cached. A `Context.Reference<number>` defaulting to the clock would hand every match started in
one process the same seed — a production behaviour change dressed up as a test seam.

Draw order is untouched. The seam changes only *where the number comes from*, not what the engine
does with it, so `test/main/world/world-determinism.test.ts` and the game-engine simulate specs
still pin the same outcomes for the same seeds.

The three retry loops become three pinned constants (`INJURY_SEED`, `INJURY_FREE_SEED`,
`CLEAN_LINEUP_SEED`), found by enumerating seeds through the same public path the tests take.

**The world seed has to be pinned too.** Whether a seed injures anybody is a function of the match
seed *and* the squads playing, and `createSave` draws a fresh world seed per call. So the spec
builds its career through `beginCareer`/`commitCareer` at a fixed `worldSeed`, the pattern
`test/main/season/helpers.ts` already uses. Pinning one end without the other would have moved the
flake rather than removed it.

The two "Injury-free"/"clean" helpers keep a drain-and-check, no longer as a retry but as a guard:
they assert their seed still has the property they were named for, and name the constant to repin if
the engine's draw order ever moves. A drifted seed then reports itself instead of surfacing as a
confusing off-by-one three assertions later.

## Alternatives considered

- **An optional `seed?: number` parameter on `startMatch`.** Rejected: it puts a test-only argument
  in the production signature, which the ticket ruled out, and every production call site then has
  to be read to confirm it does not pass one.
- **A required `MatchSeed` service (`Context.Service` + a layer).** Rejected: it pushes a
  requirement into `startMatch`'s `R`, so `rpcServer.ts` and every future caller must provide a
  layer to get the behaviour they already had. That is a real production cost paid for a test.
- **A separate test-only `startMatchWithSeed` entry point.** Rejected: two entry points into the
  kickoff snapshot means the tested path is not the shipped path, and the two drift.
- **Deriving the seed from the world: `deriveSeed(worldSeed, "match", fixtureId)`.** The most
  principled fix — it would make a watched match as reproducible as a background one already is, and
  the existing comment in `start.ts` names it. Rejected *here*: it changes the game's determinism
  story rather than adding a test seam, and it belongs in a ticket that says so.
- **Raising `MAX_ATTEMPTS`.** Rejected by the ticket, and rightly: it trades a visible flake for a
  slower, rarer one.

## Acceptance criteria

- `startMatch`'s production signature and behaviour are unchanged; no production call site provides
  a seed.
- `commands.test.ts` contains no retry loop over match starts.
- 20 consecutive runs of `commands.test.ts` are green.
- `test/main/world/world-determinism.test.ts` and the game-engine simulate specs still pass
  unchanged.

## Risks

- The pinned seeds are coupled to the engine's draw order and to the `WORLD_SEED` world's squads.
  An engine change can invalidate them. Mitigated, not removed: each seed's property is re-asserted
  at use with a message naming the constant to repin.
- `MatchSeedSource` is exported from the match barrel, so production code *could* provide it. That
  is the cost of not having a test-only entry point, and it is the same exposure any service seam
  carries.
