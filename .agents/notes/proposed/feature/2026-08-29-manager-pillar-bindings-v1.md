# Agent Note: Manager Pillar bindings in v1

Status: proposed

## Problem

Manager Pillars were locked as a mechanical entity — four permanent 1-5 dimensions summing to 12,
chosen at manager creation — but nothing yet says what they *do*. Between them the four Pillars were
described as governing roughly fifteen distinct effects: tactical knowledge, scouting evaluation,
opponent analysis, board negotiation, transfer negotiation, loyalty, motivation, dressing-room
harmony, media handling, fitness training, injury exposure, disciplinary style, coaching workload,
technical development, and youth promotion.

Most of those have nothing in the codebase to attach to. A creation screen that offers a choice with
no consequence is false agency, and the Archetypes make the exposure worse than it looks: each of the
four is a permutation of `{5,4,2,1}` and each owns a *different* Pillar at 5, so a single inert Pillar
does not shade one build — it guts one whole Archetype, whose defining strength would be advertised
and then never felt.

So three things need deciding: which effects are real in v1, what happens to the rest, and whether
the choice a player makes at creation is perceptible within the onboarding window it is made in.

## Proposal

**Ship five Bindings across the four Pillars, using only systems that already ship.**

| Pillar | Binding | Seam | Dimension | First legible |
|---|---|---|---|---|
| Tactical Acumen | Tactical instruction effectiveness | `tactical-modifiers.ts` resolved instructions | magnitude | first match |
| Influence | Selling-club response to a Bid | `decideAiSellerResponse` | threshold / counter magnitude | before Matchday 1 |
| Regimen | Condition lifecycle | `conditionDecayPerMinute`, `conditionAfterDays` | rate / duration | across matches |
| Regimen | Injury severity | `resolveSeverity` cutoffs | severity | at or near first match |
| Technical Coaching | Focused development | `TRAINING_FOCUS_MULTIPLIER` in `developPlayer` | magnitude | season conclusion |

Every unsupported effect is classified individually as **shipped**, **deferred**, or **cut**. An
effect is deferred only when a named, existing effort owns the prerequisite system; otherwise it is
cut and the Pillar's glossary entry is narrowed so it stops promising it. Scouting is the only
remaining deferral. Board negotiation, loyalty, motivation, dressing-room harmony, media handling,
disciplinary style, coaching workload, opponent analysis, and youth promotion are all **cut from v1**,
and `CONTEXT.md` has been narrowed accordingly.

### Man-Management is renamed to Influence

The second Pillar's only shipped surface is `decideAiSellerResponse(amount, value)`, which decides a
**selling club's** response to a fee against that player's Transfer Value: accept at or above 1.0x,
counter between 0.85x and 1.0x, reject below. There is no player persuasion, no agent, no wage
negotiation, no promised squad role, and no dressing-room interaction anywhere in the transfer
system. Binding a Pillar named *Man-Management* there asserts that a manager who handles their own
players well causes a rival club to value its player differently, which is false.

Narrowing the glossary entry would have documented the mismatch rather than removed it, and would
have left a future engineer finding `manManagement` inside a seller-valuation function to conclude
either that the transfer model included interpersonal negotiation or that the dependency was
misplaced. Neither would be true. The Pillar is therefore **Influence**: the manager's effectiveness
at affecting decisions made by other football actors. That is honest about the club-to-club mechanic
that ships, and leaves semantic room for player persuasion, agents, dressing-room leadership, media,
and board relations to arrive later without the name having to be corrected twice.

The rename is total. No `manManagement` alias is retained — nothing has shipped that requires
compatibility, and an alias would carry the misleading term into exactly the code that motivated
removing it. The Archetypes are unaffected: The Motivator remains `2/5/4/1` and its fiction narrows
truthfully to a persuasive personality who gets other clubs to deal on favourable terms.

### Influence must not overwrite the seller's valuation

The selling club retains valuation agency. Influence shifts the acceptance boundary, the counter
boundary, or the counter magnitude *around* the existing Transfer Value; it never rewrites the value
itself and never produces automatic acceptance. Influence 5 must not let a manager buy any player at
an implausible fee.

### Technical Coaching scales the decision, not the baseline

`developPlayer` has two multipliers: `PLAYER_DEVELOPMENT_FRACTION`, the baseline every Attribute
receives, and `TRAINING_FOCUS_MULTIPLIER` (~1.5x), applied only to the focused Category. Technical
Coaching scales **the focus multiplier**. Scaling the baseline would make the Pillar a passive rate
bonus that rewards no decision — an Academy Head would profit identically whether they engaged with
training or ignored it entirely. Scaling the focus multiplier makes the Pillar and the manager's
action multiply each other, which is the correct fiction for a *coaching* skill, and lets the
creation screen honestly say it improves the players you choose to develop.

**Hard invariant:** `TRAINING_FOCUS_MULTIPLIER * technicalCoachingModifier(v) > 1.0` for every legal
`v`. Technical Coaching 1 may make focusing much less effective than at 3, but setting a Training
Focus must never become worse than setting none — that would invert the meaning of the manager's
decision and build the soft lock the Pillar model forbids.

### Regimen's two Bindings, and why there is no third

The Condition Binding covers both in-match decay and between-match recovery. These are two functions
but one Binding: preparation that improves in-match stamina without improving recovery is an
incoherent fiction. Directionally, higher Regimen must never increase decay or reduce recovery, and
lower Regimen must never make participation impossible or prevent recovery entirely.

No direct injury-*occurrence* modifier is added. The non-contact injury check only rolls below the
75% Condition threshold, so the Condition Binding **already** reduces how often a player is exposed to
that roll. Adding an occurrence coefficient would apply Regimen to injury frequency twice. The
resulting model is clean: Regimen reaches frequency indirectly through authoritative Condition state,
and severity directly through the cutoff adjustment.

### Onboarding legibility

The effort's destination ends at the first match, so at least one consequence must land inside that
window. Two do, and both are required rather than either-or:

- Before Matchday 1, the player must be able to encounter a seller response materially influenced by
  Influence. The pre-season Transfer Window is already open (`isWindowOpen` is true for `pre_season`),
  so this needs no new system.
- No later than first-match completion, the player must receive legible feedback that Tactical Acumen
  affected tactical resolution.

Regimen and Technical Coaching are permitted to resolve slowly, provided the creation screen discloses
which Pillars pay out immediately and which accumulate. A player must never read a delayed Pillar as
an inert one.

Any Pillar explanation must correspond to a real resolver contribution. Cosmetic copy selected from
the Pillar value alone, independent of whether the Pillar changed the result, does not satisfy this —
and transfer copy specifically must not mention persuasion, agents, wages, or squad roles, none of
which exist.

**Scope split:** this decision owns the causal contract — passing the Pillar in, applying the
modifier, neutral behaviour at 3, bounded effects at 1 and 5, and emitting structured causal
information tied to the actual calculation. The choice of player-facing surface (post-match panel,
tooltip, inbox message) belongs to the contextual-help decision, which owns the game's explanation
budget.

## Determinism and replay

Match-relevant Pillars enter the engine as **explicit parameters**. `conditionDecayPerMinute` and
`resolveSeverity` are pure functions and stay that way; nothing reads `manager_profile`, a repository,
or ambient context from inside the engine.

Separately, the **complete** Pillar Distribution — all four values, not just the two that currently
enter match resolution — is recorded in the `MatchStarted` payload. `PersistedMatchStarted` already
exists as a frozen kickoff snapshot of both squads and Tactics, for precisely this reason: re-reading
live tables would let an unrelated `ChangeTactics` retroactively rewrite the kickoff tactic a match
already resolved minutes of play against. Pillars are the same class of input and get the same
treatment. Historical replay reads the snapshot, never the current profile.

Snapshotting all four costs four small integers, keeps the record shape stable when another Pillar
gains a match Binding, and removes any ambiguity about partial snapshots. Raw Pillar values are
stored rather than derived coefficients, so the record stays domain-meaningful and inspectable.

This partially amends the earlier reasoning that immutability made a snapshot unnecessary. Pillars
remain immutable in v1 and `manager_profile` remains authoritative for the current profile — no
Decider, no `ManagerCreated` event. But whether Pillars change over a career is still open fog, and if
it ever resolves to yes, every stored match would silently replay wrong. The snapshot decouples
replay correctness from that unresolved question.

Only `startMatch` builds `PersistedMatchStarted`, and it runs only for the human's fixture, so the
field is required and non-null. AI-vs-AI fixtures resolve on a different path and are untouched.
Notably, no default Pillar Distribution is invented for AI managers: a placeholder `3/3/3/3` would
silently settle a domain question nobody asked and would be hard to remove later.

## Out of scope: ruleset versioning

The Pillar snapshot protects replay from one drift source — a future change to the manager's
Distribution. It does nothing about changes to the tactical, Condition, injury, or development
*formulas*. That hazard is real and pre-existing: a tuning change to `PLAYER_DEVELOPMENT_FRACTION`
today already changes how historical matches replay. The simulation has no ruleset-version concept,
and `ADR-0007` treats replay as fully determined by the `MatchStarted` seed plus the command journal.

This is deliberately not fixed here. It is an effort-wide determinism concern that would be equally
true if Manager Pillars were never built, and folding it in would let a replay-versioning design
swallow an onboarding spec. A feature-local `managerPillarRulesVersion` is specifically rejected: it
would give incomplete protection while implying replay was generally version-safe. Ruleset versioning
deserves its own ADR.

## Alternatives considered

- **One Binding per Pillar** (the original defensible minimum). Rejected once the premise behind it
  collapsed. The ticket was framed on a survey claiming Scouting, the injury system, and Training were
  all mid-design; in fact Training and the injury system are **shipped** — all five Training tickets
  are resolved with `TRAINING_FOCUS_MULTIPLIER` live, and `injury.ts` is wired through `simulate.ts`,
  `match.ts`, `squad.ts`, and `season.ts`. Only Scouting is genuinely in flight. With six real seams
  available, holding to one Binding each would have been an artificial scarcity rule outliving the
  scarcity.
- **A second Binding for Technical Coaching**, using both `developPlayer` multipliers. Rejected: both
  resolve at the same `SeasonConcluded` boundary and express the same fantasy, so a second one adds
  implementation surface without touching the Pillar's actual problem, which is legibility. Distinct
  arithmetic insertion points are not automatically distinct domain Bindings.
- **Keeping the name Man-Management and narrowing its glossary entry** to "modifies transfer
  negotiation". Rejected as documenting the mismatch instead of removing it — see above.
- **Renaming to Negotiation.** Fits the current seam more precisely but is too narrow: it would create
  pressure to force motivation, dressing-room influence, leadership, and media handling through a
  bargaining concept none of them are.
- **Accepting that Man-Management has no honest Binding** and letting it ship inert. Rejected — it
  violates the rule that every Pillar binds, and would make The Motivator advertise a strength that
  does nothing.
- **Deferring the unsupported effects wholesale** rather than cutting them. Rejected: "deferred"
  without a named owning effort is a holding pen for desirable ideas, and it leaves the glossary
  describing mechanics that will never exist.
- **Giving AI managers Pillar Distributions** so every fixture snapshots uniformly. Genuinely
  attractive — authored AI managers would make the league feel less uniform — but it is a new system
  rather than a Binding, and belongs to its own effort.
- **Storing derived coefficients** on the match instead of raw Pillars. Rejected: coefficients lose
  domain meaning and inspectability, and do not survive a formula change any better than raw values.

## Acceptance criteria

1. Five Bindings ship: Tactical Acumen to tactical resolution; Influence to selling-club negotiation;
   Regimen to the Condition lifecycle; Regimen to injury severity; Technical Coaching to focused
   development.
2. Every Binding consumes an explicit Pillar value and can materially change authoritative state or an
   authoritative decision result. Storing, displaying, or describing a Pillar does not count.
3. `Influence` replaces `Man-Management` in domain types, persistence, UI, glossary, Archetype
   definitions, tests, and fixtures. No deprecated alias exists.
4. Before Matchday 1, a seller response materially influenced by Influence is reachable.
5. No later than first-match completion, feedback attributable to Tactical Acumen's effect on tactical
   resolution is available.
6. Pillar explanations derive from actual resolver contributions, never from the Pillar value alone.
7. `TRAINING_FOCUS_MULTIPLIER * technicalCoachingModifier(v) > 1.0` at every legal `v`.
8. Regimen has no direct injury-occurrence modifier; frequency is mediated only by Condition.
9. Higher Regimen never increases Condition decay or reduces recovery; lower Regimen never prevents
   participation or recovery.
10. Match-relevant Pillars enter the engine as explicit parameters; the engine reads no ambient
    manager state.
11. `PersistedMatchStarted` carries the complete four-value Distribution as a required field.
12. Replay resolves Pillars from the match snapshot, never from `manager_profile`.
13. No Manager Decider and no `ManagerCreated` event is introduced.
14. No Pillar Distribution is assigned to AI managers.
15. Every claimed Pillar effect is classified shipped, deferred, or cut, and `CONTEXT.md` promises
    only shipped behaviour plus explicitly named deferrals.
16. Each Binding is covered by deterministic tests.

## Risks

- **The rename has a blast radius that is cheap now and expensive later.** Creation copy, Archetype
  descriptions, `CONTEXT.md`, domain types, persistence naming, tests, and the earlier Pillar note all
  carry the old term. Nothing has shipped, so the cost is paid once; deferring it until save files and
  formulas depend on `manManagement` would multiply it.
- **Influence's fiction is still a stretch, just a smaller one.** A manager personally shifting
  another club's board is plausible but not obvious. The name buys honesty about *which* actors are
  involved, not a fully satisfying causal story. If a player-side negotiation system ever ships, the
  Pillar's centre of gravity should move there.
- **Two of five Bindings pay out over a season**, so most of the Pillar system remains invisible during
  onboarding. The disclosure requirement mitigates this but does not remove it; if playtesting shows
  players still read Regimen and Technical Coaching as inert, the answer is better disclosure or a
  faster-reading Binding, not louder flavour text.
- **The legibility contract can be satisfied dishonestly.** Nothing mechanical prevents emitting
  Pillar flavour whenever the value is high rather than when it changed the result. This needs a test
  asserting the explanation tracks the calculation, not just its presence.
- **Tuning is entirely undecided.** Every Binding here has a named seam and a permitted dimension but
  no numbers. A Binding that is real but negligible satisfies every criterion above while failing the
  player, and that failure will only surface in playtesting.
- **Ruleset versioning is knowingly left open.** Historical replays remain vulnerable to formula
  changes. This is recorded rather than solved, and the longer it stands the more stored matches
  accumulate against it.
