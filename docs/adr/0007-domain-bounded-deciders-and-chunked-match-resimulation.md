# Domain-bounded Deciders, typed RPC methods, and chunked match resimulation over streaming

We split the write side into three Deciders — Club (per club), Match (per Fixture), Season/Calendar
(per save) — rather than one global save-wide Decider or a Decider per fine-grained concept (splitting
Club further into Finance/Squad/Board). One global Decider would force every command handler to load
and reason about irrelevant state (a `ChangeTactics` command has no business touching Transfer Budget
invariants); splitting Club further buys nothing, since Contracts, Budgets, and Board Objective already
change together on a signing or a season-end judgment. League Table is deliberately not a Decider —
nothing commands it into existence, so it stays a projection folded from Match Decider events.

The RpcGroup gives every player-invokable Command and query its own typed method (`bidForPlayer`,
`getSquad`, ...), not a generic `submitCommand` envelope, matching t3code's `rpc.ts` pattern this
project mirrors and giving each command its own schema-validated success/error channel. Internal-only
commands — AI clubs acting for themselves, batch AI-fixture resolution, cross-Decider reactions — are
invoked directly in-process and never touch the RpcGroup, since only the renderer needs the IPC
boundary.

**Chunked resimulation, not RPC streaming, for live matches.** Mid-match `ChangeTactics`/
`MakeSubstitution` mean a match can't be fully pre-computed ahead of time, but the engine is cheap and
this is a local single-player app, so a `ResumeSimulation` command simulates from the current point to
the next interaction opportunity (or full-time) in one request/response, still fully deterministic from
the `MatchStarted` seed; the renderer paces reveal of the returned chunk client-side. A true streaming
RPC session was considered and rejected — it would add a second transport shape for one screen with no
benefit, since nothing here needs backend wall-clock pacing.

**Cross-Decider reactions are an in-process synchronous reactor, not an outbox.** `SeasonConcluded`
triggering `BoardObjectiveJudged`/`ManagerWarned`/`ManagerSacked` on 20 Club streams happens
synchronously within the same request that advanced the calendar. An outbox/async-worker split exists
to survive crashes or scale dispatch across machines; neither applies to a local Electron app with one
SQLite file, and synchronous reaction keeps `AdvanceCalendar`'s response the single point where "what
happened this Matchday" is fully known.

**Transfer completion spans two Club streams in one SQL transaction.** `CompleteTransfer` writes to
both the buying and selling club's streams atomically — a relaxation of strict one-aggregate-per-
transaction purity that's safe here specifically because every stream lives in the same local SQLite
file (single writer), which a distributed or networked event store wouldn't allow.
