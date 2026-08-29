# Which Manager Pillar effects bind in v1

Type: grilling
Status: resolved
Blocked by: 01

## Question

The four pillars claim roughly fifteen distinct effects between them. Most have nothing in the
codebase to attach to. Decide which effects are **real in v1**, which are declared out of scope, and
which require a prerequisite system that this effort will not build.

Charting-time survey of what each claimed effect can bind to today:

| Pillar | Claimed effect | Surface in codebase |
|---|---|---|
| Tactical Acumen | tactical knowledge / flexibility | tactics exist (`main/tactics.ts`, `shared/tactics.ts`) |
| Tactical Acumen | scouting evaluation | Scouting is mid-design (`.scratch/scouting/`), unbuilt |
| Tactical Acumen | opponent analysis | nothing — no opponent-scouting or pre-match report |
| Man-Management | board negotiation | partial — `manager_status` board objectives exist, negotiation with the board does not |
| Man-Management | transfer negotiation | exists (`main/transfers.ts`, `main/aiClubs.ts`) |
| Man-Management | loyalty / motivation / dressing-room harmony | nothing — no morale system at all |
| Man-Management | media handling | nothing — no press conferences |
| Regimen | fitness training / squad stamina | Condition and Natural Fitness exist (`game-engine/src/match/condition.ts`) |
| Regimen | injury exposure from overwork | injury system mid-design (`.scratch/injury-system/`) |
| Regimen | disciplinary style / fines | nothing |
| Regimen | coaching workload | nothing — no coaching staff entities |
| Technical Coaching | technical development | Player Development is shipped; Training Focus is spec'd (`.scratch/training/`) |
| Technical Coaching | youth promotion | nothing — no youth or reserve squads |

Open questions:

- Which of these bind in v1? A defensible minimum is the four rows with real surfaces: tactics,
  transfer negotiation, Condition/stamina, and Player Development / Training Focus — one binding per
  pillar, so every pillar matters and no pillar is decorative.
- For each unbound effect: **cut**, or **deferred behind a named prerequisite system**? These are
  different answers with different consequences for the spec, and the distinction should be recorded
  per effect, not in bulk.
- A pillar that binds to exactly one system is fragile — Man-Management binding only to transfer
  negotiation means a manager who does not trade is unaffected by their strongest pillar. Is one
  binding per pillar enough, or does v1 need a second binding somewhere to make the choice felt?
- **Does the archetype choice matter before the first match?** The map's destination ends at the
  first match. If every binding pays out over a season, the archetype is an onboarding choice with no
  onboarding-visible consequence. Is that acceptable, or does at least one binding need to be legible
  immediately?
- Coordination: three of the candidate bindings reach into efforts that are themselves mid-design
  (Scouting, injury system, Training). Does this map hand them a constraint, wait on them, or specify
  around them?

> **Survey correction (found while resolving).** The table above is wrong about two efforts.
> `.scratch/training/` is **shipped** (all five tickets resolved; `TRAINING_FOCUS_MULTIPLIER` live in
> `packages/shared/src/training.ts`) and `.scratch/injury-system/` is **shipped**
> (`packages/game-engine/src/match/injury.ts`, wired through `simulate.ts`/`match.ts`/`squad.ts`/
> `season.ts`). Only Scouting is genuinely in flight. This collapsed the ticket's scarcity premise —
> see the Answer.

## Binding constraints from ticket 01

Ticket 01 renamed two pillars and fixed the scale semantics. Both are **acceptance constraints on
this ticket's answer**, not balance guidance to weigh:

- **Pillar names** are now Tactical Acumen, Man-Management, **Regimen** (was Training Intensity), and
  Technical Coaching. The table above is updated; see [CONTEXT.md](../../../CONTEXT.md) for why
  "Training Intensity" and "Conditioning" both had to go.
- **The threshold model.** 1 = severe deficiency / high-risk attempt, 2 = limited but usable, 3 =
  normal professional outcome, 4 = strong outcome, 5 = exceptional. **A 3 must mean normal
  professional competence, not mediocrity.**
- **No soft locks.** A pillar of 1 is severe and campaign-defining but must never disable a
  management system. Bindings modify probability, magnitude, available approaches, information
  quality, risk, cost, recovery time, or duration - they must not ordinarily act as absolute
  permission gates, and every essential club-management action must remain possible at every value.
- **Do not concentrate desirable outcomes behind 4+.** If most worthwhile options gate at 4 or 5,
  a legal `3/3/3/3` creation becomes a trap regardless of how the scale is described. Specialists buy
  peak performance with vulnerability; generalists buy reliability with a lower ceiling. The
  generalist must be safer, never merely worse.
- Because the creation UI offers 1 as a legal choice, any binding that could invalidate a campaign at
  1 makes the creation screen false agency. That is the test each proposed binding must pass.

Full rationale: [Agent Note: Manager Pillars & archetype set](../../../.agents/notes/proposed/feature/2026-08-29-manager-pillars-and-archetypes.md).

One question in the list above is now sharper: **the fourth archetype, The Academy Head (2/4/1/5),
peaks Technical Coaching**, the pillar with the strongest existing surface (Player Development ships;
Training Focus is spec'd). If any pillar binding is cheap to make real in v1, it is that one.

## Answer

**Five Bindings on shipped systems only; Man-Management renamed to Influence; every other claimed
effect cut except Scouting.** See [Agent Note](../../../.agents/notes/proposed/feature/2026-08-29-manager-pillar-bindings-v1.md).
