# Agent Note: Revealed play is immutable

Status: proposed

Settles four decision requests at once — group-g 01, 04, 05 and 08 — because they are four symptoms of
one missing rule.

## Problem

A live match is watched through a reveal: the engine has simulated ahead, and the manager sees
Commentary Lines up to some position. Nineteen follow-up tickets in `group-g-match-day` circled the
same defect in different clothes, and each was patched locally without the rule being stated:

- **The engine puts dismissed players back on the pitch.** `ChangeTactics` sets
  `team.resolved = resolveTeamTactics(command.tactic)`, rebuilding all eleven slots from the command, so
  any live tactics change after a red card resurrects the sent-off player (request 01). Since ticket 22
  the disagreement is *visible*: the "Playing with 10 men" alert stays up while the simulation is back
  to eleven.
- **Any squad player may come on.** `applyCommand` accepts any player not currently on the pitch,
  including one already substituted off or sent off. `Tactic.bench` is never read, so "substitutes"
  means one thing in `SelectionSummaryView` and another in the engine (request 04).
- **A restart replays from kickoff.** The revealed position lives in renderer module state
  (`renderer/match/session.ts`), so it survives leaving Match day but not closing the app. After a
  restart the feed replays, and a command raised during the replay is stamped at the replay minute —
  rewriting play the manager watched before the restart (request 05).
- **A command re-simulates the minute it was given in.** Commands are stamped at the revealed minute M,
  and the engine applies scheduled commands at the *start* of M, so minute M is re-simulated after its
  lines have been shown. A goal or injury the manager already saw can disappear (request 08).

Each was treated as a bug. Together they say nobody had written down what the reveal guarantees.

## Decision

**What the manager has been shown is a fact about the match. Nothing may change it.**

Four consequences, one per request:

1. **A live `ChangeTactics` changes only the three Team Instructions** — Mentality, Tempo, Pressing. It
   does not rebuild the line-up. Who is on the pitch is owned by substitutions, red cards and injuries.
   *(Request 01, Option A.)* The live UI already treats formation as fixed and the main-process fold
   `pitch.ts` already assumes this; the engine is the last holdout.
2. **A substitution may bring on only a player named on the Tactic's bench who has not yet played.**
   Re-entry of anyone substituted off, sent off or forced off is refused, for a manager's substitution
   and a forced injury one alike. *(Request 04, Option A.)* This gives the bench on the team sheet a
   reason to exist and makes `SelectionSummaryView` and the engine mean the same thing by
   "substitutes".
3. **The revealed position is durable.** It is persisted with the match session, so reopening the app
   mid-match continues from the Commentary Line the manager had reached. *(Request 05, Option A.)* This
   promotes a presentation cursor to saved state and needs a migration — which is why it could not be
   decided inside a bug fix.
4. **A command takes effect at M+1**, the minute after the last revealed event, never at M. *(Request
   08, Option A.)*

Point 4 is the structural one and deserves its reason stated plainly. Request 08's Option B — keep
stamping at M, then discard the buffered lines and reset the cursor so the feed re-syncs — makes the
symptom invisible while leaving revealed play mutable. It papers over the violation. Stamping at M+1
makes the guarantee impossible to break: a command cannot reach a minute that has already been shown.
The cost is that an instruction is felt a minute later than the manager might expect, which is a
smaller price than a feed that cannot be trusted, and is arguably truer to a touchline anyway.

Points 1, 2 and 4 change what a seed produces, so they are **engine-rule changes and gated on
[ticket 31](../architecture/2026-09-19-committed-matches-store-their-timeline.md)** — a committed match must store its
timeline before any of them lands, or every saved match holding a `TacticsChanged` after a dismissal
silently rewrites itself.

Decided by the agent on 2026-09-19 under the human's standing delegation ("i need you to solve the
decisions"), adopting the recommendation each request carried.

## Alternatives considered

**Let the engine stay authoritative and make the renderer follow it** — the pre-ticket-22 behaviour,
where the head-count tracked the engine and the "10 men" alert cleared because the dismissed player had
genuinely been put back on. Rejected: it is self-consistent and it makes a red card meaningless.

**Request 08 Option B, realigning the feed after each command.** Rejected above. It is also strictly
more code than Option A for a weaker guarantee.

**Request 04's permissive reading — any squad player may come on.** Rejected: it contradicts a shipped
contract type, and unlimited re-entry removes the cost of a substitution.

**Request 05 Option C — replay from kickoff and accept the rewrite.** Rejected: it makes the feed
unreliable exactly when a manager resumes, which is the moment they are most likely to be relying on
what they remember.

## Consequences

- **Blocked behind ticket 31**, along with tickets 26 and 29 and request 06's fix. The backfill is the
  gate on all of it.
- **`Tactic.bench` gains its first engine reader**, which means a Tactic saved with an empty or stale
  bench must be handled — a team sheet with no bench can make no substitution, and that has to be a
  readable state rather than a crash.
- **A migration** for the persisted revealed position (point 3) — **provisional**: no migration
  mechanism exists, per
  [saves have no migration path](../architecture/2026-09-19-saves-have-no-migration-path.md). Points 1,
  2 and 4 are unaffected; they are engine rules, not persistence. **Settled 2026-09-21:**
  [saves are disposable during development](../../implemented/architecture/2026-09-21-saves-are-disposable-during-development.md),
  so the persisted position needs a schema change and no migration; older saves are refused on open.
- **Screen 97 spec §17 becomes satisfiable.** "Dismissed and injured-player constraints are explicit"
  could not be honoured while the engine reversed dismissals.
- **Four decision requests close**, and the nineteen-ticket pattern behind them should stop: a defect
  of this family is now a violation of a stated rule rather than a fresh discovery.
