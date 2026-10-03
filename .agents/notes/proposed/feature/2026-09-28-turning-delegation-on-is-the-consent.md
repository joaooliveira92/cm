# Agent Note: Turning delegation on is the manager's consent to automatic schedules

Status: proposed

## Problem

Spec 106 §11 says recommended schedules "never submit automatically. One accepted preview creates
one draft revision." Standing delegation writes a new schedule before each Fixture that the manager
never previewed, which reads as a breach of that clause.

## Proposal

Turning delegation on is the conscious choice §11 asks for. It covers every microcycle until the
manager turns it off, and the assistant's writes are revisioned like the manager's own.

- Every schedule the assistant writes raises a News Message, attributed to the assistant by name,
  naming the template and the reason in one sentence.
- The assistant never overwrites a schedule the manager edited. Editing requires taking the schedule
  back first, and taking it back turns delegation off.
- §11 still governs everything else: a template applied by the manager, or any other recommendation,
  only fills a draft and never saves on its own.

Spec 106's §11 gains a sentence stating this exception when delegation ships.

Ruled by the human on 2026-09-28.

## Alternatives considered

- **The assistant proposes, the manager accepts each time.** Rejected: the manager must still act
  before every Fixture, which is the chore delegation exists to remove.

## Acceptance criteria

- No schedule is written automatically while delegation is off.
- Every automatic write produces exactly one News Message.

## Risks

- A manager who delegates and ignores the inbox can be surprised by a heavy week. The News Message and
  the schedule screen's "Planned by" line are the mitigation.
