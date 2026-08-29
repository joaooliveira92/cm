# Where the human's League match is actually played

Type: grilling
Status: resolved

## Question

Ticket 06 fixed Continue's stop policy: a resolved human Matchday interrupts, and the Continue result
links to "the owning surface" for that match. **No such surface exists.** The two halves of playing a
match are wired to different things and neither is the League Fixture:

- `advanceCalendar` → `resolveMatchday` (`apps/desktop/src/main/season.ts`) loops every Fixture on the
  Matchday and calls `resolveFixtureScore` with **no branch for the user's club**. Pressing Continue
  simulates the human's League match headlessly and returns only `resolvedMatchday: number` — no
  score for the player's club, no events, no timeline.
- `startMatch` (`apps/desktop/src/main/match.ts`) takes an arbitrary `opponentClubId` from
  `listOpponentClubs` (any of the other 19 clubs), always seats the user at home, and never reads or
  writes the `fixtures` table. `match.ts:127` still says "ticket 15, in parallel, will supersede this
  with real fixtures." It did not.

So the Match day screen is an **exhibition friendly against a club of the player's choosing**, and the
real League Fixture is a number produced by a button. The seed doc's central loop — the match is the
thing Continue delivers you to — is not implemented, and ticket 06's stop policy cannot be specified
past the score until this resolves.

Open questions:

- **Does Continue stop *at* the human's Fixture and hand off to Match day, or resolve it and report
  the result?** Ticket 06's answer reads as the latter (`resolvedMatchday` interrupts *after* the fact),
  but its readiness rule — "stop before kickoff, do not resolve the match" — presupposes a kickoff
  boundary that exists before resolution. Reconcile these.
- **What becomes of `startMatch`'s free opponent choice?** Does it take a `fixtureId` and write its
  result back to `fixtures`, or does the exhibition mode survive alongside the League?
- If Match day plays the Fixture, **what resolves the other 9?** Presumably `resolveMatchday` minus
  the human's Fixture — confirm nothing else in the Matchday transaction depends on all 10 resolving
  together (standings, Condition write-back, transfer-window hooks).
- Is there a **quick-result** path for players who do not want to watch every match, and if so does it
  reuse the Match day simulation or the headless one? ~~The two are different code paths today
  (`simulateMatchWithCondition` vs `deriveMatchEvents` over a persisted `MatchStarted`).~~
  **Superseded — see "Corrected premise" below.**
- Does this belong to **onboarding at all**, or is it a cm-clone wiring gap this map should hand back?
  The destination is an onboarding spec, and a spec describing a Continue loop the code cannot perform
  is worthless — but the fix itself may not be onboarding's to own.

## Corrected premise: there is only one match engine

**Corrected after implementation audit.** This ticket originally asserted that Match day and headless
match resolution use separate simulators. That claim is withdrawn.

`simulateMatch`, `simulateMatchWithCondition`, and `simulateMatchWithCounts`
(`packages/game-engine/src/match/simulate.ts:625-651`) are thin projections over one `runSimulation`
implementation, and `deriveMatchEvents` (`match.ts:310-316`) calls `simulateMatchWithCounts` with the
persisted setups. Given the same seed, team setups, and an empty command journal, both paths produce
identical events. The only real divergences were the command journal and the seed source
(`Math.random()` at `season.ts:330` versus `Date.now() ^ hash(matchId)` at `match.ts:208`).

The design decision is therefore not a choice between match engines. It is a choice between live event
reveal and immediate result projection.

Two further audit findings that shaped the answer:

- Nothing in the Matchday transaction requires all ten Fixtures to resolve together. `resolveMatchday`
  is a plain loop, Condition write-back is per-fixture, `computeStandings` derives on demand from
  `played = 1`, and transfer-window hooks fire before the loop. Only the `MatchdayResolved` payload and
  the `current_matchday` bump span all ten.
- `matchId` exists only in React state — no `localStorage`, no schema column, no Fixture-to-match link
  — and `App.tsx:92` conditionally renders `MatchDayScreen`, so switching screens mid-match orphans the
  stream. This is a navigation problem, not only a crash-recovery one.

## Dependency correction: this ticket is not blocked by ticket 06

The `Blocked by: 06` line has been removed. The dependency runs the other way.

Ticket 06 established a behavioural requirement — invalid or incomplete match preparation must stop
progression before the human's Fixture resolves — but it specified that boundary without establishing
that the application has a seam where the rule can execute. `advanceCalendar` resolves the human's
Fixture inside `resolveMatchday` and returns only afterwards, so there is currently no pre-resolution
moment for a readiness check to occupy. **This ticket owns the prerequisite decision**: whether Continue
enters a distinct pre-match boundary, or whether `advanceCalendar` performs readiness preflight before
headless resolution.

Ticket 06's *intent* remains authoritative. Its *mechanism and implementation* are blocked by this
ticket's transition model.

## The binding invariant this ticket inherits

Moving ahead of ticket 06 does not reopen its ruling; it turns that ruling into a constraint on the
answers available here. Whichever model this ticket picks, it may not choose "resolve the human's
Fixture even when required match state is absent."

> A human Fixture must not resolve while required match preparation is invalid or absent. This ticket
> must identify the authoritative pre-resolution boundary or preflight operation at which that
> invariant is enforced.

Two models satisfy it, and the choice between them is this ticket's:

- **Model A — explicit match-entry boundary.** Continue advances to the human's Fixture, stops before
  kickoff, validates readiness, hands off to Match day, resolves, returns the result. Ticket 06's rule
  fits directly.
- **Model B — headless resolution with mandatory preflight.** Continue advances through the Fixture and
  resolves it automatically, but validation happens *before* resolution. This requires inventing one of:
  preflight inside `advanceCalendar`, a typed result meaning "advancement stopped before resolution", a
  separate readiness command preceding calendar advancement, or an orchestration that advances to
  kickoff without resolving.

Under Model B, "block crossing into the match" is not implementable as literally worded — the ticket
must supply the seam instead.

Carried forward unchanged from ticket 06:

- Continue must never resolve the human's match on a Tactic the player did not choose. Ticket 07 found
  **two** fallbacks to remove, not one: `pickBestFormationTactic` in `getTacticForClub` (`season.ts:199`)
  and `synthesizeDefaultTactic` in `loadTeamSetup` (`match.ts:71`), which disagree with each other —
  3-5-2 versus a hard-coded 4-4-2 for the same fresh squad. `pickBestFormationTactic` may lose only its
  *fallback use*; AI clubs still depend on it.
- Whatever surface owns the match must be reachable as a direct action from the Continue result.
- Ticket 07's readiness inventory stands as a catalogue of state, but **where each blocker is enforced
  is this ticket's call, not 07's**. Exactly one condition is unset-and-configurable at save creation
  (no Tactic / no starting XI); that is the only thing the seam has to enforce in v1.

## Transition-model questions to resolve

- Does Continue stop at the human's Fixture before resolution, or resolve and report?
- Is Match day mandatory or optional? Is the match resolved only after an explicit player action?
- Can the player leave Match day for other screens before kickoff, and return?
- Where is readiness validated, and what typed result represents blocked progression?
- Does `advanceCalendar` return a pre-match result in place of `resolvedMatchday`?
- If headless resolution survives, how does preflight prevent invalid resolution?
- What state records that the Calendar is waiting at kickoff, and how does retry work once the player
  fixes the blockers? Can repeated Continue presses resolve the match accidentally?
- **Which event freezes the kickoff snapshot?** `PersistedMatchStarted` (`match.ts:142-152`) is already
  that snapshot, and ticket 02 adds the Manager Pillar Distribution to it. Decide whether it marks
  *arrival at the pre-match boundary* or *the explicit command that begins resolution after readiness
  passes*. If emitting it commits the match inputs, it must not be emitted before the player has a
  valid setup.

See [Agent Note: Continue as the global career loop](../../../.agents/notes/proposed/feature/2026-08-29-continue-as-global-career-loop.md).

## Answer

**Continue stops at a persisted pre-match boundary before resolving any of the human's Matchday; the
player then chooses Play or Quick result, both running the same simulation through the same match
stream, committed by an explicit idempotent completion command.** See
[Agent Note](../../../.agents/notes/proposed/architecture/2026-08-29-human-fixture-pre-match-boundary.md).
