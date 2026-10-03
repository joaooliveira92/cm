# Decision Request: what makes a `CareerDestination` a top-level career screen?

## Question

`CAREER_SCREEN_TYPES` (`src/renderer/navigation/destinations.ts:132`) holds 22 of the
`CareerDestination` union's 45 members. What rule decides which 22? No written criterion matches the
actual contents.

## Why this is blocking

Not blocking any screen. It blocks a *guard* from being correct.

Ticket 06 made the classification compulsory: every union member must be listed either in
`CAREER_SCREEN_TYPES` or in the sub-surface record, or `pnpm -r typecheck` fails. That closes the
gap where a forgotten screen silently weakened four tests. But the compiler can only force a
*choice* — it cannot check the choice is right. Someone adding a screen today has no rule to apply,
so they will copy whichever neighbour looks similar, and the list will drift the way the frozen
literals it replaced drifted.

## What is already settled

- The classification is total and disjoint — enforced at the type level, ticket 06.
- `CAREER_SCREEN_TYPES` is not derivable from the union's shape. Nothing about a member's fields
  says which kind it is.
- Screens that name a second entity (`playerId`, `clubId`, `matchId`) are genuinely not top-level:
  they cannot be built from a save alone, so the navbar could not link them if it wanted to. That
  part of the boundary is sound and is not in question.

## The two obvious criteria, both false

**"It has a `g <key>` binding."** The array's own doc comment (`destinations.ts:130`) says "the
persistent career screens a `g <key>` binding *may* target". There are 7 `g` nav actions resolving
to 6 distinct destinations (`squad`, `tactics`, `transfers`, `league`, `news`, `manager`). So 16 of
the 22 have no binding, and the criterion does not separate the list from its complement.

**"It is a navbar item."** Six sub-surfaces are first-class `NavItem`s in `nav-config.ts`, siblings
of entries that *are* top-level:

| Sub-surface | Navbar item | Sits beside |
|---|---|---|
| `transferHistory` | `recruitment-transfer-history` | `recruitment-shortlist` → `shortlist` (top-level) |
| `contractExpiry` | `recruitment-contract-expiry` | same |
| `budgetReview` | `recruitment-budget-review` | same |
| `scoutingAssignment` | `recruitment-scouting-assignment` | `recruitment-scouting` → `scouting` (top-level) |
| `scoutingKnowledge` | `recruitment-scouting-knowledge` | same |
| `trainingCoaching` | `training-coaching` | `training-overview` → `training` (top-level) |

Each is one navbar action away from anywhere in a career, exactly like its top-level sibling.

## Options

### Option A — top-level means "the navbar can reach it from anywhere with a save"

- **What it changes**: `transferHistory`, `contractExpiry`, `budgetReview`, `scoutingAssignment`,
  `scoutingKnowledge` and `trainingCoaching` move into `CAREER_SCREEN_TYPES` (22 → 28). Sub-surfaces
  become exactly the things that need a second entity, plus the match-context screens and the ones
  reached only from another screen.
- **What it buys**: the criterion becomes *checkable*, not just recorded — a test can derive the
  list from `nav-config.ts` and the guard stops depending on judgement.
- **What it costs**: the two lists stop matching the `g`-binding story in the doc comment, which
  would need rewriting. If a `g` binding is later meant to exist for every top-level screen, that is
  28 bindings against 7 today.

### Option B — top-level means "has, or is eligible for, a `g <key>` binding"

- **What it changes**: the criterion is honest about being about *keyboard* reachability. Probably
  shrinks the list toward the 6 bound destinations, or formalises the 16 unbound as a backlog.
- **What it buys**: matches the array's existing doc comment and the `AC-16/AC-14` test names.
- **What it costs**: "eligible" is still judgement unless the eligible set is enumerated, which is
  the same problem again. And it makes `CAREER_SCREEN_TYPES` a keyboard concept while three of its
  consumers use it as a navigation concept.

### Option C — split the concept

- **What it changes**: two lists. One for "reachable from the navbar in one action", derived from
  `nav-config.ts`. One for "has a `g` binding", derived from `ALL_ACTIONS`. `CAREER_SCREEN_TYPES`
  stops existing as a third, hand-kept thing.
- **What it buys**: both lists become derivable, so no classification record is needed at all and
  ticket 06's guard can be deleted as redundant.
- **What it costs**: the most work; touches every consumer of `CAREER_SCREEN_TYPES`
  (`allActions`, `stage2`, `adapter-coverage`, `registry`, `route-index`, `club-staff-route`,
  `team-scout-report-route`).

## Recommendation

**Option A**, then revisit C if the keyboard story grows.

The six contested screens behave identically to their top-level siblings from a manager's point of
view — same navbar, same one action, same persistence across a career. Classing them as
sub-surfaces is a statement about how they were *built* (added later, off an existing hub) rather
than about what they *are*, and that is exactly the kind of distinction that decays once the person
who made it moves on.

A is also the only option that turns the ticket-06 guard from "forces a choice" into "checks the
choice", which is what would stop this list drifting again. C is strictly better and strictly more
expensive; it is worth doing when someone is already in `nav-config.ts` for the
[`g 8` work](../navbar-keyboard-intent/issues/02-world-section-advertises-a-dead-g-key.md).

---

## Answer — Option A, 2026-09-19

**A career destination is top-level when the navbar can reach it from anywhere with a save loaded.** The
six contested screens — `transferHistory`, `contractExpiry`, `budgetReview`, `scoutingAssignment`,
`scoutingKnowledge`, `trainingCoaching` — move into `CAREER_SCREEN_TYPES`, 22 → 28.

They behave identically to their top-level siblings from a manager's point of view. Classing them as
sub-surfaces described how they were *built*, not what they *are*, and that kind of distinction decays.

**The part that makes this durable** is the second half: a test derives the expected set from
`nav-config.ts`, so ticket 06's guard goes from *forcing* a choice to *checking* it. Without that, this
answer is just another hand-kept list with a nicer rationale.

**One fact has changed since this was filed, in Option C's favour.** `navbar-keyboard-intent` tickets
02–04 have since made section `g <n>` keys derive from `NAV_SECTIONS` and deleted `CAREER_G_BINDINGS`, so
`nav-config.ts` is already the derivation source for the keyboard spine. Half of C's work is done, and C
remains the end state — worth taking the next time someone is in `nav-config.ts` anyway.

Recorded as
[a career destination is top-level when the navbar reaches it](../../.agents/notes/proposed/architecture/2026-09-19-top-level-means-the-navbar-reaches-it.md).
Decided under the human's standing delegation ("i need you to solve the decisions").
