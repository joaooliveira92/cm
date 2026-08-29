# Draft the Effect RPC contract & event-sourcing schema

Type: grilling

Blocked by: 01, 02, 03, 04, 05, 06

Status: resolved

## Question

Assemble the concrete `@effect/rpc` `RpcGroup` contract (`packages/contracts`) and the event-sourcing
command/event vocabulary (`packages/game-engine`) that the resolved domain tickets (attributes, match
engine, tactics, calendar, transfers, board objectives) imply. This is the capstone ticket that turns
the domain decisions into the actual typed boundary between Electron main and renderer, and the
event/projection schema persisted to SQLite. Its output is the technical contract section of the
final spec document.

## Answer

Three Deciders, not one global save-wide Decider: **Club Decider** (one stream per club, ×20/save —
Contracts, Transfer Budget, Wage Budget, Board Objective, Consecutive-Miss Counter), **Match Decider**
(one stream per Fixture — MatchStarted..FullTimeWhistle plus mid-match ChangeTactics/
MakeSubstitution), **Season/Calendar Decider** (one stream per save — Matchday counter, fixture
generation, Transfer Window open/close). League Table is a projection, not a Decider.

RpcGroup gives every player-invokable Command/query its own typed method (`bidForPlayer`, `getSquad`,
...), not a generic `submitCommand` envelope. `AdvanceCalendar` is the sole player-invoked command that
moves time forward; crossing a Matchday resolves the other 9 AI-vs-AI Fixtures synchronously and
instantly in the same request via an internal-only `SimulateAiFixture` command. AI clubs' transfer and
tactics activity reuses the human-facing Commands, self-issued internally rather than through RPC.

Live match resolution is **chunked resimulation**: a `ResumeSimulation` command simulates from the
current point to the next interaction opportunity (or full-time) in one response, still deterministic
from the `MatchStarted` seed; the renderer paces reveal client-side. No RPC streaming transport is used
anywhere in v1. Cross-Decider reactions (SeasonConcluded → BoardObjectiveJudged/ManagerWarned/
ManagerSacked across 20 Club streams) run as an **in-process synchronous reactor**, no outbox. Transfer
completion (`CompleteTransfer`) spans two Club streams in one SQL transaction, safe because every
stream lives in one local SQLite file.

Vocabulary in [CONTEXT.md](../../../CONTEXT.md) under "Technical contract", architecture rationale in
[ADR-0007](../../../docs/adr/0007-domain-bounded-deciders-and-chunked-match-resimulation.md).
