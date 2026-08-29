# Which manager-pillar effects bind in v1

Type: grilling
Status: open
Blocked by: 01

## Question

The four pillars claim roughly fifteen distinct effects between them. Most have nothing in the
codebase to attach to. Decide which effects are **real in v1**, which are declared out of scope, and
which require a prerequisite system that this effort will not build.

Charting-time survey of what each claimed effect can bind to today:

| Pillar | Claimed effect | Surface in codebase |
|---|---|---|
| Tactical IQ | tactical knowledge / flexibility | tactics exist (`main/tactics.ts`, `shared/tactics.ts`) |
| Tactical IQ | scouting evaluation | Scouting is mid-design (`.scratch/scouting/`), unbuilt |
| Tactical IQ | opponent analysis | nothing — no opponent-scouting or pre-match report |
| Man-Management | board negotiation | partial — `manager_status` board objectives exist, negotiation with the board does not |
| Man-Management | transfer negotiation | exists (`main/transfers.ts`, `main/aiClubs.ts`) |
| Man-Management | loyalty / motivation / dressing-room harmony | nothing — no morale system at all |
| Man-Management | media handling | nothing — no press conferences |
| Training Intensity | fitness training / squad stamina | Condition and Natural Fitness exist (`game-engine/src/match/condition.ts`) |
| Training Intensity | injury exposure from overwork | injury system mid-design (`.scratch/injury-system/`) |
| Training Intensity | disciplinary style / fines | nothing |
| Training Intensity | coaching workload | nothing — no coaching staff entities |
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
