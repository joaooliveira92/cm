# 04 — Screen 27: what survives of background processing

Type: grilling

Status: resolved

## Answer

Screen 27 is **entirely disposed**. Every section is classified against existing rulings and has a
ledger row in RECONCILIATION.md. The residue is empty:

- The candidate failure path (§2 "see why processing paused or stopped") is now implemented by
  `ContinueResultBand` in the career chrome (`ContinueResult.tsx:27-29`), which reports a `failure`
  kind with a message, a `Dismiss` button, and a red border — owned by continue-and-advance-time.
- §16 (locks, idempotency) is architecturally satisfied: the Calendar advance is a single idempotent
  command, not a multi-step transaction, and the single-flight guard in `CareerStateProvider.tsx`
  prevents a second press.
- §18 (local structured logging) is in scope and followed.
- Everything else (progress UI, task checklist, cancellation states, worker pools, memory budgets) was
  already disposed of by Screen 23's rows or the Group A inheritance.

Ledger status: **Audited**.
