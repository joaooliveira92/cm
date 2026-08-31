# Agent Note: Domain-bounded Deciders, typed RPC methods, and chunked match resimulation

Status: implemented

> Migrated from ADR-0007 when the numbered ADR layer was retired.

## Problem

The write side needed a decomposition: how many Deciders, split along what lines, reached through what
transport. Live matches added a second question — mid-match commands mean a match cannot be
pre-computed, so something has to carry partial simulation back to the renderer.

## Decision

### Three Deciders

Club (per club), Match (per Fixture), and Season/Calendar (per save) — rather than one global save-wide
Decider or a Decider per fine-grained concept.

One global Decider would force every command handler to load and reason about irrelevant state; a
`ChangeTactics` command has no business touching Transfer Budget invariants. Splitting Club further into
Finance/Squad/Board buys nothing, since Contracts, Budgets, and Board Objective already change together
on a signing or a season-end judgment.

League Table is deliberately **not** a Decider. Nothing commands it into existence, so it stays a
projection folded from Match Decider events.

### Typed RPC methods

The RpcGroup gives every player-invokable Command and query its own typed method (`bidForPlayer`,
`getSquad`, and so on), not a generic `submitCommand` envelope. Each command gets its own
schema-validated success and error channel.

Internal-only commands — AI clubs acting for themselves, batch AI-fixture resolution, cross-Decider
reactions — are invoked directly in-process and never touch the RpcGroup, since only the renderer needs
the IPC boundary.

### Chunked resimulation, not RPC streaming

Mid-match `ChangeTactics` and `MakeSubstitution` mean a match cannot be fully pre-computed ahead of
time. The engine is cheap and this is a local single-player app, so a `ResumeSimulation` command
simulates from the current point to the next interaction opportunity, or to full-time, in one
request/response — still fully deterministic from the `MatchStarted` seed. The renderer paces reveal of
the returned chunk client-side.

### Synchronous cross-Decider reactions

`SeasonConcluded` triggering `BoardObjectiveJudged`, `ManagerWarned`, or `ManagerSacked` across 20 Club
streams happens synchronously within the same request that advanced the calendar. An outbox or
async-worker split exists to survive crashes or to scale dispatch across machines; neither applies to a
local Electron app with one SQLite file. Synchronous reaction keeps `AdvanceCalendar`'s response the
single point where "what happened this Matchday" is fully known.

### Two streams, one transaction

`CompleteTransfer` writes to both the buying and selling club's streams atomically. This relaxes strict
one-aggregate-per-transaction purity, and is safe here specifically because every stream lives in the
same local SQLite file with a single writer — something a distributed or networked event store would not
allow.

## Alternatives considered

- **One global save-wide Decider.** Rejected: every handler would load state irrelevant to it.
- **Finer-grained Deciders inside Club** (Finance, Squad, Board). Rejected: those concerns already change
  together, so splitting them adds coordination without adding isolation.
- **A generic `submitCommand` RPC envelope.** Rejected: it collapses every command into one schema and
  one error channel, losing per-command typing.
- **A true streaming RPC session for live matches.** Rejected: a second transport shape for one screen,
  with no benefit, since nothing needs backend wall-clock pacing.
- **An outbox for cross-Decider reactions.** Rejected: it solves crash-durability and cross-machine
  dispatch, neither of which a single-file local app has.

## Consequences

- Command handlers load only the state their Decider owns.
- Adding a command means adding a typed RPC method, not extending an envelope's union.
- Live-match pacing is a renderer concern; the main process returns whole chunks.
- The two-stream transfer transaction is a documented, deliberate exception that would need revisiting
  if the event store ever stopped being one local file.
