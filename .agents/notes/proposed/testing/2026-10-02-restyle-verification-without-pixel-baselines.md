# Agent Note: Restyle verification without pixel baselines

Status: proposed

## Problem

The CM 03/04 restyle changes how every screen looks, across about eight slices run by parallel
sessions. Each slice needs evidence that its screens look right, read clearly and still work,
without adding minutes to the ten-minute suite or creating a check that fails for reasons
unrelated to the slice.

## Proposal

- **A kept screenshot spec, outside the normal run.** One committed Playwright spec seeds a career
  and captures every screen of a group at 1440×900 and 1085×717 (the window size that exposed the
  squashed Tactics pitch). It is tagged `@screenshots`, excluded from the default run, and run on
  demand with `--grep @screenshots`.
- **Screenshots are compared by eye, never by pixel.** They go to a git-ignored folder, and the
  ticket's resolution lists what was captured. No `toHaveScreenshot` baselines are committed.
- **Contrast is gated on the colour values.** A unit test in `check:all` checks every text role
  against its panel colour, composited over the darkest and the brightest backdrop sample, at WCAG
  AA. It covers both CM yellows. The axe checker may be run on rendered screens as advice only.
- **Each slice runs its own Playwright specs**: the ones the
  [inventory](../../../../.scratch/cm-restyle/inventory.md) lists for its screens, plus any spec that
  visits them. The foundation slice and the closing slice run the full suite.
- **A slice fixes the tests it breaks.** Class-name assertions in unit tests and Playwright specs
  whose visible text or roles changed are updated in the slice that changed them, never in a later
  sweep.

## Alternatives considered

1. **Committed pixel baselines (`toHaveScreenshot`).** Rejected: font rendering and the
   photographic backdrop differ across machines, so baselines fail without a regression, and every
   slice of a restyle churns them on purpose, which trains people to re-accept diffs unread.
2. **Throwaway screenshot specs per ticket.** Rejected: eight slices would rewrite the same seeding
   and navigation, and drift between them.
3. **Axe as the contrast gate.** Rejected: over translucent panels and photographs it reports most
   text as "incomplete", so it cannot pass or fail reliably. It stays as an advisory check.
4. **Running the full Playwright suite per slice.** Rejected as the default: about ten minutes per
   run, under load from parallel sessions, which is where today's timeout flakes come from.

## Acceptance criteria

- `--grep @screenshots` captures every screen of a named group at both sizes; the default run does
  not execute it.
- The contrast test fails when any text role drops below AA on a panel over either backdrop sample.
- No committed screenshot baselines exist.

## Risks

- Eye comparison misses a regression on a screen nobody looked at. The closing slice's screenshot
  pass over every group is the backstop.
- Two backdrop samples may not bound every photo. If a backdrop proves brighter, add it as a third
  sample rather than loosening the threshold.
