# Agent Note: Staff are two bound roles on the human's club, never a market

Status: proposed

## Problem

The project has no staff system. `CONTEXT.md` records staff generation as a "future slot, not a
modeled option", and [manager pillar bindings v1](2026-08-29-manager-pillar-bindings-v1.md) explicitly
**cut** the coaching-staff system from v1 on the grounds that no shipped system read it. The MVP world
data model reopens that: staff ship, with exactly two mechanical bindings — the Scout resource and
Player Development — and everything else about a staff member is presence.

Reopening it raises questions that the earlier cut never had to answer. What a Staff row holds, and
whether the attribute set comes from the two bindings or from the reference material's much longer
list. Which roles exist, given each must earn a binding. How a coach reaches Player Development
without putting a second multiplier on a term a Manager Pillar already owns. Whether staff carry
wages that count against Wage Budget, and whether there is a hiring market. Whether AI clubs have
staff, and what that costs at world scale. And what happens to a club in a `results-only`
competition.

## Proposal

**Exactly two roles ship: Coach and Scout.** Each has one binding and one stored number. No Physio,
Director of Football, or Assistant Manager: each would need a binding, and none has a system to bind
to.

### The Scout binding: quality drives accrual rate, not slot count

A Scout stops being an abstract fungible slot and becomes a person with a row and a stable id. The
club's scout headcount N still derives from Stature Tier via the existing tier-count table, and the
club has exactly N scout rows — so the N assignment slots *are* the N scouts, and the fungible-slot
concept disappears. `AssignScout(player)` becomes `AssignScout(scout, player)`.

An individual scout's quality sets the accrual rate of the assignments they hold. It does **not**
affect headcount. Slot count already has an owner in Stature Tier; giving it a second owner
double-books the term. The per-Matchday accrual constant, by contrast, is currently flat with nothing
varying it, so scout quality fills a genuinely empty term rather than competing for a full one.

Accrual is **strictly positive for every legal quality**, with the existing flat constant re-anchored
to mid quality (10). The invariant is reachability, not fairness: any assignment held long enough must
reach 100, or `Fully Scouted` becomes unreachable and Attribute Range never closes. A quality-1 scout
is punishingly slow — the intended texture of managing a small club — but never useless.

### The Coach binding: the passive baseline, never the focus multiplier

`developPlayer` has exactly two terms: `PLAYER_DEVELOPMENT_FRACTION`, the baseline every attribute
receives, and `TRAINING_FOCUS_MULTIPLIER` (~1.5x) on the focused Category. Technical Coaching, a
Manager Pillar, already scales the second and is explicitly forbidden from touching the first.

**The coach scales the passive baseline.** Each term then has exactly one owner, so the two-multipliers-
on-one-number smell is resolved by partition rather than by stacking. The fiction is also correct: the
Manager Pillar rewards the *decision* the manager makes (which player, which Category), while the coach
rewards *institutional* quality that lifts every player including ones the manager never focuses. It
leaves Technical Coaching's hard invariant (`TRAINING_FOCUS_MULTIPLIER * technicalCoachingModifier(v)
> 1.0` for every legal v) untouched, and it gives a coach a reason to exist at a club whose manager
sets no Training Focus at all.

**Hard invariant: `coachModifier(q) >= 1.0` for every legal q.** The modifier is floor-anchored at
quality 1, not centred at mid. AI clubs receive the baseline unmodified, so a centred modifier would
make a manager at a small club develop players more slowly than every AI club in the world — punishing
a decision they were never offered, since Q6 removes hiring. That is the soft lock the Pillar model
forbids, arriving by the back door. A big club's coach gives a lot, a small club's gives nearly
nothing, none gives less than nothing.

### One coach, N scouts

Exactly one coach per club, so the club's coaching term *is* that coach's quality and no aggregation
rule (best / mean / diminishing returns) is needed. Scouts number N from the Stature Tier table.

### The row: one generic quality column, static

A uniform `staff` table with a `role` discriminator, not scouts-as-rows plus coaching-as-a-club-scalar.
The asymmetric split saves exactly one derivation rule and costs a second concept — it would make
"staff" mean different things by role and foreclose ever showing the player a named coach, which is
precisely the presence staff are meant to carry.

Each staff member holds a **single generic `quality` column on the 1-20 scale**. One binding per role
means one number; a generic column keeps the table free of nulls-by-role; the 1-20 scale reuses the
player attribute scale rather than inventing a third. The reference material's spread of coaching
specialisms (attacking, defending, fitness, goalkeeping) would be dead columns here.

**Staff quality is static.** No staff development, no ageing curve. A second development curve to
maintain buys nothing when the value it moves is read by one formula.

Identity is a surrogate `StaffId` with `staff.name` stored directly — the players' treatment, not the
clubs'. The canonical-id rule is satisfied because the name is not the identifier, only an attribute
beside it. That rule exists for licensing, and staff are generated fiction, so routing their names
through a Content Pack would add indirection to protect a licence nobody holds. Names come from the
same generation machinery players use, which means the nationality and name-pool answer from the
player-provenance ticket applies here without a separate decision.

### No wages, no market: staff are a property of the club

Staff are **fixed at generation**. No wages, no hiring, no firing, no candidate pool. Quality derives
from Stature Tier with seeded variance, so two mid-tier clubs differ. `Contract` and `Wage Budget`
are untouched — both remain player-to-club concepts.

This follows the precedent Stature Tier already sets: it independently feeds Transfer Budget, Wage
Budget, and Board Objective, and now also scout headcount and staff quality. It makes *which club you
take* the decision that determines your backroom, which is a decision surface that already ships.

### Staff exist only for the human's club

**AI clubs have no staff rows at all.** Row cost is not the argument — a handful of staff per club is
noise against 400k players. The argument is the repo's own discipline that a stored value nothing
reads is not a real thing: neither binding reads an AI club's staff, because AI clubs never scout and
AI players use unmodified Player Development, and both of those are shipped decisions.

The consequence is that staff are generated for the human's club, not at world generation, so this
decision adds **nothing** to world-generation cost.

Staff are a deterministic function of the world seed and the club's canonical id, materialised lazily
the moment a club becomes human-managed. A club's backroom must be identical whether the manager takes
it at save creation or five seasons after a sacking: it never depends on arrival time or career
history. The exact derivation call belongs to the generation ticket, which owns seed derivation and is
already replacing the name-keyed `deriveSeed(worldSeed, "club", name)`. Rows for a club the manager has
left are retained rather than deleted — harmless, and the derivation then never runs twice for one club.

### Simulation Depth needs no branch

**Invariant: a staff row exists only for a club that is or has been human-managed.** A `results-only`
club has no staff for the same reason no AI club anywhere does, not for a depth-specific reason. There
is no depth branch in the staff model, and the Simulation Depth persistence ticket inherits nothing
from this one.

## Relationship to existing notes

- **[Manager pillar bindings v1](2026-08-29-manager-pillar-bindings-v1.md)** cut the coaching-staff
  system from v1. This note reintroduces it, and does so under that note's own test: the system ships
  only because it now carries two real bindings. Partially superseded — its Technical Coaching
  reasoning, its hard invariant, and its binding-or-cut discipline all stand unchanged, and this note
  is careful not to touch the term it owns. Its statement that no coaching-staff system exists is now
  false for MVP. Both stay active.
- **[Scout resource and assignment model](2026-08-28-scout-resource-and-assignment-model.md)** is
  partially superseded. The Stature Tier headcount derivation, the 1:1 no-stacking rule, the explicit
  two-step reassignment, the Free Agent non-treatment, and the transfer-interaction rules all survive.
  What changes: a Scout is a person rather than a fungible slot, and `AssignScout` names one. Both
  stay active.
- **[Progress accrual and Attribute Range](2026-08-28-progress-accrual-and-attribute-range.md)** is
  partially superseded. The linear curve, the shared noise-band formula, and the Transfer Value
  derivation stand; the per-Matchday increment stops being a single flat constant and becomes a
  function of the assigned scout's quality, anchored so that the existing constant is the mid-quality
  case. Both stay active.
- **[Deterministic fractional player development](../../implemented/feature/2026-08-28-deterministic-fractional-player-development.md)**
  keeps its curve, its ceiling reuse, and its no-RNG posture. The baseline fraction gains one
  multiplier for human-managed clubs. Determinism is preserved: coach quality is itself derived, not
  rolled.
- **[No onboarding inbox](../architecture/2026-08-29-no-onboarding-inbox.md)** rules out staff
  recommendations on the grounds that "there are no staff". The premise no longer holds; whether the
  conclusion should change is a question for whoever next opens that note, and this note does not
  reopen it.

## Acceptance criteria

- A `staff` table exists with a surrogate id, a club reference, a `role` of exactly `coach` or
  `scout`, a `quality` integer constrained to 1-20, and a directly stored name.
- A human-managed club has exactly one `coach` row and exactly N `scout` rows, N from the Stature
  Tier table.
- No club that has never been human-managed has any staff row, at any Simulation Depth.
- Taking the same club at two different points in a career yields byte-identical staff rows.
- `coachModifier(q) >= 1.0` holds for q in 1..20, verified as a test over the whole legal domain.
- Scout accrual is strictly positive for q in 1..20, so `Fully Scouted` is reachable from any
  assignment held long enough.
- `Contract` and `Wage Budget` are unchanged: no staff wage appears in either.
- Scout assignment names a specific scout; the fungible-slot representation is gone.

## Alternatives considered

- **Scout quality buys extra assignment slots** (or slots *and* rate): rejected. Slot count already
  derives from Stature Tier, and a second owner for that term is the same double-booking this note
  rejects for the coach. The rate variant leaves the accrual constant with nothing differentiating it.
- **The coach scales the Training Focus multiplier**, stacking with Technical Coaching: rejected. Two
  multipliers on one term is the smell the ticket named, and a low-Pillar, low-coach combination
  threatens Technical Coaching's hard invariant. Partitioning gives each term one owner.
- **The coach adds a third development term** applied after both: rejected. A third term is a third
  thing to tune with no distinct meaning; the baseline was already unowned and available.
- **A Physio role**: rejected, and it was the closest call. Regimen already owns both Condition
  decay/recovery and injury severity, so a physio would double-book a Pillar rather than fill an empty
  term. Assistant Manager and Director of Football fail earlier: there are no team talks, no delegated
  tactics, and `decideAiSellerResponse` is the whole transfer market's decision surface.
- **Role-specific columns** (`judgement`, `coaching`) or the reference material's specialism spread:
  rejected. One binding per role means one number; anything wider is nulls-by-role or dead columns.
- **Coaching as a scalar on `clubs` with no coach entity**: rejected. Saves one derivation rule, costs
  a second concept and the ability to show a named coach.
- **Several coaches with a designated Head Coach carrying the binding**: rejected. The others are dead
  rows by this repo's own test, and any aggregation rule over multiple coaches is a formula choice with
  no gameplay decision behind it, since the manager can neither hire nor fire.
- **Staff wages against Wage Budget plus a hiring market**: rejected for MVP. It needs a candidate
  pool, a negotiation surface, and a redefinition of both `Contract` and `Wage Budget` — a third market
  alongside transfers — when neither binding needs it to be observable. See Risks.
- **Staff rows for every club in the world**: rejected. Nothing would read them without overturning two
  shipped decisions ("AI clubs never scout", "AI clubs' players always use unmodified Player
  Development").
- **Staff generated eagerly at world generation for the human's club only**: rejected in favour of lazy
  materialisation, because a sacking-and-rehire needs a backroom for a club that was never the
  human's at save creation. Deriving from the world seed and the club id gets the same determinism
  without special-casing the first club.

## Risks

- **Staff are a property of the club, not a lever.** A manager can never improve their coaching or
  scouting except by moving to a bigger club. This is the deliberate cost of cutting the hiring market,
  and it is the first thing to revisit if staff feel inert in play. Reintroducing hiring means
  reopening `Wage Budget`, so it is not a cheap later addition — it is a real second decision.
- **Staff are purely additive.** Both invariants (coach modifier at or above 1.0, accrual strictly
  positive) mean staff can only ever help. The system has no downside anywhere, which is the correct
  shape given the manager did not choose their staff, but it does mean a small club's backroom is felt
  as an absence rather than a penalty.
- **Everything about a club now derives from Stature Tier**: Transfer Budget, Wage Budget, Board
  Objective, scout headcount, and staff quality. Seeded variance around each tier's mean is what keeps
  two mid-tier clubs from being interchangeable; without it, the world flattens into three club
  archetypes.
- **The `results-only` invariant is only as strong as the human-managed set.** If a later effort ever
  lets the human manage a club below `full` depth, the no-depth-branch claim here needs rechecking.
