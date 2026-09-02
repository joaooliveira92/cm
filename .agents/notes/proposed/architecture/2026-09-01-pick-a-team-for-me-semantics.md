# Agent Note: `Pick a team for me` is an unseeded, exclusion-rolled assist

Status: proposed

## Problem

The Club Selection screen offers a `Pick a team for me` button whose behaviour is not specified:
uniform random across clubs and select-and-stay (the pick highlights a club and leaves the user to
press Continue rather than advancing the step) are settled, but the mechanism behind them is open.
The world is seed-reproducible — every club carries a `generation_seed` and the save's
`generation_manifest.world_seed` reproduces the whole world — which raises the question of whether
a "random" suggestion should carry the same reproducibility, and whether the button's presses are
allowed to produce a no-op. A selection surface that changes the detail panel without the user's
pointer or keyboard moving has to say what the user hears and where focus goes.

## Proposal

**The pick is one press of `Math.random()` over the loaded club list, excluding the currently
selected club.** It selects a club and stays (settled at charting), and the suggestion carries no
reproducibility.

- **Unseeded.** A fresh `Math.random()` per press. The pick is an assist: it bounds a decision the
  user then makes, not generated content that must come back identically on regeneration. Seeding
  it would require the world seed to reach the renderer — today `getClubSelection` returns the
  clubs and no seed — for a reproducibility nobody consumes: the selection survives, the suggestion
  does not. The save is still fully reproducible, because the suggestion is never persisted.
- **Exclusion-rolled.** Pressing again re-rolls across every loaded club except the one currently
  selected. A one-in-twenty "pick again → same club" reads as a broken button; the press must
  always be observable. With one club it is a no-op in a corner that disappears once a pick exists.
- **Every club loaded, not a league.** The pick draws from the club list as loaded. There is no
  filtering to honour: the league selector is degenerate (one inert option) and search/filter is
  out of scope, so today "every club" and "the filtered league" are the same set. Narrowing the
  pick to a league the selector does not filter would be fictional behaviour. Whether a future
  multi-league world narrows the pick is that effort's decision, not contracted here.
- **Focus stays on the button; the result is announced.** The picked club is announced via an
  `aria-live` region (e.g. "Picked X. The panel shows X."); focus does not move into the row.
  Select-and-stay's next action is Continue in the shell chrome, so jumping focus into the list
  would force the user to navigate back out of it. The row's own reading and whether the panel is a
  live region belong to the keyboard-and-accessibility-tier decision.
- **Subdued, below the list, verbatim `Pick a team for me`.** The screen's real decision is
  picking a club by hand; an assist must not compete with the rows' affordance. The button disables
  while the rail has nothing to pick from (list loading or failed), since a pick over zero rows is
  meaningless.

## Alternatives considered

- **Seeded from the world** — derive the pick from `generation_manifest.world_seed` the way
  `season.ts` seeds its fixtures from it, so the same save always suggests the same club. Lost: the
  suggestion is not persisted and not part of the reproducible world, and the renderer has no
  access to the seed today; the cost is a new main-process surface for a guarantee nothing
  consumes. Precedent `2026-08-29-human-fixture-pre-match-boundary.md` warns that a *re-rollable*
  seed in the player's hands invites quit-and-retry-to-win; here the asymmetry is the point of the
  assist and nothing of consequence follows a re-roll, but the two decisions are not in conflict
  because this seed is never persisted.
- **Re-roll may return the current club.** The cleanest uniform semantics. Lost to the perceived
  no-op: an assist whose press is not guaranteed to change its suggestion reads as broken at
  one-in-twenty odds.
- **Not excluding, no exclusion at one club.** The exclusion corner is degenerate: with the pick
  disabled until a club exists there is nothing selected to exclude, and a list of one row has no
  second row to roll into.

## Acceptance criteria

- Pressing `Pick a team for me` selects a club other than the one currently selected, when one is
  selected; with nothing selected it selects a uniformly random club from the loaded list.
- Re-pressing always changes the selection in a list of more than one club.
- The suggestion is not seeded: the same save can suggest different clubs across presses, and no
  pick result is persisted anywhere.
- Focus remains on the button; the announced text names the picked club.
- The button is disabled while the list is loading or failed, and appears subdued below the list.
- Picking does not advance the step; Continue remains the user's action.

## Risks

- **The pick is unseeded by design, so a save is not state-complete across presses** — acceptable
  because nothing downstream reads the suggestion; the world itself stays reproducible.
- **`Math.random()` is not cryptographically strong and not testable as such.** The property tested
  is exclusion and membership, not the distribution; a uniform-enough PRNG in app code is fine.
- **"Every club loaded" narrows the assist's meaning the moment a real filter exists**, and that
  effort must remember the pick does not share the filter's shape.

## Related

- Ticket: `.scratch/club-selection/issues/05-pick-a-team-for-me-semantics.md`
- The screen this affordance lives on:
  [The Club Selection two-column workspace](2026-09-01-club-selection-workspace-shape.md) (settles
  select-and-stay, uniform random, and the pick being mounted with the rail's chrome)
- The announcement half this ticket hands off:
  `.scratch/club-selection/issues/06-keyboard-and-accessibility-tier.md`
- Selection state the picked club writes into:
  [The club selection is bound to the world it was picked from](2026-09-01-club-selection-bound-to-its-world.md)
- World-seed reproducibility and the "no unseeded content" rule:
  [Deterministic world generation and the Drizzle schema](../../implemented/architecture/2026-09-01-deterministic-world-generation-and-drizzle-schema.md)
- Unseeded randomness warning that this decision does not conflict with:
  [Human fixture pre-match boundary](../../proposed/architecture/2026-08-29-human-fixture-pre-match-boundary.md)