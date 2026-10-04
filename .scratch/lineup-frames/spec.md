# Spec: The engine records the lineup as it runs

Status: ready-for-agent

Source: a grilling session on 2026-10-04. Every decision below was settled there. The engine work is
a consolidation, not a new mechanic: observable match behaviour is unchanged.

## Problem Statement

Two state machines replay substitution and injury semantics and must agree event-for-event, but
nothing makes them. The match engine owns the authoritative runtime state — who is on the pitch, who
has been on, substitutions used, windows used — and throws it away when the run ends, returning only
the emitted timeline, Conditions and per-minute counts. Every screen that needs the lineup then
reverse-engineers it from the Match Event timeline: the pitch fold replays slots, forced-offs and
command ordering, and the substitution ledger re-derives the cap and window counters by re-enacting
the engine's own rules. The comments admit the coupling ("rebuilds them by the engine's own rules",
"Mirrors the penalty arm of…", "moves the fold does not follow"), and no gate fails if the two drift.
Every engine change to substitution, injury, card or forced-off behaviour demands a matching,
ungated change in a module that does not import the runtime that decides it. The same reconstruction
is done again for the committed timeline's readers.

## Solution

The engine records the lineup as it runs, and the projections read what it recorded. During
simulation the engine already holds the true runtime state at every event; it captures a **Lineup
Frame** per club as it goes — a small, immutable view of who is on the pitch, who has been on, the
substitutions and windows used, and the role each substitution played. The pitch and substitution
projections become dumb readers of those frames; the parallel fold, the cap/window re-enactment and
the stand-in and halftime inference are deleted. The reveal cut becomes a pure projection over frames
and roles: a manager's change, being journaled, is present and counts once given; a forced change
counts only once its event is revealed.

Because a committed match stores its timeline and is never re-simulated, the recorded lineup is
stored too, as a compact **Lineup Journal** on the committed timeline — additive JSON in an existing
column, so no save-schema change. A committed read decodes the journal and materialises the same
frames; a stored timeline that predates the journal re-derives from the stream once, the way
Conditions already do.

One home for the semantics. A future engine change to who leaves the pitch is felt by every reader at
once, because the frames are that change. A permanent cross-check sweep proves the frame projections
equal the event-derived ones across seeds, commands and reveal cuts, then the old machinery goes.

## User Stories

1. As a manager, I want the substitution picker to show the pitch exactly as the engine has it, so
   that I never see a player the engine would refuse and never miss one it would accept.
2. As a manager, I want my own substitution to appear as soon as I have given it, even before the
   minute it takes effect is revealed, so that the screen matches what I commanded.
3. As a manager, I want a forced substitution, red card or severe injury to appear on the pitch only
   once I have seen that event, so that the pitch never reveals play ahead of the commentary.
4. As a manager, I want a goalkeeper stand-in to be shown in goal without spending a substitution or a
   window, so that the eleven and the counters both read true.
5. As a manager, I want my substitutions used, windows used and remaining figures to agree with what
   the engine actually spent, so that a cap never surprises me.
6. As a manager, I want a halftime substitution to spend no window, so that the count matches the
   engine's rule at the break.
7. As a manager, I want two substitutions in the same minute to share one window, so that the count
   follows the engine rather than the clock display.
8. As a manager, I want a bring-off that removes a player to be reflected in the pitch and the match
   report, so that playing with ten is visible.
9. As a manager, I want a bring-off of a player the engine refused to leave the pitch unchanged, so
   that a refused command does not invent a change.
10. As a manager, I want the live pitch, the post-match report, the ratings, the statistics and the
    summary to tell the same story about who played, so that no two screens disagree.
11. As a manager, I want a committed match's post-match screens to read the lineup that was actually
    played, not one re-derived under a later engine, so that history is frozen.
12. As a manager, I want no change to the play I already watched when this ships, so that my saves and
    my matches are unaffected.
13. As a player, I want matches already committed to keep their recorded lineup, so that my Form and
    reports do not shift when the engine changes.
14. As a player, I want a save made before the lineup record existed to still open and read, so that I
    am not locked out.
15. As a developer, I want the engine to record the lineup it already decided, so that the projections
    do not re-derive it.
16. As a developer, I want the recording to draw no random numbers, so that every seed produces
    byte-identical play.
17. As a developer, I want one `lineupFrameOf` reading the runtime state, so that the frame is defined
    in exactly one place.
18. As a developer, I want each recorded substitution to carry its role (`manager`, `standIn`,
    `halftime`) as a fact, so that the classification heuristics can be deleted.
19. As a developer, I want each recorded change to carry the event index it takes effect before, so
    that the reveal cut is a comparison, not a reconstruction.
20. As a developer, I want each journaled bring-off to record whether it actually removed its player,
    so that command feedback needs no re-fold.
21. As a developer, I want the Lineup Frame and Lineup Journal named in `CONTEXT.md`, so that the new
    concepts have one vocabulary.
22. As a developer, I want the stale `CONTEXT.md` clause that says the match timeline is never stored
    corrected, so that the glossary matches the committed-timeline reality.
23. As a developer, I want `pitchAsOf` and `pitchBeforeEachEvent` to keep their names and shape but
    take frames, so that call sites read the same.
24. As a developer, I want the substitution ledger's public shape preserved where it is a thin
    projection, so that the main process and its assessors change minimally.
25. As a developer, I want a permanent cross-check sweep asserting the frame projections equal the
    event-derived ones, so that any future drift fails a gate.
26. As a developer, I want the deletion to follow a green sweep, so that the swap is proven, not
    asserted.
27. As a developer, I want the stored timeline to carry the Lineup Journal additively, so that no
    migration is needed and old saves still open.
28. As a developer, I want a stored timeline without a journal to re-derive once from the stream, so
    that backward compatibility has one clear rule.
29. As a developer, I want the emitted Match Event vocabulary unchanged, so that the stream stays the
    sole record of play and the event model does not move.
30. As a developer, I want the frame type kept small enough not to breach the source-file ceiling, so
    that the lint gate stays green.
31. As a developer, I want one architecture Agent Note recording this decision, and the two notes it
    makes stale updated in the same change, so that the corpus does not describe removed machinery.
32. As a reviewer, I want the existing group-g match-day specs to stay untouched and pass, so that the
    consolidation is provably behaviour-preserving.

## Implementation Decisions

- **One producer.** The simulation run records the lineup as it goes; the projections never re-derive
  it. The engine already holds the authoritative runtime state at every event and currently discards
  it, returning only events, Conditions and per-minute counts. Recording is a projection of state the
  run already computed, draws no random numbers, and so cannot change any seed's play.
- **Lineup Frame.** A `RuntimeFrame` is the engine's per-club, per-event view: the club, its on-pitch
  slots (player id, display position from the slot's cell, and whether it is the goalkeeper), the
  players who have been on, the substitutes still eligible, and the substitutions and windows used.
  One `lineupFrameOf(team)` function reads the runtime state and is the frame's only definition; it
  lives beside the runtime state it reads. Frames are indexed so entry *i* is the lineup just before
  event *i* takes its own lineup consequence, matching the existing before-each-event contract.
- **Lineup Journal.** Alongside the frames the run records a compact, tagged journal: one entry per
  lineup change, carrying the event index it takes effect before, the club, the kind
  (`substitution`, `forceOff`, `standIn`), the players involved, its origin (`manager` or `forced`),
  and, for a substitution, its role (`manager`, `standIn`, `halftime`). A manager `ForceOff` records
  whether it actually removed its player (the existing `forceOffApplied` fact). The journal is the
  materialiser's input and the stored form; frames materialise from it by applying entries whose
  index is at or before the frame's event.
- **Threaded returns, no new public fold.** The frames are returned through the existing engine
  entry points — the simulation result and the stream re-derivation — beside events, Conditions and
  counts. There is no new public `foldRuntime`; the existing names carry the new field.
- **Projections read frames.** `pitchBeforeEachEvent` returns the before-each-event array from the
  frames; `pitchAsOf` returns the pitch as of a reveal cut from the frames; the substitution status
  and counted substitutions read the frames and their factual roles. The command-outcome read stays,
  because deciding whether a submitted substitution took effect inherently compares emitted
  substitution events against journaled commands.
- **The reveal cut is a pure projection.** A manager-origin change is journaled by construction, so it
  is present in the whole-match frames and appears and counts once given, ahead of the reveal; a
  forced-origin change (red card, severe injury, goalkeeper stand-in) applies and counts only when its
  event index is before the reveal cut. `forceOffApplied` is a recorded fact and does not depend on
  the cut. This reproduces the current revealed-play behaviour without the command-ordering
  reconstruction.
- **Deletions.** The stand-in and halftime classification, the lineup-facts fold, the
  emitted-by/minute-start/applied-at ordering machinery, the window-ledger re-enactment, the
  cap-refusal re-enactment, the benchless inference and the forced-off-applied inference are deleted.
  Their facts are recorded. The existing projection names that are thin view builders survive.
- **Stored Lineup Journal.** The committed-timeline record gains an optional lineups field carrying
  the journal, as additive JSON in the existing column: no DDL, no save-schema version move, no
  migration. A committed read decodes it and materialises frames; a timeline that predates it
  re-derives once from the stream, the precedent Conditions already set. The event union is unchanged.
- **Vocabulary.** `CONTEXT.md` gains a **Lineup Frame** term and a **Lineup Journal** term, and the
  stale Match Decider clause that says the timeline is "folded from it on every read and never stored"
  is corrected to describe the committed timeline.
- **Durable rationale.** One architecture Agent Note records that the engine records the lineup as it
  runs and the projections read frames rather than re-folding; the keeper-leaving rule note, whose
  account of the deleted classification becomes stale, and the committed-timeline note, whose stored
  shape gains the journal, are updated in the same change. Code that depends on a note links to it.
- **Source-file ceiling.** The engine's runtime-state module is already large; the frame type and its
  reader are sized to stay under the lint ceiling, with the journal materialiser living in the
  projection module rather than beside the runtime.

## Testing Decisions

Good tests observe behaviour at a seam: the engine's emitted result for a seed, a projection's output
for a constructed timeline, a main-process read over a seeded save, or a committed match read back.
They never assert on private helpers. The fewest, highest seams win.

1. **Engine run seam (primary).** Simulate a spread of seeds, with and without commands and
   forced-offs, and assert the frames and journal: who is on at each event, the substitution counts
   and windows, and each substitution's role. The permanent **cross-check sweep** is here: for many
   reveal cuts, the frame projections must deep-equal the pre-change event-derived output over the
   same seeds. Prior art: the engine simulate specs and the substitution-windows and
   forced-substitution specs.
2. **Projection seam.** On constructed timelines and frame sets, assert `pitchBeforeEachEvent`,
   `pitchAsOf` at several cuts, the substitution status, and the reveal-cut law (manager ahead of
   reveal, forced only once revealed, stand-in spends nothing, halftime spends no window). Prior art:
   the substitutions spec's constructed-timeline tables and the substitution-windows spec.
3. **Stored-timeline seam.** Commit a match and read every tag and the journal back; assert a stored
   timeline without the journal re-derives and reads identically; assert no DDL or schema-version
   change. Prior art: the committed-timeline and stored-timeline specs.
4. **Behavioural contract (unchanged).** The existing group-g match-day desktop specs —
   revealed-pitch, revealed-state, revealed-substitutions, substitution-accuracy, ratings,
   statistics, red-card-stand-in — stay exactly as they are and must pass without edits, proving the
   consolidation is behaviour-preserving.

### Definition of Done

- [ ] The simulation run returns Lineup Frames and a tagged Lineup Journal beside events,
      Conditions and counts; recording draws no random numbers.
- [ ] `lineupFrameOf` is the frame's single definition; the frame is a small immutable view of the
      runtime state.
- [ ] The pitch and substitution projections read frames; the classification, fold-ordering, window,
      cap and inference machinery is deleted; the command-outcome read remains.
- [ ] The reveal cut is a pure projection over frames and factual roles, and the group-g desktop specs
      pass untouched.
- [ ] The permanent cross-check sweep passes across seeds, commands and reveal cuts before the old
      machinery is deleted.
- [ ] The committed-timeline record carries the optional Lineup Journal additively; a committed read
      materialises frames; a timeline without it re-derives; no save-schema version move.
- [ ] `CONTEXT.md` gains **Lineup Frame** and **Lineup Journal**, and the stale Match Decider clause
      is corrected.
- [ ] The new architecture Agent Note is written, and the keeper-leaving and committed-timeline notes
      are updated, in the changes that make them stale.
- [ ] Full gate green, clean tree, small Conventional Commits on `dev`.

## Validation commands

- `pnpm check:all` — the full gate: typecheck, `oxlint`, `effect-lint`, `verify-md-links`,
  `verify-db-schema`, and all unit tests.
- `pnpm check:ci` — the same set minus e2e OS setup.
- `pnpm -r test` — to isolate a package failure before the full gate.

## Out of Scope

- **Changing observable match behaviour.** This is a consolidation; if the cross-check sweep finds a
  discrepancy, the recorded frames win only where the old fold was wrong, and that is surfaced as its
  own decision, not smuggled in.
- **Changing the Match Event vocabulary.** No event variant is added, removed or reshaped; the stream
  stays the sole record of play.
- **Changing revealed-play semantics.** The manager-ahead rule and the forced-changes-only-once-
  revealed rule are preserved exactly.
- **Migrating or backfilling old saves.** The journal is additive and missing journals re-derive; no
  migration path is introduced.
- **Any UI change.** No screen, contract or read-model shape the renderer sees changes.
- **A new public simulation entry point.** The existing returns carry the frames.

## Further Notes

- The pitch's original framing named `foldRuntime(stream) -> frames`. The grilling settled on
  recording inside the run rather than a separate fold, because a separate fold would keep a second
  re-derivation of command ordering alive; the recorded journal is that ordering, made a fact.
- The engine's runtime-state module is 408 lines against a 600-line ceiling; adding the frame type and
  its reader keeps it under, and the journal materialiser belongs with the projections.
- The equivalence sweep is kept after deletion, as a permanent guard that the projections and the
  engine's recorded facts cannot diverge.
- Two pieces of the current machinery are deliberately not deleted: the command-outcome read
  (`substitutionApplied`), which inherently needs the emitted events and the journal, and the
  `forceOffApplied` feedback, which becomes a recorded fact.
