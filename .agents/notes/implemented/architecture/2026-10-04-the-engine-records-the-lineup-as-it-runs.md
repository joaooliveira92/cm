# Agent Note: The engine records the lineup as it runs

Status: implemented

Builds on [the three-phase engine and deterministic seed](../architecture/2026-08-27-match-engine-three-phase-and-deterministic-seed.md)
and [committed matches store their timeline](../architecture/2026-09-19-committed-matches-store-their-timeline.md).
Supersedes the read-side account in
[the keeper-leaving rule](../feature/2026-09-19-a-keeper-leaving-always-drags-a-stand-in.md).

## Problem

The match engine owned the authoritative runtime state — who is on the pitch, who has been on,
substitutions used, windows used — and threw it away when the run ended, returning only the emitted
timeline, Conditions and per-minute counts. Every screen that needed the lineup then reverse-engineered
it from the Match Event stream: the pitch fold replayed slots, forced-offs and command ordering, and
the substitution ledger re-derived the cap and window counters by re-enacting the engine's own rules.
Two state machines replayed the same semantics and nothing made them agree. The comments admitted the
coupling ("rebuilds them by the engine's own rules", "Mirrors the penalty arm of…", "moves the fold
does not follow"), and no gate failed if the two drifted. Every engine change to substitution, injury,
card or forced-off behaviour demanded a matching, ungated change in a module that did not import the
runtime that decided it. The committed timeline's readers did the same reconstruction again.

## Decision

- **One producer.** While it simulates, the engine records the lineup as it goes. The projections
  never re-derive it. Recording is a projection of state the run already computed, draws no random
  numbers, and so cannot change any seed's play.
- **Lineup Frame.** A `RuntimeFrame` is the engine's per-club, per-event view: the club, its on-pitch
  slots (player id, the display Position of the slot's cell, and whether the slot is the goalkeeper),
  the players who have been on, the substitutes still eligible, and the substitutions and windows
  used. One `lineupFrameOf(team)` reads the runtime state and is the frame's only definition; it
  lives beside the runtime state it reads (`packages/game-engine/src/match/simulate/teamState.ts`).
  The stored path rebuilds the kickoff frame from the stream's `MatchStarted` snapshot instead
  (`kickoffFrameOf` in `materialiseFrames.ts`), a mirror kept honest by a test rather than a second
  definition. Frames are indexed so entry *i* is the lineup just before event *i* takes its own lineup
  consequence, matching the existing before-each-event contract.
- **Lineup Journal.** The run also records a compact, tagged journal: one entry per lineup change,
  carrying the event index it takes effect before, the club, the kind (`substitution`, `forceOff`,
  `standIn`), the players involved, its origin (`manager` or `forced`), and, for a manager
  substitution, its role (`manager`, `standIn`, `halftime`) — a forced bench replacement carries
  none. A substitution records whether it opened a window
  (`openedWindow`), so no reader re-enacts the half/minute window rule. A manager `ForceOff` records
  whether it actually removed its player. The journal is the materialiser's input and the stored form;
  frames materialise from it by applying entries whose index is at or before the frame's event.
- **Threaded returns, no new public entry point.** The frames and journal are returned beside events,
  Conditions and counts through the existing simulation and stream re-derivation entry points. There
  is no new public `foldRuntime`; the existing names carry the new field, and no consumer changes.
- **The recording hook sits at the mutation.** The frame a lineup change produces takes effect after
  the change's own event, so a substituted player is still on at their Substitution's frame; a
  no-event change (a bring-off that empties a slot) takes effect from the next event. Recording is
  done where the engine mutates — `applyCommand`'s call sites, `forcePlayerOff`, `emptySlot`,
  `applyForcedOff` — not by snapshotting after every `events.push`, which would record a Substitution
  after its slot mutation had already run.
- **Projections read frames.** `pitchBeforeEachEvent` returns the before-each-event array from the
  frames; `pitchAsOf` returns the pitch as of a reveal cut from the frames plus the journaled manager
  changes after the cut; `substitutionStatus` projects `substitutionsUsed`/`windowsUsed` from the
  frame at the cut plus the overlaid manager substitutions' recorded `openedWindow` facts. The
  classification, fold-ordering, window-ledger and cap/inference machinery is deleted. The
  command-outcome read (`substitutionApplied`) stays, because deciding whether a submitted
  substitution took effect inherently compares emitted substitution events against journaled commands.
- **The keeper-leaving rule is a recorded fact.** The keeper stand-in machinery is now the
  `standIn` journal entry (and the runtime `gkStandIns` set the frame reads), not a reader-side
  classification (`classifySubstitutions`/`foldPitch` are gone).

## Alternatives considered

**A separate `foldRuntime(stream) -> frames` projection.** Rejected: a fold outside the run keeps a
second re-derivation of command ordering alive, which is exactly the coupling this removes. The
recorded journal is that ordering, made a fact.

**Draft the timeline from the recorded frames on every read.** Rejected: the Match Event stream stays
the sole record of play, and committed matches already store their timeline. The frames are a
projection of the same run, not a replacement source.

**Snapshot the whole team after every `events.push`.** Rejected: a Substitution is emitted after its
slot mutation, so a post-push snapshot records the replacement already on at the Substitution's own
frame. The frame must be taken before the lineup mutation that the event registers.

## Consequences

- The simulation entry points return Lineup Frames and a Lineup Journal beside events, Conditions and
  counts; no caller changes. A frame exists per club per event, entry *i* the lineup just before event
  *i*'s lineup consequence.
- Recording draws no random numbers: every seed's events, Conditions and counts are byte-identical to
  before, and the group-g desktop read specs pass. Their `pitchAsOf` call sites changed mechanically
  with the signature (frames plus journal); no assertion changed.
- The permanent guard (`packages/game-engine/test/match/lineup-frames-cross-check.test.ts`) pins the
  exact projected on-pitch shape, substitutes and substitution status for a fixed set of seeded
  scenarios and cuts, plus the journal, against committed golden values captured from the deleted
  event-derived oracle. It fails if the recording or the projections drift.
- The capture semantics are the subtle part: a red card or severe Injury is emitted before its
  mutation, while a Substitution is emitted after, so the hook sits at the mutation rather than on
  `events.push`. The guard is the tripwire.
- The runtime-state module is close to the source-file ceiling; the frame type and its reader stay
  small, and the journal materialiser lives with the projections rather than beside the runtime.
- The Lineup Frame and Lineup Journal are named in `CONTEXT.md`. An `openedWindow` flag joined the
  journal entry so the substitution projection adds recorded facts instead of replaying the window
  rule.
