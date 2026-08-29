# Agent Note: Contextual help as a typed projection of the simulation model

Status: proposed

## Problem

The game must teach a new player enough to reach and finish a first match without a printed manual,
a forum, or a scripted tutorial. A scripted first-run tutorial is already ruled out of scope, and
[[2026-08-29-no-onboarding-inbox]] removed the message feed, so every explanation has to live on one
of the seven existing screens, the creation flow, or the Continue affordance. What was undecided is
the line between permitted contextual help and the tutorial: which forms of explanation are allowed,
whether dependence on pre-existing football knowledge is accepted, whether the game owes the player
any visibility into why an outcome happened, and whether help tapers as a player gains experience.

The codebase supplies no starting point and one strong hint. Across all seven renderer screens
(1,635 lines) there is not one `title=`, `aria-label`, hint, or line of explanatory copy. But the
mechanics a new player is confused by are already small, closed data tables: `POSITION_ROLES` maps
each Position to exactly one Role, `ROLE_WEIGHTS` gives each of eight Roles two or three weighted
Attributes, and `MENTALITY_MULTIPLIERS` / `TEMPO_MULTIPLIERS` / `PRESSING_MULTIPLIERS` hold the
literal numbers each Team Instruction applies. The screens decline to render data they already hold:
`SquadScreen` prints raw camelCase identifiers such as `gkReflexes` as column headers, and the
Tactics slot selects list all 25 squad members by name alone although `roleRating` is importable in
that same file.

## Proposal

Contextual help is a **typed projection layer over the simulation model**, not a copywriting
feature. It is governed by mechanical provenance, delivered through one uniform affordance, and
permanently available.

### Mechanical provenance

Help is permitted exactly when every mechanical claim it makes traces to authoritative game data,
constants, derived state, or structured resolver output, and it appears where the player makes or
reviews the affected decision. The review question is *what authoritative source supports this
claim, and does the simulation read that source?*

Provenance governs claims, not sentences. Presentation templates may translate identifiers and
values into readable language — `fatigueDecayMultiplier: 2.0` may render as "Doubles fatigue decay"
— but a template may not introduce mechanics, strategy, rankings, or causality the model does not
contain. The display must read from or share the authoritative definition rather than keeping a
separately authored copy of its values.

This admits Attribute relevance projected from `POSITION_ROLES` and `ROLE_WEIGHTS`, instruction
effects projected from the multiplier tables, Role Rating on tactic slot selects, derived readiness
and empty states, and resolver-backed causal statements. It excludes an in-app football manual, a
tutorial campaign, a scripted checklist, a "what should I do next?" advisor, any surface that ranks
options without an authoritative ranking model, and claims resting on designer intuition ("this is
the best formation for beginners", "you should always pick your fastest striker").

Accessibility labels are interface semantics, not tutorial content, and do not need a simulation
source to say what a control is. Any mechanical claim made *inside* an accessibility description is
still subject to provenance.

### The knowledge floor is the game's own model

The game never teaches real football and always teaches the simulation. A Position is explained
through its mapped Role and that Role's weighted Attributes — DM is "Anchorman: Tackling,
Positioning, Strength", which is the only thing the engine means by it — not through tactical theory
or how a real coach uses the position. The obligation is bounded by the v1 vocabulary: eight Roles,
the Position-to-Role mapping, Role-weighted Attributes, Attribute Categories, Condition, Training
Focus, Stature Tier, Manager Pillars, tactical instructions and readiness states.

The binding rule: **if the renderer uses a domain term to ask the player to make a decision, that
same decision surface must offer a mechanically grounded way to resolve what the term changes.**
Resolution may be inline, expandable, or in a popover; it may never require an external manual.

### Displayability follows provenance

An Attribute is player-facing only when at least one shipped authoritative system reads it. The
visible Attribute set is therefore derived from mechanical consumption, not from the schema or
`ALL_ATTRIBUTES`.

Six of the 27 visible Attributes appear in no `POSITION_WEIGHTS` and no `ROLE_WEIGHTS` entry. Four
remain visible because they are grounded elsewhere and are explained by those mechanics rather than
by ratings: `bravery` and `aggression` set collision risk, `agility` is reduced by injury
resolution, `naturalFitness` drives Condition recovery. Two — `firstTouch` and `determination` — are
read by nothing at all and leave the player-facing screens. They stay in the domain type,
persistence and generation, losing no data, and return the moment a shipped system consumes them.

Displaying a 1-20 number that changes no outcome falsely implies that higher is better, that the
value should inform selection, and that differences between players are strategically meaningful. An
honest "not currently used" label is worse: it advertises implementation residue as game design
forever.

Presentation metadata and displayability are separate concerns. The label registry stays exhaustive
over `Attribute` — including hidden ones, so the mapping cannot silently fall out of date — while a
distinct player-facing subset controls what is rendered. A registry entry for an unused Attribute
carries a canonical label and no fabricated mechanical description, and its unused status is never
rendered to players.

### Term Disclosure

One named affordance serves every domain term: a visible, focusable, keyboard-operable control
attached to the term that expands a mechanically grounded explanation next to it. It is used
uniformly for Attributes, Roles, Positions, tactical instructions, Condition, Training Focus,
Stature Tier and Manager Pillars.

Disclosure is for **meaning**. Values that drive the choice at hand stay **inline** — a tactic slot
select shows Position, Role Rating, Condition and availability outright, because hiding behind an
expander the comparison the engine itself performs reproduces the name-only selector in a new
costume.

Help never opens in a modal, which would obscure the decision it explains and trap focus away from
the comparison; inline expansion, anchored popovers, non-modal side detail and expandable rows are
all acceptable. Hover may supplement but can never be the only access path: every disclosure is
reachable by keyboard, activatable by standard keys, available on touch, exposed with an accessible
name, and dismissible without losing the decision context. In a dense Attribute table, sorting and
help activation must be separate targets rather than one ambiguous click.

### Help never tapers

No help artifact carries per-save, per-player, seen, dismissed, experience-level, or
tutorial-completion state. The same explanation is available in save one and save fifty. Tapering
would require the game to decide what counts as experienced, whether experience is global or
per-save, whether opening help implies understanding it, and whether a returning player is still
experienced — reconstructing exactly the tutorial state that [[2026-08-29-no-onboarding-inbox]]
rejected. Permanent does not mean permanently expanded: help may be compact, subordinate or
collapsed by default, provided it never becomes unavailable because of what the player did before.

### Causal explanation is resolver-backed

A Pillar or modifier contribution is shown only where the authoritative resolver emits structured
causal data showing that the contribution materially affected the result. Reverse inference — Pillar
value is high, a related outcome occurred, therefore the Pillar caused it — is forbidden.

**Standing relationships** and **outcome-specific attribution** are distinct. "Regimen modifies
Condition recovery" and "High Pressing increases pressing aggression and fatigue decay" are grounded
in a binding or a multiplier table and may be shown anywhere relevant. "Your high Regimen is why
this player recovered in time" and "High Pressing caused the late goal" require structured causal
output that today's tables do not produce.

In v1 this means Tactical Acumen's contribution is presented from real tactical resolver output no
later than the completion of the first match, per [[2026-08-29-manager-pillar-bindings-v1]]. Regimen
and Technical Coaching receive outcome-specific explanations only once their magnitude decisions
define what they emit; until then they get standing-relationship statements only. Any future binding
must separately decide whether structured causal output exists, whether the contribution is worth
exposing, which screen owns the explanation, and how to avoid implying false precision.

### Irreversibility Disclosure

One bounded exception admits authored text without a simulation table behind it. Where the game
silently makes an action irreversible, or forecloses a recovery a player would reasonably attempt,
the boundary discloses that consequence *before* commitment. Its provenance is architectural —
command, persistence and lifecycle semantics — rather than numerical, and it is authoritative on
those grounds.

The case that forces it: the human Fixture's match seed derives from `SeasonStarted.seed` +
`fixtureId`, so once `PersistedMatchStarted` exists the setups and seed are fixed, navigation and
restart resume the same match, and a lost match cannot be retried into a different result
([[2026-08-29-human-fixture-pre-match-boundary]]). Discovering that by failed experiment is the
failure mode this whole decision exists to prevent.

The disclosure sits at the pre-match boundary beside Play and Quick result — the last point where
preparation is still changeable — and never at full time, where stating it is a taunt. It explains
that starting freezes the match setup, that leaving Match day does not abandon the match, that
returning or restarting resumes the same match, and that Quick result runs the same authoritative
simulation without live reveal. It describes system behaviour and never accuses the player of
attempting an exploit.

The exception applies only when the upcoming command creates or freezes authoritative state, normal
navigation cannot reverse it, a reasonable player might expect reversibility, discovering the rule
afterwards would cause meaningful surprise or loss, and disclosure can precede commitment. Other
candidates — season conclusion, save deletion, the immutability of creation-time Pillars — each need
their own ticket to confirm the actual irreversibility. The disclosure appears at every applicable
boundary and is never suppressed by seen-state, which would contradict the no-tapering rule.

There are therefore exactly two permitted foundations for help: **simulation provenance** and
**irreversibility provenance**. Everything else is excluded unless separately resolved.

## The readiness copy contract

Every readiness statement expresses four things: the unresolved domain state in canonical
player-facing vocabulary ("No Tactic set", not "Validation failed"); the specific action it blocks
("Play and Quick result are unavailable", never a vague "cannot progress", so the player does not
assume transfers and squad inspection are blocked too); the screen that owns resolution, with a
route to it; and the fact that this is normal unresolved setup rather than a system failure — no red
error styling, no failure vocabulary, no blame.

Exemplar: *"No Tactic set. Play and Quick result remain unavailable until you choose a Formation and
complete your starting eleven on Tactics."* A compact shell presentation may shorten this to *"Match
preparation incomplete: No Tactic set."*, with the full four-part statement at the boundary.

The backend supplies typed blocker facts — the kind, the blocked actions, the owning screen, the
normal-setup context — and the renderer supplies the language. The renderer never infers which
action is blocked or which screen owns the fix, and the backend never authors display prose.

## Where presentation lives

The canonical label, description and provenance registries live in `packages/shared`, colocated with
the domain vocabularies and the authoritative tables they describe, as exhaustive typed mappings
over each finite vocabulary: Attribute, Role, Position, tactical instruction option, Attribute
Category, Manager Pillar, Stature Tier, Training Focus and readiness blocker.

Exhaustiveness is the enforcement mechanism. A `Record<Attribute, AttributePresentation>` makes
adding an Attribute without copy a compile error, so `pnpm check:all` guards the policy instead of
review discipline. A renderer-local map would let simulation vocabulary and player-facing
explanation drift apart independently — and would place claims about the model in a package that
cannot see the tables those claims cite. Instruction help imports the multiplier tables rather than
restating their numbers.

A provenance registry naming each Attribute's authoritative consumer category (role rating, position
rating, collision risk, injury effect, Condition recovery) makes the displayability rule testable:
every displayed Attribute has a provenance entry, every entry names a shipped consumer, unused
Attributes are absent from the player-facing set, and no raw identifier is rendered. The registry
names mechanics, never source locations — `simulate.ts:440` is documentation, not runtime domain
metadata.

## Creation-time Pillar disclosure

Manager creation shows, for each Pillar, its shipped Bindings, the dimension it modifies, and its
payout timing derived from where the bound resolver actually runs. Timing is a fact in the code, not
a marketing label: Tactical Acumen resolves at every match, Influence at each Bid during an open
Transfer Window, Regimen during matches and between them plus at injury resolution, and Technical
Coaching once per season — `developPlayersForSeason` is called only from `advanceCalendar`'s
season-complete branch. This satisfies the requirement that slow Pillars never read as inert ones
without inventing an "immediate vs slow" label detached from the lifecycle boundaries.

Disclosure names systems and dimensions, never promised outcomes. "Influences how a selling club
responds to your Bid during an open Transfer Window" is permitted; "high Influence gets better
deals", "fewer injuries", "wins close matches" and "rapidly improves young players" are not — the
resolvers establish magnitudes and thresholds, not guaranteed results. Regimen's copy must not
flatten its indirect reach into injury frequency (via Condition) into a claim that it prevents
injuries.

## Amendment to the Continue result contract

[[2026-08-29-continue-as-global-career-loop]] fixed the stop set as exactly the fields on
`AdvanceCalendarResult` and ruled that anything absent from that contract passes silently. Those
fields — `season`, `resolvedMatchday`, `transferWindowClosed`, `transferWindowOpened`,
`seasonConcluded`, `boardObjectiveVerdict`, `managerOutcome` — cannot express arrival at the human
Fixture's pre-match boundary or the readiness blockers waiting there. Under the contract as written,
the first Continue is structurally incapable of saying "you have arrived at Matchday 1 and you have
no Tactic", which is precisely what that press must say.

The result therefore gains an explicit, nullable pre-match boundary carrying the pending fixture,
matchday, opponent, home/away, and the typed readiness blockers in the same vocabulary match-start
validation consumes. This applies that note's own rule — anything that should become a stop must be
exposed authoritatively first — rather than overriding it, and it does not reopen the always-true
"human played" flag that note rejected: the boundary field is genuinely null whenever an advance
does not reach the human's Fixture.

The renderer must not reconstruct boundary arrival or readiness from the current route, a fixture
lookup, a null-Tactic check, or a before-and-after comparison; this keeps the renderer the plain
data consumer that [[2026-08-28-renderer-boundary-posture]] describes.

Readiness carried on the result is **advisory** — the player may repair it immediately afterwards —
so the boundary recomputes it on every read and `startMatch` remains the authoritative validation.

The structured durable surface renders in fixed order: **what happened** (completed calendar
consequences), **what is next** (the pending Fixture, matchday, opponent, venue, unmistakably
unresolved), **what is unresolved** (typed blockers), **what you can do** (routes and actions, with
unavailable actions visibly unavailable and their cause associated through accessible semantics).
Unresolved precedes actions so the blocker is read before the actions it disables. A section with no
authoritative data renders nothing at all — never "No calendar updates", never an empty heading —
which keeps the four-part structure from decaying into boilerplate.

## Screen coverage and delivery ownership

The policy is global: every player-facing screen obeys provenance, canonical labels, Term
Disclosure, inline decision values, resolver-backed causality and permanent statelessness. Delivery
is assigned by whether the screen asks the player to decide and whether another effort already owns
it.

Onboarding owns policy and delivery for the shared presentation registries, the Term Disclosure
pattern, manager creation, Squad, Tactics, Transfers and the pre-match boundary, plus the
Continue-result content contract and the readiness copy contract. Squad, Tactics and Transfers fall
here because no other effort is in flight for them: `.scratch/` holds efforts for cm-clone, training,
scouting, injury-system and the e2e waves, and none for those screens. Transfers is included because
it is a decision surface — Bid values judged against a valuation Influence shifts — and it is the
only player-facing home of the Influence binding. Its help covers club-to-club Bid mechanics only,
and must never mention agents, wages, player persuasion or promised squad roles, none of which exist.

The cm-clone match effort owns Match day help, including rendering resolver-backed Tactical Acumen
output, in-progress and full-time presentation, and started-match resumption states. The Training
effort owns Training Focus help and Technical Coaching's presentation. Both consume the shared
policy, registries and affordance rather than authoring competing explanations.

League Table, Fixtures and Season Summary are read-only reporting. They inherit canonical labels,
Term Disclosure for any domain term they render, and the causal-attribution rules, but generate no
new help work merely by existing.

## Handoff: Training Focus spends development on orphaned Attributes

`developPlayer` develops every entry in `ALL_ATTRIBUTES`, and a Training Focus biases every
Attribute in the selected Category. `firstTouch` belongs to the Technical Category and
`determination` to the Mental Category, yet no shipped table or resolver reads either. A season of
Technical focus therefore spends part of its multiplier on values that affect no outcome and, after
the displayability rule above, are not even visible.

This is a development-model defect owned by the Training effort, not a help defect. Help can only
describe it honestly, and describing it honestly exposes the contradiction rather than resolving it.
The Training effort must either give those Attributes a shipped, tested, player-relevant consumer —
not a superficial read added to satisfy provenance — or exclude mechanically orphaned Attributes
from Category membership for development-allocation purposes. Contextual help must not conceal,
compensate for, or unilaterally change the development behaviour, and this planning effort may not
alter simulation behaviour to fix it.

The waste predates this decision: the Attribute was already inert while visible. Hiding it removes
false information and makes the mismatch easier to detect.

## Alternatives considered

**Intrusiveness as the organising principle** — ranking candidate help forms from tooltips up to an
in-app manual and drawing a line somewhere on that scale. Rejected because the line lands wherever
taste puts it, cannot answer cases nobody has enumerated, and says nothing about whether a given
sentence is *true*. Provenance is checkable at review time and cannot drift from the simulation,
since the numbers come from the constants the engine reads.

**Accepting the football-knowledge dependence and explaining nothing**, on the grounds that it is
inherent to the genre. Rejected: it reproduces the section-13 failure this effort exists to solve,
and it is not even honest about the product, which has no model of real football to depend on. The
opposite extreme — teaching real football — was rejected as unbounded and unsourced.

**Tapering help after a first career.** Rejected on the ground already established for the
tapering-guidance inbox: it is the scripted tutorial in a diegetic costume, it requires an
"experienced" judgment the game cannot make, and it makes the first career a different product from
the second.

**A blanket obligation to explain every hidden multiplier.** Rejected as unbuildable today — most
resolvers emit no causal data — and as an invitation to fabricate attribution from Pillar values.
The opposite, treating Tactical Acumen as a one-off exception, was also rejected: it leaves the next
binding with no rule at all.

**Letting the provenance rule bite on the un-retryable seed and saying nothing.** Rejected because
the player learns the rule only by losing a match, quitting and finding the same result — the exact
discovery-by-failed-experiment mode being designed against. The exception is named and bounded
instead of left as an unstated hole.

**Showing orphaned Attributes with an honest "not currently used" note.** Rejected as a worse
artifact than hiding them: it keeps the visual and cognitive cost while permanently advertising
implementation residue.

**Hover tooltips**, rejected as inaccessible to keyboard and touch, and **modal help**, rejected
because it hides the decision it explains.

**A renderer-local label map**, rejected because it lets vocabulary and explanation drift apart and
puts claims about the tables in a package that cannot see them.

**Per-screen purpose blurbs** ("Use this screen to manage your squad"). Rejected as the manual page
distributed one paragraph at a time: they project no data, describe designer intent rather than
mechanics, and go stale the moment the player has seen the screen once. Derived empty states that
report authoritative current state remain permitted; the distinction is state versus purpose.

**Onboarding owning policy without delivery.** Rejected because no effort owns Squad, Tactics or
Transfers, so the camelCase headers, name-only selectors and hidden Role Ratings would have no owner
and the policy would ship as a document.

**Fixing the Training orphan-Attribute waste here**, by excluding those Attributes from development.
Rejected: it changes simulation behaviour, which this planning-only map may not do, and it belongs
to the effort that owns the development model.

## Acceptance criteria

- Every mechanical claim in help names an authoritative source — a simulation table, a derived-state
  predicate, or resolver output — and appears on or directly from the screen where the affected
  decision is made or reviewed.
- Help projects `POSITION_ROLES`, `ROLE_WEIGHTS` and the instruction multiplier tables by importing
  the same definitions tactical resolution consumes, never a second copy of the values.
- The renderer presents no raw camelCase Attribute identifiers.
- The player-facing Attribute set contains only Attributes read by a shipped mechanic. `firstTouch`
  and `determination` are absent from player-facing screens while nothing reads them, and remain in
  schema and generation. `bravery`, `aggression`, `agility` and `naturalFitness` remain visible and
  are explained through collision, injury and Condition mechanics rather than ratings.
- Tactical player selectors show Position, Role Rating, Condition and availability inline.
- Every decision-relevant domain term carries a focusable, keyboard-operable Term Disclosure. No
  help requires hover, and none opens in a modal.
- No help artifact stores seen, dismissed, experience or tutorial-completion state, and none behaves
  differently in a first career.
- Every readiness statement names the unresolved state, the blocked action, the owning screen and
  its normal-setup context, without failure styling or vocabulary. Blockers reach the renderer as
  typed data, not backend-authored sentences.
- Presentation registries live in `packages/shared` as exhaustive typed mappings; `pnpm check:all`
  fails on a missing label, a non-exhaustive mapping, or a displayed Attribute lacking provenance.
- Manager creation shows each Pillar's Binding, modified dimension and resolver-derived timing, and
  promises no outcomes. Technical Coaching is disclosed as resolving at season conclusion.
- Outcome-specific causal claims consume structured resolver output; no screen infers a Pillar
  contribution from the Pillar value. Tactical Acumen's contribution is legible from real resolver
  output no later than the first match's completion.
- `AdvanceCalendarResult` represents arrival at the pending human Fixture boundary and carries typed
  readiness blockers; the renderer infers neither. Sections render in the fixed order and a section
  without authoritative data is omitted rather than filled with a placeholder.
- The pre-match boundary discloses that starting freezes the setup, that navigation and restart
  resume the same match, and that Quick result runs the same simulation without live reveal — always
  available, never gated on seen-state.
- No screen carries generic purpose prose.
- The Training effort records the orphaned-Attribute development defect and resolves it by adding a
  consumer or excluding those Attributes from focus allocation.

## Risks

**The registry is a new maintenance surface.** Every new Attribute, Role or instruction now requires
copy before it compiles. That is the intended cost — it is what prevents drift — but it makes adding
a domain term marginally more expensive, and a maintainer under time pressure may write a thin
description to satisfy the type rather than a true one. Exhaustiveness catches absence, not quality.

**Hiding `firstTouch` and `determination` is visible surgery on generated players.** Anyone
comparing the schema to the Squad screen will find columns missing and may reintroduce them without
finding this rule. The reintroduction condition is explicit — a shipped authoritative consumer — but
it lives in a note rather than in a check, unless the provenance test lands as specified.

**Provenance can be satisfied cheaply.** A future ticket wanting to display something could add a
token read of a value into some resolver and claim provenance. The rule is only as strong as the
review question "is this consumer real, shipped, and player-relevant?", which no type can enforce.

**Onboarding delivering Squad, Tactics and Transfers help widens this effort well beyond onboarding
proper.** It is the right call while no effort owns those screens, but if a Squad or Transfers
effort starts later, ownership overlaps and the specification must be handed over rather than
duplicated.

**The Continue result amendment reaches into another ticket's contract.** It is additive and applies
that ticket's own rule, but it does mean the Continue surface cannot be built to spec until the
boundary field exists, coupling this help work to the pre-match boundary implementation.

**Standing relationships may be read as outcome attribution by players.** Telling a player that
Regimen modifies Condition recovery invites them to conclude that a specific recovery was caused by
Regimen. The rule governs what the product asserts, not what the player infers, and the gap can only
narrow when resolvers emit real causal data.

**Explaining the model honestly can advertise its thinness.** Once help says exactly what an
Attribute does, Attributes that do little become conspicuous — as `firstTouch` and `determination`
already have. This will surface more mechanical gaps, which is a benefit to the game and a cost to
the schedule.
