# Agent Note: Infrastructure failures are defects; domain failures are typed

Status: proposed

Settles group-l decision request 01. It closes a defect class that shipped three times in consecutive
commits, which per [AGENTS.md](../../../../AGENTS.md) is the signal to route a finding into tooling rather
than fix it again in place.

## Problem

`SqlError` sits in the error channel of roughly **50 of the ~70 RPC handlers and is declared by none of
them**. The consequence is concrete and was found three times: the server fails to encode the error
against the method's schema, logs "RPC error did not encode with the method's error schema", and
re-raises — so the renderer gets an unusable error.

`typecheck` cannot see it because handlers are typed `Effect<unknown, unknown>`. Group L ticket 05
audited every method in `AppRpcs` by typing the handler map against each declared error schema and
reading what `tsc` rejected: **11 mismatches, 8 fixed**. `ManagerProfileNotFoundError` was schema'd and
raisable while named by no union at all.

The same question governs four main-process `Data.TaggedError`s with no contract schema, undeclared on
`createSave`, `commitCareer`, `advanceCalendar` and `commitMatchday`: `CalendarSlotsExhaustedError`,
`FixtureGenerationError`, `SquadTooSmallError`, `FullTimeWhistleMissingError`.

## Decision

**Two rules, drawn on one line: can the player do anything about it?**

### 1. An infrastructure failure is a defect

`SqlError` gets an **infrastructure escape hatch in the handler type** — declared once, not spread across
50 domain contracts. *(Option B, now.)*

This is the immediate move because it makes the compiler enforce what two consecutive reviews caught by
hand. It is small, reversible, and it closes the detection gap today. Group L ticket 05's own conclusion
was that the permanent gate is the audit probe as a type alias, blocked only by `SqlError` — so this
unblocks that gate too.

**And the premise behind Option A is settled here rather than left open: an unreadable save is a
defect.** There is no recovery action a manager can take, nothing to present, and no branch a caller
could usefully write. So `Effect.orDie` at the `withExistingSave` seam is the intended end state, filed
as its own follow-up. The request declined to decide this on the grounds that it should not ride along
inside a tooling change, and that sequencing is right — but the answer does not need to wait, and leaving
it open is how B becomes permanent by accident.

### 2. A domain failure is typed, and three of the four engine errors are not domain failures

| Error | Ruling | Why |
|---|---|---|
| `SquadTooSmallError` | **Domain error.** Gets a contract schema and joins the unions that can raise it. | A manager can hit this and can act on it — sign a player, promote from the reserves. It is a state of the world, not a broken invariant. |
| `CalendarSlotsExhaustedError` | **Defect.** `orDie`. | The generator could not fit the fixtures it was asked to fit. Nothing the manager did caused it and nothing they can do fixes it. |
| `FixtureGenerationError` | **Defect.** `orDie`. | Same. |
| `FullTimeWhistleMissingError` | **Defect.** `orDie`. | An engine invariant violation: a match that ended without ending. |

The test is not severity, it is agency. An error the player can respond to belongs in the contract so the
screen can present it; an error that means the program is wrong belongs nowhere near a union, because a
caller branching on it has nothing useful to do.

Decided by the agent on 2026-09-19 under the human's standing delegation ("i need you to solve the
decisions"), adopting the request's recommendation for `SqlError` and settling the four engine errors it
asked to have settled in the same place.

## Alternatives considered

**Declare `SqlError` on every union that can raise it (Option C).** Rejected, as the request recommended:
it spreads an infrastructure failure across ~50 domain contracts for no player-visible benefit, and every
one of those unions then carries a member no screen will ever branch on.

**`Effect.orDie` immediately, skipping the escape hatch (Option A alone).** The cleaner end state, and
rejected only on sequencing — it is a behaviour change at a seam 50 handlers pass through, and the
escape hatch closes the detection gap without one. Doing B first means A lands with the compiler already
watching.

**Treat all four engine errors the same way**, either all typed or all `orDie`. Rejected: it is the
convenient answer, not the true one. `SquadTooSmallError` is a thing that happens to managers; the other
three are things that happen to programs.

## Consequences

- One escape hatch in the handler type; `SqlError` leaves the contracts.
- **Group L ticket 05's permanent gate unblocks** — the audit probe becomes a type alias, so a narrow
  error union becomes a compile error instead of a review finding. That is the outcome AGENTS.md asks for
  when a finding recurs.
- `SquadTooSmallError` gains a schema and joins `createSave`, `commitCareer` and any other union that can
  raise it.
- Three engine errors get `orDie` at their raise sites.
- A follow-up ticket for `Effect.orDie` at the `withExistingSave` seam, now with its premise decided
  rather than open.
- An `effect-lint` rule was correctly rejected for this by ticket 05 — the needed fact is a type, not a
  syntax pattern. This note does not revisit that.
