# 01: The Regimen Pillar never reaches Condition or injury severity

**Status:** needs-triage

**Type:** bug

**Blocked by:** None. Triage after the [training-schedule-and-delegation](../../training-schedule-and-delegation/map.md) effort clears, or earlier on a fast-track branch. Kept independent of that effort's tickets 03 to 05 by the human's ruling of 2026-09-28.

## What's wrong

`CONTEXT.md` says the Regimen Manager Pillar "modifies the Condition lifecycle - in-match Condition
decay and between-match Condition recovery - and separately modifies resolved injury severity". At
HEAD none of the three happens:

- `regimenDecayModifier` and `regimenRecoveryModifier` are defined in the shared Pillar rules and
  called nowhere.
- Between-match recovery applies the fixed seven-day step with Natural Fitness and injury Severity
  only; it reads no Pillar.
- Match start snapshots the manager's Pillars into the `MatchStarted` event, but the match engine
  never reads the snapshot, so in-match decay and the severity cutoffs ignore Regimen.

A manager who spends Pillar points on Regimen at career creation gets nothing for them. The
[Manager Pillar Bindings](../../../.agents/notes/proposed/feature/2026-08-29-manager-pillar-bindings-v1.md)
note forbids exactly this: "A player must never read a delayed Pillar as an inert one", and "Storing,
displaying, or describing a Pillar does not count."

## Expected

The two Regimen Bindings from that note:

1. **Condition:** in-match decay is multiplied by the decay modifier, and between-match recovery by
   the recovery modifier, for the human club; AI clubs sit at the neutral value 3.
2. **Injury severity:** the severity cutoffs shift with Regimen.

Directional invariants from the note: higher Regimen never increases decay or reduces recovery, and
lower Regimen never prevents participation or recovery entirely.

## Replay and existing careers

The Pillar snapshot already sits in every `MatchStarted` event, so replay can apply it
deterministically. A career whose manager has Regimen 3 plays exactly as before, because 3 is neutral.
Saves are disposable during development, so no migration is owed to careers with other values.

## Acceptance criteria

- [ ] In-match decay reads the snapshotted Regimen, and a replayed match produces the same Condition trace.
- [ ] Between-match recovery for the human club is multiplied by the recovery modifier; AI clubs recover at neutral.
- [ ] Severity cutoffs read Regimen, per the Bindings note.
- [ ] At Regimen 3, Condition and severity are identical to before the fix.
- [ ] Tests pin both directional invariants at Regimen 1 and 5.
- [ ] When the training schedule's recovery modifier (training-schedule-and-delegation 04) has shipped, the two multiply, and the schedule's band stays inside Regimen's.

## Comments

**2026-09-28, finding while filing:** Regimen is not the only unwired Pillar. `tacticalAcumenModifier`,
`influenceThresholdModifier` and `technicalCoachingModifier` are also called nowhere, and the
Bindings note is still `proposed`. All five Bindings appear unshipped. This ticket stays scoped to
Regimen as ruled; whether the other three become tickets is a separate triage call.
