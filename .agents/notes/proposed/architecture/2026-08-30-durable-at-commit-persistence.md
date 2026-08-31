# Agent Note: Durable-at-commit persistence eliminates unsaved-progress model

Status: proposed

## Problem

The imported spec for Screen 21 (Quit Game Confirmation) defines a full `UnsavedCareerState` model — revision tracking, pending local/network/cloud transactions, save-vs-discard branching, and a multi-step disposal pipeline — that assumes the application maintains a distinction between "saved" and "unsaved" state. The question is whether that distinction exists in a single-writer, event-sourced, local-SQLite architecture.

The domain-bounded deciders note (`.agents/notes/implemented/architecture/2026-08-27-domain-bounded-deciders-and-chunked-resimulation.md`) establishes the write-side decomposition and the local-SQLite substrate, but never draws the conclusion about unsaved state. As a result, the Group A reconciliation ledger's `contradicted` rows for Screen 21 could only anchor to a note whose premise implies the conclusion but does not state it. This note is that missing anchor.

## Proposal

**No unsaved progress exists.** Every Command that succeeds has already been written to the save's SQLite file before returning to the renderer. The application's entire state is the SQLite file at the point of the last successful Command — there is no in-memory delta, no pending transaction, and no state that exists "since the last save" that could be lost.

This follows from:

1. **Event-sourced, single-writer architecture.** The Club Decider, Match Decider, and Season/Calendar Decider each own one stream of events. Every Command is validated against and folded into that stream inside a single SQLite transaction. Success means the transaction committed.

2. **durable-at-commit lifecycle.** The RpcGroup returns success only after the SQLite transaction has committed. There is no two-phase (execute-then-flush) or deferred-write path. The renderer never holds authoritative game state in memory.

3. **No autosave timer, no periodic checkpoint.** The calendar advances atomically. Fixtures resolve atomically. Transfer commands are fire-and-durable. Nothing accumulates between explicit actions.

4. **No save action for the player to invoke.** `Save` is not a player-facing action. There is no "Save" button, no "Save & Quit", no "Quit Without Saving". The save always is what it is at the moment the player last acted.

### What this changes

- **Screen 21's SS4 (Unsaved-progress model)**: entire section contradicted. There is nothing to model.
- **SS5 (Save and Quit)**, **SS6 (Quit Without Saving)**: contradicted. Neither action exists.
- **SS11 (Quit command's `saveDecision` field)**: contradicted. No save decision is offered.
- **SS14 (State model's `unsavedState`/`localSaveState`)**, **SS15 (State transitions' `SAVE_WORKFLOW`/`CONFIRM_DISCARD`)**: contradicted.
- **SS18 (Accessibility: loss summary)**, **SS19 (Ctrl+S shortcut)**: contradicted. No loss to summarise, no save to invoke.
- **SS22/SS23 (Acceptance criteria and tests involving save/discard)**: contradicted.

### What survives

The absence of unsaved progress simplifies the quit confirmation to exactly one question: "Are you sure you want to close the application?" — an accidental-keypress guard with no state-management branch.

### Relationship to existing notes

Partial supersession of the domain-bounded deciders note: that note established the single-writer local SQLite premise and the Decider decomposition that makes durable-at-commit possible. This note draws the conclusion about unsaved progress that the earlier decision supports but did not assert. Both remain active; the earlier note continues to provide the architectural mechanism, this one provides the derived property the spec reconciliation needs.

## Alternatives considered

- **In-memory change tracking (the spec's `UnsavedCareerState`)**. Rejected because it would require inserting an artificial "dirty" concept into a system where every mutation already commits. It would add revision counters, pending-work queues, and a save-gate with no referent in the event stream. Worse, it would actively mislead: the renderer would claim there is unsaved state when nothing durable distinguishes saved from unsaved.

- **Optimistic writes with deferred commit.** The renderer could accept a Command optimistically and batch commits. Rejected: it introduces rollback scenarios, conflict resolution, and a window of observable-but-uncommitted state that contradicts the single-writer invariant. No player-facing benefit justifies this complexity.

## Acceptance criteria

- The reconciliation ledger for Screen 21 re-anchors its `contradicted` rows (SS4, SS5, SS6, SS11, SS14, SS15, SS18, SS19, SS22, SS23) from the domain-bounded deciders note to this note.
- No code constructs an `UnsavedCareerState`, `saveDecision`, or equivalent type in any new Group A work.
- The `Save` concept in `CONTEXT.md` already states "a Save is durable at commit — every Command that succeeds has already been written — so a Save is never 'unsaved' and there is no save action for the player to invoke." No change needed there; it already captures this.

## Risks

- **Misinterpretation as "quitting is safe at any moment."** Durable-at-commit means committed state is safe. In-flight commands (an RPC in transit, a mid-creation provisional world) are not committed. The quit guard must still handle the provisional-career window (see quit confirmation design note). This note does not license unconditional quitting.