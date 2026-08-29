# Agent Note: Manager Pillars & archetype set

Status: proposed

## Problem

Onboarding makes manager identity mechanically load-bearing rather than purely representational, so
the manager must exist as a domain entity before anything can hang off it. Nothing in the codebase
holds a manager today: there is no manager row, no manager name, and no manager-owned state — the
only adjacent record is `manager_status`, a single-row projection of `ManagerWarned`/`ManagerSacked`
carrying the Consecutive-Miss Counter and the sacked flag.

That leaves the whole model open: how many capability dimensions the manager has and on what scale,
what point budget constrains them, whether preset archetypes are curated examples or a rule that
Custom managers must also obey, whether an extreme or a flat distribution is legal, whether the
values stay visible after creation, whether presets carry anything a Custom manager cannot have, and
where the resulting state is persisted given that ADR-0007 fixes the Decider set at three (Club,
Match, Season/Calendar).

Naming is part of the problem, not a postscript. The glossary already defines **Attribute** as a
player's 1–20 skill dimension, **Category** as the four groups an Attribute belongs to (Technical,
Mental, Physical, Goalkeeping), **Condition** as a player's live between-match physical state,
**Training Focus** as the per-player per-Category development bias, and **Match Intensity** as a term
in the injury-risk formula `(100 − Condition) × Injury Proneness × Match Intensity`. A manager
capability model must collide with none of them.

## Proposal

### The pillar model

A manager has four **Manager Pillars**, each an integer from 1 to 5, chosen once at manager creation
and immutable thereafter: **Tactical Acumen**, **Influence**, **Regimen**, and **Technical
Coaching**.

The creation invariant is exactly two rules:

```
1 <= each pillar <= 5
tactical_acumen + man_management + regimen + technical_coaching = 12
```

A budget of 12 across four pillars puts the mean at 3, making `3/3/3/3` the mathematical centre while
leaving room for genuine specialisation. Every distribution satisfying both rules is legal, including
`3/3/3/3` and `5/5/1/1`. Creation cannot complete with points unspent — the UI shows points
remaining and enables submission only at zero.

### Presets are curated examples, not a constraint

Four **Manager Archetypes** are offered as named starting distributions:

| Archetype | Tactical Acumen | Influence | Regimen | Technical Coaching |
|---|---|---|---|---|
| The Professor | 5 | 1 | 2 | 4 |
| The Motivator | 2 | 5 | 4 | 1 |
| The Sergeant | 1 | 2 | 5 | 4 |
| The Academy Head | 2 | 4 | 1 | 5 |

Every preset is a permutation of `{5, 4, 2, 1}`, so each has one defining mastery, one strong
supporting competency, one below-average competency, and one severe weakness. Across the set, each
pillar is owned at 5 by exactly one archetype and set to 1 by exactly one other, so every pillar has
both a fictional champion and a fictional cautionary tale.

**This `5/4/2/1` shape is an authoring convention for presets only. It is not an invariant Custom
must obey.** Imposing it on Custom would reduce Custom to a permutation picker over 24 arrangements,
three of which are already named, which would make Custom pointless.

Presets are mechanically identical to a Custom manager with the same distribution. They may carry an
archetype name, portrait treatment, flavour description, recommended play style, and strength and
weakness summaries. They must never carry hidden bonuses, hidden penalties, unique success
probabilities, distinct board or AI reactions, exclusive dialogue, or unlisted relationship
modifiers. Any hidden mechanical difference would make the displayed pillar values an incomplete
description of the manager and would silently penalise choosing Custom.

### Scale semantics and the no-soft-lock rule

The scale reads as: 1 severe deficiency, 2 weak, 3 competent, 4 strong, 5 exceptional. **A 3 means
normal professional competence, not ineffectiveness.**

A pillar value of 1 is a severe, campaign-defining weakness — never a soft lock. It must change how
the player builds and runs the club without disabling a management system. A manager with
Influence 1 still negotiates; they simply do it with less
reliable morale outcomes, higher risk of a team talk backfiring, faster deterioration of strained
relationships, poorer information about player reactions, harder contract persuasion, and greater
dependence on the captain and staff. Players do not refuse to train because Technical Coaching is 1.

Pillars modify probability of success, magnitude of outcome, available approaches, information
quality, risk, cost, recovery time, and duration of effect. **They do not ordinarily function as
absolute permission gates**, and most essential club-management actions remain possible at every
value. Critically, the majority of desirable actions must not require a 4 or 5 — if they did,
`3/3/3/3` would be a trap regardless of how the scale is described, and the "generalist" framing
would be a lie.

The intended trade is ceiling against reliability. A specialist gets higher peak performance and more
reliable success inside its specialism, bought with a pronounced vulnerability that reshapes club
building. A generalist gets more baseline options, fewer penalties, more predictable results, and no
severe weakness to compensate for, bought with no access to elite pillar-driven outcomes. The
generalist is safer, not stronger.

The reason this rule is binding rather than advisory: the creation UI explicitly permits the player
to choose 1, so a legal creation choice that could invalidate a campaign would be false agency rather
than meaningful character building.

### Visibility

Pillar values stay permanently visible after creation, on a Manager Profile screen under a
Management Philosophy section, shown as the four 1–5 numbers plus the archetype name. Compact
summaries may also appear in the new-game review, the profile header, save-selection details, and
relevant decision tooltips.

Hiding them would be incoherent: the presets advertise their exact distributions at creation, the
player allocates the points deliberately, and the codebase already shows own-squad Attributes in full
(Scouting clouds only *other* clubs' players). The decisive argument is onboarding's own: the
contextual-help layer needs to say "your squad's fitness is collapsing — Regimen 1", and that line is
incoherent if the number is hidden.

Visibility means the value, a qualitative rating, the systems affected, and any temporary modifiers —
not internal coefficients. Exact probability formulas may stay hidden while the pillar-to-outcome
relationship is still explained.

### Persistence

Manager Pillars are an immutable, validated value object on a new single-row `manager_profile` table,
written inside `createSave`'s existing transaction. **No `ManagerCreated` event is emitted**, and no
allocation-level events (`ManagerPillarRaised`, `ArchetypeSelected`, and the like) exist — the plus
and minus clicks on the creation screen are provisional UI state, not domain history. Only the
submitted, validated profile is persisted.

```sql
CREATE TABLE manager_profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    manager_name TEXT NOT NULL CHECK (length(trim(manager_name)) BETWEEN 1 AND 80),
    archetype_origin TEXT NOT NULL CHECK (
        archetype_origin IN ('professor','motivator','sergeant','academy_head','custom')),
    tactical_acumen INTEGER NOT NULL CHECK (tactical_acumen BETWEEN 1 AND 5),
    man_management INTEGER NOT NULL CHECK (man_management BETWEEN 1 AND 5),
    regimen INTEGER NOT NULL CHECK (regimen BETWEEN 1 AND 5),
    technical_coaching INTEGER NOT NULL CHECK (technical_coaching BETWEEN 1 AND 5),
    CHECK (tactical_acumen + man_management + regimen + technical_coaching = 12)
);
```

This is not a Decider, and ADR-0007's own reasoning is why. That ADR fixes the Decider set at three
and excludes League Table explicitly "because nothing commands it into a new state, so it's a
projection, not an aggregate". Manager Pillars fail the same test: nothing commands them, they own no
command or event lifecycle, and they are inputs consumed by existing bounded decisions rather than
decisions themselves. They are established once, read frequently, and never modified.

It is also not `manager_status`. That table is documented in `apps/desktop/src/main/schema.ts` as
projected from the season stream's `ManagerWarned`/`ManagerSacked` events — a rebuildable read model.
Immutable creation input placed in a rebuildable projection is destroyed by the first projector
rebuild, because no event carries it. Nor is it `save_meta`: data that affects simulation rules
belongs in typed domain state, not untyped save metadata. `save_meta.name` is the *save's* name and
remains distinct from `manager_profile.manager_name`.

The plain-row choice matches how creation-time facts already work in this codebase. `createSave`
performs DDL, inserts `save_meta`, generates the world, and starts the season imperatively in one
transaction, touching the `events` table not at all; world generation, the closest analogue to "facts
fixed at creation", is not event-sourced either. An event would add ceremony without adding
reconstructability, audit value, or domain behaviour when there is one writer, one immutable write,
and no replay that could yield a different value.

Manager profile writing is part of the creation transaction and its failure aborts save creation
entirely. There must never exist a successfully created save that requires Manager Pillars but has no
`manager_profile` row.

**Determinism.** ADR-0007 requires match resimulation to be reproducible from the `MatchStarted`
seed. Because pillars are immutable for the life of the save, any resimulation reads the identical
value and no pillar snapshotting into match events is needed. This guarantee is conditional: if
pillars later become mutable over a career, pillar-dependent match results would need the value
captured at simulation time, and this decision would have to be revisited.

**Manager name.** `manager_profile` carries it. The manager profile is being introduced as a coherent
domain object here, and splitting identity across tickets would leave it incomplete and force a
second migration immediately. The name is authoritative domain state, not a UI preference — it will
be consumed by inbox messages, board communications, the profile UI, save summaries, match and
competition presentation, and career history. The 80-character bound is a starting policy; it should
follow an existing project-wide identity constraint if one is introduced.

**`archetype_origin`.** Retained, because it records an irreversible creation choice that cannot be
reconstructed from the distribution: a manager who chose The Professor and a Custom manager who
happened to land on `5/1/2/4` are mechanically identical but historically distinct, and that
distinction is cheap to keep and impossible to recover later. It exists to display "Archetype: The
Professor" versus "Archetype: Custom Manager". It must never create a mechanical difference.

Two rules govern it. First, preset-to-distribution consistency is enforced in the domain factory, not
by a SQL `CHECK` encoding the full matrix — preset definitions are domain policy that may be
versioned or rebalanced, and the database's responsibility is bounds, budget, and allowed vocabulary.
Second, **persisted pillar values are authoritative and `archetype_origin` must never be used to
recalculate the distribution when loading an existing save**, so that rebalancing presets in a later
version cannot retroactively mutate an existing career.

Application-level validation must still run before persistence. The database `CHECK` constraints are
a final integrity boundary, not the primary error-reporting mechanism.

### Vocabulary

New glossary terms: **Manager Pillar**, **Manager Archetype**, **Custom Manager**, **Pillar
Distribution**, and the four pillar names. Manager Pillars are explicitly *not* Attributes; Attribute
remains reserved for a player's 1–20 skill dimension.

Two pillar names were chosen against collisions rather than for flavour:

- **Tactical Acumen** rather than "Tactical IQ" — it reads as a manager capability rather than a
  literal intelligence score. Its scope is tactical preparation, tactical adaptation, opponent
  analysis, and the manager's interpretation of scouting reports. It deliberately does *not* overwrite
  Scout quality: Scouts retain their own evaluation capability, and the pillar affects the manager's
  ability to interpret, synthesise, and challenge reports.
- **Regimen** rather than "Training Intensity" or "Conditioning & Discipline". Its scope is physical
  preparation, workload tolerance, fitness standards, professional routine, and disciplinary
  authority. "Training Intensity" collided with both Training Focus and Match Intensity;
  "Conditioning & Discipline" was worse, colliding with **Condition**, a load-bearing term that
  appears literally in the injury-risk formula. Regimen is absent from the glossary, is one word, and
  natively spans both the physical and disciplinary halves of the pillar.

**Influence** replaces the working name "Influence". The original reasoning kept
Influence because football fiction supported it and it collided with nothing; that held only
while the pillar's bindings were hypothetical. Once the pillar's single shipped binding was found to
be club-to-club seller negotiation, the name asserted a causal relationship the code does not
contain, and it was renamed. See
[Agent Note: Manager Pillar bindings in v1](2026-08-29-manager-pillar-bindings-v1.md). **Technical Coaching** is
kept despite proximity to the **Technical** Category, because the proximity is semantically aligned
rather than misleading: the pillar plausibly does bias development of Technical-Category Attributes.
Both must be consistently qualified as Manager Pillars.

Leaving these names free preserves room for later concrete concepts named `trainingIntensity`,
`playerCondition`, `matchIntensity`, and `disciplinaryIncident` without overloading a pillar.

## Alternatives considered

- **Making the `5/4/2/1` shape a hard invariant for Custom too.** Rejected: it collapses Custom into a
  picker over 24 permutations, three already named, so Custom stops being a meaningful choice. The
  shape is what makes the *presets* dramatic; it is not what makes the system fair. Sum-12 with 1–5
  bounds is the fairness guarantee and it does that job alone.
- **Blocking `5/5/1/1` at the creation screen.** Rejected: it is an unexplained rule the presets
  themselves never communicate, and it is self-punishing already if a 1 genuinely bites. If it proves
  too strong in playtesting, balance the effects at 5 and 1 rather than introducing an arbitrary
  distribution-shape restriction without a fictional reason for it.
- **Treating `3/3/3/3` as a trap.** Rejected as a design goal, but noted as an outcome that arrives by
  accident if most desirable actions gate at 4+. The threshold model exists specifically to prevent
  that accident.
- **Keeping "catastrophic, game-breaking flaw" at a value of 1.** Rejected: the UI offers 1 as a legal
  choice, so a value that can invalidate a campaign is false agency. Softened to
  severe-and-campaign-defining, with the no-soft-lock rule made binding.
- **Three presets rather than four.** Rejected: with only The Professor, The Motivator, and The
  Sergeant, no preset ever set Technical Coaching to 5 or 1, leaving the managerial fantasy with the
  strongest existing surface (Training Focus and Player Development both ship today) reachable only
  through Custom. The original three also put Tactical Acumen at 1 in two of three presets, so a new
  player picking blind was most likely to be tactically inept in a game whose primary interaction is
  tactics.
- **Adding The Academy Head without rebalancing The Motivator.** Rejected: it fills the missing
  Technical Coaching 5 but leaves no archetype at Technical Coaching 1, an incomplete matrix. Moving
  The Motivator from `1/5/4/2` to `2/5/4/1` also improves the fantasy — a motivator need not be
  tactically incompetent; their weakness is better expressed as an inability to convert emotional
  influence into structured long-term player development.
- **Forcing the preset matrix into a full Latin square** (every pillar column also a permutation of
  `{5,4,2,1}`). Rejected. It is achievable — swapping The Sergeant's Influence and Technical
  Coaching, and The Academy Head's Tactical Acumen and Influence, would do it — but it costs
  fictional coherence, since it would make The Sergeant a Influence 4 people person. The chosen
  set therefore has Tactical Acumen holding `2` twice and never `4`, and Technical Coaching holding
  `4` twice and never `2`. Fiction was preferred to symmetry; the stated invariant (each preset owns a
  distinct pillar at 5 and a distinct pillar at 1) holds exactly.
- **A `ManagerPillars` Decider, or folding pillars into a `ManagerCreated` event.** Rejected on
  ADR-0007's own League Table reasoning — nothing commands pillars into a new state. No event target
  exists today in any case, and world generation sets the precedent that creation-time facts are
  plain rows.
- **Storing pillars in `manager_status`.** Rejected on a factual ground: it is a projection rebuilt
  from the season stream, so a rebuild would erase values no event carries.
- **Storing pillars in `save_meta`.** Rejected: simulation-affecting data belongs in typed domain
  state, not save metadata.
- **Deriving the archetype label from the distribution instead of storing `archetype_origin`.**
  Rejected. Derivation covers the display case but destroys creation provenance, which is
  unrecoverable once the save is written. A derived *style descriptor* may still exist alongside it,
  describing a Custom `5/1/2/4` manager as Professor-like without retroactively classifying them as
  having selected The Professor.
- **Encoding the preset-to-distribution matrix as a SQL `CHECK`.** Rejected: it duplicates domain
  policy in the schema and blocks preset rebalancing.

## Acceptance criteria

- `manager_profile` exists as a single-row table with the constraints above, and is written inside
  `createSave`'s transaction; a failure to write it aborts save creation, so no save can exist
  without exactly one `manager_profile` row.
- A domain value object validates integer type, 1–5 bounds, and sum-12 before persistence, and
  surfaces validation errors to the UI rather than relying on SQL `CHECK` failures.
- The creation screen shows points remaining, enables submission only at exactly 12 allocated, and
  accepts every legal distribution including `3/3/3/3` and `5/5/1/1`.
- Setting any pillar to 1 shows a contextual warning naming that pillar's actual consequences and
  the available mitigations (staff, senior players), never a generic claim that the campaign may
  become unplayable.
- Selecting each of the four presets yields exactly the distribution in the table above, and a Custom
  manager entering the same numbers is indistinguishable in every mechanical outcome.
- The four values and the archetype name are readable on a Manager Profile screen after creation.
- Loading an existing save reads the persisted pillar values and never recomputes them from
  `archetype_origin`.
- `CONTEXT.md` carries entries for Manager Pillar, Manager Archetype, Custom Manager, Pillar
  Distribution, and the four pillar names, each distinguishing itself from the colliding existing
  term (Attribute, Condition, Training Focus, Match Intensity, Technical Category).

## Risks

- **The no-soft-lock rule is only as real as ticket 02 makes it.** It is stated here as a binding
  acceptance constraint on pillar binding design, but nothing mechanical enforces it. If bindings
  drift toward permission gates at 4+, `3/3/3/3` silently becomes the trap this decision set out to
  prevent, and the failure will be invisible until playtesting.
- **The charting survey understated the available surfaces.** It found no morale, loyalty, youth,
  discipline, dressing-room, press-conference, or coaching-staff system, which is correct, but it also
  reported the Training and injury efforts as mid-design when both had shipped. Ticket 02 corrected
  this and bound all four pillars to shipped systems; the flavour language here for the people-facing
  half of Influence remains aspirational and those effects are cut from v1.
- **Immutability is assumed, not decided.** Whether pillars change over a career is still open. If
  they become mutable, the Decider argument, the no-snapshot determinism guarantee, and the plain-row
  persistence choice all need revisiting together.
- **`archetype_origin` invites exactly the mechanical coupling it forbids.** A stored preset
  identifier is a tempting hook for future flavour that quietly becomes mechanical. The rule that it
  is presentation-only needs restating wherever it is read.
- **Visible pillar values invite optimisation.** Publishing the numbers makes an optimal-build meta
  discoverable, especially once bindings are known. This is a cost the project already accepts for
  own-squad Attributes, and the onboarding benefit was judged to outweigh it.
- **Four presets is more surface to balance.** Each added archetype is another distribution whose
  fantasy must remain coherent as bindings land, and the set's stated invariant constrains future
  rebalancing.
