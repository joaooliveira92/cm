# Agent Note: The human Fixture's pre-match boundary

Status: proposed

## Problem

The game has no seam at which the human manager's League Fixture is played. The two halves of playing
a match are wired to different things and neither is the scheduled Fixture.

`advanceCalendar` calls `resolveMatchday` (`apps/desktop/src/main/season.ts`), which loops every
Fixture on the Matchday and calls `resolveFixtureScore` with no branch for the user's club. Pressing
Continue therefore simulates the human's League match headlessly and returns only
`resolvedMatchday: number` — no score for the player's club, no events, no timeline. Separately,
`startMatch` (`apps/desktop/src/main/match.ts`) takes an arbitrary `opponentClubId` from
`listOpponentClubs`, always seats the user at home, and never reads or writes the `fixtures` table.
The Match day screen is an exhibition friendly against a club of the player's choosing, while the real
League Fixture is a number produced by a button.

This blocks the onboarding effort at two points. [Continue as the global career
loop](../feature/2026-08-29-continue-as-global-career-loop.md) ruled that incomplete match preparation
must stop progression before the human's Fixture resolves, but specified that boundary without
establishing that a seam exists where the rule can execute: `advanceCalendar` resolves the Fixture
inside `resolveMatchday` and returns only afterwards, so there is no pre-resolution moment for a
readiness check to occupy. And the contextual-help decision cannot place an explanation against a
player-facing match surface whose existence is undecided.

A prior framing of this problem asserted that Match day and headless resolution use different match
engines. **That premise is false and is superseded here.** `simulateMatch`, `simulateMatchWithCondition`,
and `simulateMatchWithCounts` (`packages/game-engine/src/match/simulate.ts`) are thin projections over
one `runSimulation` implementation, and `deriveMatchEvents` (`apps/desktop/src/main/match.ts`) calls
`simulateMatchWithCounts` with the persisted setups. Given the same seed, team setups, and an empty
command journal, both paths produce identical events. The design question is therefore not a choice
between match engines. It is a choice between live event reveal and immediate result projection.

## Proposal

**Continue advances to the human club's scheduled Fixture and stops before resolving any of that
Matchday. The stop is the authoritative readiness gate. Once readiness passes, the player chooses Play
or Quick result; both run the same simulation through the same persisted match stream, and an explicit
idempotent completion command commits the human result and the remaining nine Fixtures in one
transaction.**

Onboarding owns this transition contract. The cm-clone match effort owns its implementation — changing
`startMatch` and `resolveMatchday`, binding Match day to a scheduled Fixture, and removing the
exhibition flow. This mirrors the ownership split already used for the Training UI: onboarding decides
the required player experience and the contract it must satisfy, and does not deliver the surface.

### Rejecting the stop-versus-preflight dichotomy

The problem was originally posed as a choice between an explicit match-entry boundary and headless
resolution guarded by preflight validation. That framing conflates two independent axes. The first is
whether the game stops before resolving the human Fixture. The second is how the player consumes the
match. The invariant that a human Fixture must not resolve while required preparation is invalid or
absent constrains only the first.

The game stops. Presentation is then a player choice at that stop.

A real stop is preferable to inline preflight inside `advanceCalendar` because it leaves the
application in stable, inspectable state: the Fixture is due, the Fixture is unplayed, the calendar has
not crossed it, and preparation may be examined and repaired. Inline preflight would require inventing
an artificial "advancement stopped" result type plus retry semantics, and would still have to answer
whether repeated Continue presses can resolve the match by accident. The boundary answers that
structurally by not having advanced.

### The Matchday resolves as a unit, after the boundary

A Continue press that reaches a Matchday containing the human club resolves **none** of that Matchday's
ten Fixtures. Transfer-window hooks may run, the pending Fixture is identified and recorded, and
advancement stops.

Resolving the nine AI Fixtures eagerly and holding only the human's was rejected on three grounds.
`current_matchday` is bumped only after the whole loop, so a partially resolved Matchday would leave
`nextCalendarBoundary` computing the same Matchday on the next press, re-resolving the nine and
requiring a guard that otherwise need not exist. `conditionAfterDays`
(`packages/game-engine/src/match/condition.ts`) closes a fraction of the gap to full Condition and is
therefore not idempotent, so `recoverClubFitness` must run exactly once per club per Matchday and a
re-resolution would recover eighteen squads twice. And the player would sit at their own pending
kickoff looking at a League table where nineteen clubs had played a Matchday they had not, which
`computeStandings` would faithfully report as an inconsistent `played` column.

Holding the whole Matchday makes the boundary a pure function of unresolved state, so repeated Continue
is structurally safe rather than safe by guard.

### Boundary state

Two nullable columns on `season` hold the boundary:

- `awaiting_fixture_id`, referencing `fixtures(id)` — the scheduled human Fixture the calendar has
  reached and cannot advance past.
- `awaiting_match_id` — the started match stream for that Fixture, once resolution begins.

`season.phase` stays `in_season` throughout. A new phase value was rejected: it would indicate only
that *some* Fixture is pending without identifying which, adding pending-action vocabulary to a season
lifecycle enum, and `LeagueTableScreen.tsx` renders `season.phase` directly through
`.replace("_", " ")`, so the value would leak to the player as literal text.

The pair distinguishes every reachable state. `(null, null)` is no pending Fixture. `(fixture, null)`
is the pre-match boundary with the match not started. `(fixture, match)` with no derivable
`FullTimeWhistle` is an in-progress match to be resumed. `(fixture, match)` with a derivable
`FullTimeWhistle` and the Fixture still unplayed is a finished simulation whose career consequences are
not yet committed. Anything else — a match id without a Fixture id, a linked Fixture already played, a
`PersistedMatchStarted` whose Fixture disagrees with `awaiting_fixture_id`, a match id with no start
event — is an integrity violation that must fail loudly. It must not be repaired heuristically by
picking the latest stream, clearing the columns, starting a replacement match, or reconstructing
linkage from timestamps.

`nextCalendarBoundary` gains a first branch: when `awaiting_fixture_id` is non-null it returns the
existing boundary and mutates nothing. This is what prevents a repeated Continue from closing the
Transfer Window again, re-running AI transfer activity, advancing the Matchday, or resolving a Fixture.

### `PersistedMatchStarted` marks resolution, not arrival

`PersistedMatchStarted` snapshots the seed and both teams' setups, so emitting it commits the match
inputs. It therefore cannot mark arrival at the boundary. It marks the accepted resolve command, after
readiness has passed authoritative validation and team setups have been loaded. `awaiting_fixture_id`
is the calendar boundary and the pending career obligation; `PersistedMatchStarted` is the start of
authoritative match resolution.

The successful start operation must atomically validate readiness, confirm the requested Fixture is the
pending one, confirm `awaiting_match_id` is null, derive the seed, emit `PersistedMatchStarted`, and
set `awaiting_match_id`. There must be no committed state in which a stream exists that the season
cannot locate, or in which `awaiting_match_id` points at a match whose start event was not persisted.

### Play and Quick result

Both modes share Fixture identity, readiness validation, seed policy, team setups,
`PersistedMatchStarted`, the Manager Pillar snapshot, `runSimulation`, event derivation, the completion
command, Fixture write-back, and Condition effects. Play reveals the timeline incrementally and may
append player commands to the journal. Quick result uses an empty command journal, runs immediately to
full time, and skips live reveal.

Quick result must not be described as a lightweight simulation, a simplified match, a fast engine, an
approximate result, or a secondary simulator. It runs the authoritative match simulation without
presenting the live timeline.

Quick result creates the same match stream rather than calling `resolveFixtureScore` as though the
human Fixture were an AI Fixture. Otherwise a presentation choice would determine whether a career
match has a stream at all, producing two classes of human match — fully inspectable and score-only —
and that distinction would leak into match history, replay, debugging, tactical feedback, Manager
Pillar explanations, future statistics, and save compatibility. Because the stream exists either way,
a quick-resulted match remains fully inspectable afterwards. Quick result means *do not make me watch
this now*, not *discard this match's history*.

### Completion is an explicit idempotent command

`resumeSimulation` is polled on a timer and is read-shaped. It must never acquire career mutation
because one poll happens to observe `FullTimeWhistle`; that would make durable state depend on polling
cadence, component lifecycle, timer behaviour, IPC retries, and whether the player is still on the
Match day screen. The simulation reaching full time and the career accepting that result are distinct
facts.

An explicit command keyed by Fixture identity commits both. It validates that the Fixture is the
pending one, exists, includes the human club, is not already played, has a `PersistedMatchStarted`, and
has a complete stream reaching `FullTimeWhistle`. It derives the human result from the persisted
stream and must not re-run the human simulation. It then, in one transaction: writes the human Fixture
result and its Condition write-back; resolves the other nine Fixtures with their Condition write-backs;
marks all ten played; persists `MatchdayResolved`; increments `current_matchday` once; and clears both
boundary columns. A rollback preserves both links and leaves the Matchday incomplete, so retry is safe.

Idempotency keys on the Fixture already being `played = 1`. A repeated call must not recover Condition
again, re-resolve the other nine, increment `current_matchday` again, emit another `MatchdayResolved`,
or produce a different score. Returning the committed result and returning a typed already-completed
outcome are both acceptable provided the contract is explicit; the invariant is exactly-once mutation.

### Readiness is derived, advisory on read, authoritative at the command

Readiness is never persisted. The durable boundary stores only the two columns. Reading the boundary
returns the pending Fixture, the opponent, the home or away role, and the currently derived blockers —
advisory, because the player may repair a blocker immediately afterwards. No readiness record needs
invalidating because none exists.

Both Play and Quick result recompute readiness authoritatively when resolution is requested, and reject
with a typed failure carrying the current blockers. Client-side disabled controls are a convenience,
never an integrity boundary: a stale, incorrect, or bypassed client must not be able to start an
invalid human Fixture. The blocker inventory itself is owned by the readiness-audit ticket, not here.

### Seed policy

The human Fixture's seed is derived deterministically from the Season seed recorded on `SeasonStarted`
and the Fixture id. The derivation must be pure, stable for a given season seed and Fixture, and
independent of application time, renderer state, and presentation mode. It must be centralised and
tested rather than duplicated between Play and Quick result. The seed is derived and recorded in
`PersistedMatchStarted` after readiness validation succeeds.

ADR-0002 grounds match reproducibility in the seed being *recorded* on `MatchStarted`, so the seed's
origin is otherwise unconstrained. Derivation is chosen over an arbitrary recorded draw to close a
save-scumming path: under a wall-clock seed, quitting a started match and restarting re-rolls the
result, making quit-and-retry-until-you-win the dominant strategy — something a new player can stumble
into in their first hours and never unlearn. Under a derived seed the match is the same match, and
outcomes change only through valid preparation before kickoff and commands issued during Play.
Derivation also removes the wall clock from the domain, which ADR-0004's dateless Calendar has already
done everywhere else.

Because the seed is a pure function rather than a value drawn from a mutable sequence, a rejected start
emits no `MatchStarted`, creates no stream, writes no `awaiting_match_id`, and cannot affect the seed a
later valid start receives. The question of whether a failed start consumes the seed dissolves rather
than needing an answer.

This replaces `Date.now() ^ hashString(matchId)` in `startMatch`. It must not be replaced by a fresh
arbitrary draw that merely happens to be recorded.

A deterministic Fixture seed does not entitle the player to abandon a started match and return to the
pre-match state. Once `PersistedMatchStarted` exists the frozen setups and recorded seed are
authoritative, and navigation or restart resumes that match.

### Fixture-bound Match day, and the removal of exhibition mode

`startMatch` becomes Fixture-bound: it takes the pending Fixture's identity and a mode, not an opponent
club. The Fixture supplies home club, away club, the human club's side, the Matchday, and the identity
used for result write-back. The player must not choose or override the opponent from Match day.

The free-opponent exhibition surface is deleted from v1 — `listOpponentClubs` as a Match day entry
mechanism, arbitrary `opponentClubId` selection, automatic seating of the user as home club, and
career-detached match starts that never write back to a scheduled Fixture. It always places the user at
home, so it cannot faithfully launch an away Fixture; it would force a new player to distinguish a
career Fixture from a free exhibition at exactly the surface where they should be preparing for their
first meaningful match; and a match that does not write back is a detached sandbox with no career
consequence. Once Match day represents the scheduled Fixture, arbitrary opponent selection contradicts
the screen's domain role rather than sitting harmlessly beside it.

Friendly or exhibition matches may return as a separate feature with explicit decisions about
scheduling, home and away designation, Condition and injury effects, statistics, career history,
cancellation, and competition separation. The current surface must not be preserved as an undocumented
shortcut in the meantime.

### Fallback Tactics are deleted, not narrowed

`synthesizeDefaultTactic` has exactly one caller, `loadTeamSetup`, which has exactly one caller,
`startMatch`. Once readiness guarantees the human club a real Tactic and `assignAiTactics` guarantees
all nineteen AI clubs theirs, it is unreachable and is deleted outright rather than retained as
defensive cover. `loadTeamSetup` builds a setup from the persisted Tactic and returns a typed error
when none exists.

`getTacticForClub` loses its `?? pickBestFormationTactic(squad)` fallback and returns a typed error
instead. `pickBestFormationTactic` itself is preserved, because `assignAiTactics` is its real caller.
The distinction that matters: generating and persisting AI Tactics at a defined initialization boundary
is a legitimate decision; discovering a missing Tactic at match start and silently synthesizing one is
not. A missing Tactic is an integrity failure, and the error should carry enough context to tell
whether it belongs to the human readiness path, failed AI Tactic initialization, or obsolete save data.

**This is stricter than the acceptance criterion in [Continue as the global career
loop](../feature/2026-08-29-continue-as-global-career-loop.md)**, which required only that the two
fallbacks no longer apply to the user's club. That criterion is superseded: the fallbacks are removed
for every club, because a fallback that fires is indistinguishable from one that does not, which is
precisely how the human club came to be silently assigned a machine-picked Tactic without anyone
noticing until an audit. That note remains authoritative on everything else it decides.

The compatibility consequence is accepted: development saves written before `assignAiTactics` shipped
will fail loudly at Matchday 1 rather than limping. The product is unreleased, and preserving those
files does not justify behaviour that silently undermines the principal onboarding invariant. If
migration is useful it belongs in an explicit development migration or save-reset policy, not in
runtime match behaviour.

### The first Continue is not decomposed

A fresh save is `current_matchday = 0, phase = 'pre_season'`, so the first Continue press closes the
pre-season Transfer Window, runs `runAiTransferWindow`, and reaches the Matchday 1 boundary. It must
not resolve the human Fixture, but it is not otherwise split.

Adding calendar phases purely to reduce presentation density would require new calendar state, a new
stopping policy, new persistence behaviour, new recovery and replay cases, and possibly another press
before the player reaches their first match. The pre-match boundary already creates the division that
matters — what happened while time advanced, versus what must be decided about the upcoming match.

All consequences generated before the stop must remain available to the structured Continue-result
surface, which separates what happened, what is next, what remains unresolved, and what the player can
do. Play and Quick result stay unavailable there until blocking readiness passes. Specific AI transfer
activity may be stated only if an authoritative result exposes it; the renderer must not reconstruct
domain events by informal before-and-after comparison.

### AI Fixture determinism is out of scope

AI-vs-AI Fixtures draw an unrecorded `Math.random()` seed in `resolveFixtureScore` and persist only
their final score, discarding events. Their timelines cannot be reproduced from event history, so
ADR-0002's reproducibility guarantee covers only matches entering through `PersistedMatchStarted`.

This predates the onboarding effort and would exist without a pre-match boundary. It is a
whole-simulation determinism question and is recorded as unspecified rather than decided here. It is
distinct from ruleset versioning: seed persistence concerns recording simulation inputs, while ruleset
versioning concerns preserving the transformation applied to those inputs.

A rolled-back completion transaction may draw different AI seeds on retry. This does not threaten
exactly-once committed state, because the failed attempt commits no scores and no lasting Condition
changes, and no persisted record claims it occurred. The uncommitted attempt is simply not
reproducible, which this decision does not need to solve.

This work must not add nine AI seeds to `MatchdayResolved`, create streams for AI Fixtures, promise
replay for AI-vs-AI games, change ADR-0002's guarantee, or introduce ruleset versioning.

## Alternatives considered

**Headless resolution with preflight validation inside `advanceCalendar`.** Rejected: it satisfies the
invariant but requires inventing an "advancement stopped" result type, retry semantics, and an answer
to whether repeated presses can resolve the match accidentally — all of which a real stop obtains for
free by not having advanced. It also offers the player no benefit over stopping.

**Resolve the nine AI Fixtures on the Continue press and hold only the human's.** Rejected: it leaves a
partially resolved Matchday with `current_matchday` unbumped, so the next press recomputes the same
Matchday and re-resolves the nine, double-recovering eighteen squads through a non-idempotent
`conditionAfterDays`. It also shows the player a League table where nineteen clubs have played a
Matchday they have not.

**A new `season.phase` value such as `awaiting_human_fixture`.** Rejected: it records that some Fixture
is pending without naming which, mixes pending-action vocabulary into a season lifecycle enum, and
leaks as raw text through `LeagueTableScreen`'s direct rendering of `phase`.

**Locate the in-progress match by scanning match streams for one carrying the pending `fixtureId`,
rather than storing `awaiting_match_id`.** Rejected: it makes ordinary navigation back to Match day
cost a stream sweep, and it leaves "two streams claim this Fixture" representable. A column makes that
state impossible.

**Commit the Fixture implicitly when `resumeSimulation` first derives `FullTimeWhistle`.** Rejected:
`resumeSimulation` is polled and read-shaped, so career mutation would depend on polling cadence and
component lifecycle, and would invite double writes exactly where exactly-once is required.

**Resolve Quick result through `resolveFixtureScore` like an AI Fixture.** Rejected: cheaper, but it
makes a presentation choice determine whether the human's match has a stream, creating two classes of
career match whose difference leaks into history, replay, and future statistics.

**Keep a wall-clock or otherwise arbitrary recorded seed.** Rejected: ADR-0002 is satisfied either way,
but a re-rollable seed makes quit-and-retry-until-you-win the dominant strategy, which is worst
precisely for the new players this effort serves.

**Retain the Tactic fallbacks as robustness cover for older saves.** Rejected: a fallback that fires is
indistinguishable from one that does not, which is how the silent machine-picked Tactic survived to an
audit. Loud failure on unreleased development saves is the better trade.

**Preserve exhibition mode alongside Fixture-bound Match day.** Rejected: it cannot express an away
Fixture, has no career consequence, and forces a new player to distinguish two Match day modes at the
worst possible moment.

**Decompose the first Continue into additional calendar stops.** Rejected: it invents calendar state to
solve a presentation problem the pre-match boundary already solves.

## Acceptance criteria

- A Continue press reaching a Matchday containing the human club resolves zero of that Matchday's ten
  Fixtures and stops at a pre-match boundary.
- The boundary is persisted as `season.awaiting_fixture_id`; `season.phase` remains `in_season`; no new
  phase value is introduced.
- `season.awaiting_match_id` durably links the pending Fixture to its started match stream, and the
  start operation persists `PersistedMatchStarted` and the link atomically.
- Repeated Continue presses at the boundary mutate nothing, and pre-boundary hooks including Transfer
  Window processing do not re-run while `awaiting_fixture_id` is non-null.
- `PersistedMatchStarted` is emitted only after authoritative readiness validation succeeds, and marks
  accepted resolution rather than arrival at the boundary.
- Play and Quick result produce the same match stream shape; Quick result uses an empty command journal
  and differs only by presentation.
- Both modes derive the human Fixture seed from `SeasonStarted.seed` and the Fixture id, independent of
  wall-clock time, renderer state, and mode; a rejected start emits no event and creates no link.
- `resumeSimulation` never implicitly commits Fixture or Matchday state.
- An explicit idempotent completion command commits the human result and the remaining nine Fixtures,
  persists `MatchdayResolved`, increments `current_matchday` once, and clears both boundary columns —
  all in one transaction, with each Fixture result and each Condition recovery applied exactly once.
- The human result is derived from the persisted stream, never by re-running the human simulation.
- Match day derives its active match from authoritative season state rather than React component
  state; navigating away and returning, and restarting the application, both resume the same stream.
- A Fixture with an existing `awaiting_match_id` cannot be started again, and a started match cannot be
  abandoned through the normal career flow.
- Readiness is derived and never persisted, advisory in boundary reads, and recomputed authoritatively
  when Play or Quick result is requested, returning typed blockers when invalid.
- `synthesizeDefaultTactic` is deleted; `getTacticForClub` returns a typed error when no persisted
  Tactic exists; `pickBestFormationTactic` remains only for `assignAiTactics`; no match-start path
  manufactures a missing Tactic for any club.
- `startMatch` is Fixture-bound and takes the human club's home or away role from the Fixture; the
  free-opponent exhibition path is removed from v1.
- Contradictory boundary, stream, and Fixture states fail with typed integrity errors and are not
  repaired heuristically.
- The League table never exposes a partially resolved Matchday.
- No AI Fixture seed persistence is added, and no ruleset versioning is introduced.

## Risks

**The completion transaction is large and does the most consequential work in the game.** It writes ten
Fixture results, ten Condition write-backs, an event, and a calendar increment. A partial failure that
somehow commits leaves a Matchday in a state no code expects. The transaction boundary has to be real,
not merely intended, and the integrity checks around the boundary columns are the only thing standing
between a crash and a corrupted career.

**Deleting the Tactic fallbacks converts silent wrongness into loud failure across every match path.**
`resolveMatchday` currently loops all ten Fixtures with no club-identity branch. Done carelessly, this
turns a wrong-but-playable tactic into a crash on the first Continue — which is a better failure, but
only if the readiness gate genuinely prevents reaching it.

**Two nullable columns encode a four-state machine, and nothing in the schema enforces the
transitions.** A foreign key cannot express that the linked Fixture belongs to the current season and
Matchday, includes the human club, is unplayed while pending, and is the only pending human Fixture.
Those invariants live in application code, so they are only as good as the validation written around
them.

**The boundary makes Match day mandatory for the human's match, which is a larger product change than
it appears.** Every Matchday now requires an explicit player action to complete. Quick result mitigates
the friction, but a player who wants to advance several Matchdays quickly presses more buttons than
before, and no bulk-advance affordance is specified here.

**Deriving the seed from the Fixture makes the match immutable in a way players may find surprising.**
A player who loses badly cannot retry, and the game does not currently explain that. The anti-scumming
property is deliberate, but the absence of any explanation for it is a contextual-help problem this
decision hands downstream rather than solves.
