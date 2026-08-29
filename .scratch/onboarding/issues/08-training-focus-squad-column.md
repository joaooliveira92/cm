# 08: Training Focus squad column

**What to build:** An editable per-player Training Focus column on the Squad screen. **None** is a first-class named selectable value, never shown as blank or unset, and never a readiness blocker. The offered option set per player contains only Categories capable of affecting that player's development (Goalkeeping withheld for outfielders); the command boundary rejects ineligible Focuses with a typed error. Updates render the persisted value (never optimistic). A Term Disclosure explains that Player Development resolves once at season conclusion using the Focus set at that moment, with no duration or partial credit; no copy promises improvement. The Technical Coaching clause is gated on its own implementation landing first.

**Decisions:**

- Training Focus becomes an editable per-player column on Squad, owned by onboarding, and a Manager Pillar Binding must be player-reachable to satisfy the creation contract. See [Agent Note](../../../.agents/notes/proposed/feature/2026-08-29-training-focus-squad-column.md).

**Blocked by:** 05 (Squad screen exists, arrival established)

**Status:** ready-for-agent

- [ ] Squad renders an editable per-player Training Focus column; no Training screen or subordinate route; locked six-screen list unchanged
- [ ] None displayed as a normal selectable value; never blank, "--", "Not set", or "Choose a Focus"
- [ ] Training Focus never appears in readiness blockers, completion requirements, or action-required indicators
- [ ] Offered option set per player contains only Categories with developable Attributes for that player; Goalkeeping absent for outfielders
- [ ] Command boundary rejects ineligible Focus with typed error (e.g. `TrainingFocusNotApplicable`)
- [ ] Cell renders `TrainingFocusView.focus` after success; holds last authoritative value while pending
- [ ] Failure preserves/reloads last value and shows typed persistent feedback at the control; `SaveSackedError` delegated to career-outcome handling
- [ ] Term Disclosure states timing: resolves once at season conclusion, sets Focus at that moment, no history or partial credit
- [ ] Technical Coaching clause omitted until Pillar is authoritative in the resolver
- [ ] No copy promises improvement, faster growth, guaranteed development, or optimal Focus
- [ ] Accessible names carry affected player identity
- [ ] Canonical labels in exhaustive typed registries in `packages/shared`
- [ ] Both Training corrective obligations (orphaned-Attribute allocation, Focus-accelerated decline) recorded in `.scratch/training/`
- [ ] Tests: eligibility filtering, command-boundary rejection, sacked delegation, confirmed-on-write rendering at main-process seam