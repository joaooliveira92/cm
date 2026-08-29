# Agent Note: Scouting Progress accrual & Attribute Range computation

Status: proposed

## Problem

The Scouting milestone needs a concrete formula for how Scouting Progress advances over time and how
Attribute Range (the fogged display of an Attribute, Potential Ability, Injury Proneness, or Transfer
Value below Fully Scouted) is computed from it: what the per-Matchday Progress increment is and
whether it tapers near 100; whether every Attribute narrows at the same rate or some categories reveal
faster than others; whether Potential Ability and Injury Proneness follow the same curve as visible
Attributes or unlock at a separate threshold; and how Attribute Range composes into Transfer Value's
existing derivation.

## Proposal

**Progress accrual** is linear: a fixed number of points per elapsed Matchday while a Scout is
actively assigned, up to 100 (Fully Scouted). The exact per-Matchday increment is a tuning constant,
not fixed here — same treatment as Scout-count-per-Stature-Tier ([Agent
Note](2026-08-28-scout-resource-and-assignment-model.md)).

**Attribute Range** uses one shared noise-band formula for every Attribute (Technical, Mental,
Physical, Goalkeeping, and the hidden Potential Ability/Injury Proneness alike) — no per-category
reveal-rate distinction:

```ts
band = maxWidth * (100 - Progress) / 100
range = [clamp(trueValue - band, 1, 100), clamp(trueValue + band, 1, 100)]
```

`maxWidth` is a tuning constant, paired with the per-Matchday increment. The band shrinks linearly to
0 at Progress=100 (Fully Scouted), matching the linear accrual curve, and is clamped to the Attribute's
valid domain [1,100] at render time so a true value near either end never shows a range outside the
scale. Potential Ability and Injury Proneness narrow on this identical curve — no separate reveal
threshold.

**Transfer Value's range** reuses the existing exact-figure `transferValue(overall, age,
potentialAbility)` formula (`packages/shared/src/transfers.ts`) unchanged, evaluated twice at the two
ends of the fogged inputs' bounds. Age is exact (derived from `dateOfBirth`, not an Attribute, so never
fogged). Overall Rating and Potential Ability are the two fogged inputs:

- Low bound: `transferValue(overallRatingAtLowBound, age, potentialAbilityAtLowBound)`
- High bound: `transferValue(overallRatingAtHighBound, age, potentialAbilityAtHighBound)`

where `overallRatingAtLowBound`/`AtHighBound` recompute `overallRating`/`positionRating`
(`packages/shared/src/ratings.ts`) from every visible Attribute's low/high Range bound respectively,
and `potentialAbilityAtLowBound`/`AtHighBound` are Potential Ability's own Range bounds. Low pairs with
low, high with high — the formula is monotonic increasing in both Overall Rating and the PA-gap, so
this ordering guarantees `transferValueLow <= transferValueHigh` without needing to check every
cross-combination.

No new persisted primitive: `maxWidth` and the per-Matchday increment are code-defined constants in
`packages/shared`, the same "wide table, derived ratings never stored twice" posture ADR-0001 already
prescribes for `position_weights` — Scouting Progress remains the only new persisted primitive this
milestone introduces.

## Alternatives considered

- **Tapering accrual** (diminishing returns approaching 100): rejected — never cleanly reaches exactly
  100 without an arbitrary snap-to-100 rule, and complicates Fully Scouted as a clean terminal state
  rather than an asymptotic limit. Linear also mirrors the existing per-Matchday precedent
  (`recoverClubFitness`'s flat `RECOVERY_DAYS_PER_MATCHDAY` step in `season.ts`).
- **Per-category noise-band rates** (Physical narrows faster than Mental, etc.): rejected — doubles the
  tunable surface (accrual rate plus a category→rate table) for a flavor distinction that doesn't
  change any decision the manager makes differently, since bids stay legal regardless of scouting
  state. Same "adds a lever this milestone doesn't need to earn its scope" reasoning ticket 01 used to
  reject Scout-stacking.
- **Separate reveal threshold for Potential Ability/Injury Proneness**: rejected — Injury Proneness has
  no current formula consumer at all (excluded from every rating weight table), and Potential Ability's
  only visible effect is through Transfer Value's range, which is already fogged pre-Fully-Scouted
  regardless of when PA specifically resolves. A second threshold buys no new observable behavior.

## Acceptance criteria

- Scouting Progress advances by a fixed per-Matchday constant while a Scout is assigned, reaching
  exactly 100 after a fixed number of Matchdays, never exceeding it.
- Every Attribute's displayed Range (visible Attributes, Potential Ability, Injury Proneness) uses the
  same `band = maxWidth * (100 - Progress) / 100` formula, clamped to [1,100].
- Transfer Value for a not-Fully-Scouted player renders as a low/high range computed by evaluating the
  unmodified `transferValue()` formula at the Attribute Range's low and high bound sets respectively.
- At Progress=100, every Range collapses to the exact stored value and Transfer Value renders as a
  single figure, identical to the own-squad view.

## Risks

- A single shared `maxWidth`/accrual-rate pair means there's no way to make specific Attributes reveal
  faster or slower without a follow-on change to introduce per-category rates — accepted as a
  deliberate scope cut (see Alternatives), not an oversight.
- Recomputing Overall Rating twice (at low and high Attribute-Range bounds) per Transfer-Value-range
  render doubles that computation's cost versus the exact-figure path; acceptable at this codebase's
  data volume per ADR-0001's existing "cheap relative to SQLite's row scan cost" reasoning, since it's
  the same class of on-read recomputation already accepted for ratings.
