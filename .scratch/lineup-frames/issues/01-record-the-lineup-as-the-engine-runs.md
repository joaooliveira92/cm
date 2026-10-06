# 01: Record the lineup as the engine runs

Source: [spec.md](../spec.md).

**What to build:** While it simulates, the engine captures a **Lineup Frame** per club at each Match
Event — who is on the pitch (with the slot's display position and whether it is the goalkeeper), who
has been on, the substitutes still eligible, and the substitutions and windows used — and a tagged
**Lineup Journal** of each lineup change: the event index it takes effect before, the club, the kind
(substitution, force-off, goalkeeper stand-in), the players, its origin (manager or forced) and, for
a substitution, its role (manager, stand-in, halftime), plus whether each journaled bring-off
actually removed its player. Frames and journal are returned beside events, Conditions and counts
through the existing simulation and stream re-derivation entry points. No consumer changes; the
emitted timeline, Conditions and per-minute counts are byte-identical for every seed. The change also
adds the Lineup Frame and Lineup Journal terms to `CONTEXT.md`, corrects the stale Match Decider
clause that says the timeline is never stored, and drafts the architecture Agent Note as proposed.

The slice's edge promises pure synchronous result arrays: no Effect, no services, and no typed
failures — recording projects state the run already computed and draws no random numbers.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] The simulation entry points return frames and a journal beside events, Conditions and counts,
      with no caller change.
- [x] A frame exists per club per event; entry *i* is the lineup just before event *i*'s own lineup
      consequence, matching the before-each-event contract.
- [x] Journal entries carry the event index, club, kind, players, origin, role, and the
      force-off-applied fact.
- [x] Recording draws no random numbers: every existing seed's events, Conditions and counts are
      byte-identical to before.
- [x] One `lineupFrameOf` reads the runtime state and is the frame's single definition; the
      runtime-state module stays under the source-file ceiling.
- [x] `CONTEXT.md` gains **Lineup Frame** and **Lineup Journal**, and the stale "timeline … never
      stored" clause is corrected.
- [x] The new architecture Agent Note is drafted as proposed; the keeper-leaving and
      committed-timeline notes are left for the tickets that make them stale.
- [x] `pnpm check:all` is green; small Conventional Commits on `dev`.
