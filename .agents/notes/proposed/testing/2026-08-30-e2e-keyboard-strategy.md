# Agent Note: e2e keyboard strategy

Status: proposed

## Problem

Once the renderer is keyboard-first, the Playwright suite — today 38 `click()`, 7 `fill()`, 3
`selectOption()` calls and zero keyboard or focus interaction across `app`, `journeys`,
`error-paths` and `save-management` specs — is exercising the secondary interaction path. The suite
must be re-targeted without doubling its runtime (already serialized at `workers: 1`,
`fullyParallel: false`) and without inventing testability seams the prior e2e efforts refused.

## Proposal

- **Convert, do not duplicate.** The journeys that reach level-3 screens (Match Day, Transfers,
  Tactics, Squad) get rewritten to drive by keyboard. Creation, save-management, and error-paths
  specs stay mouse-driven — those surfaces stay mouse-centric. Keyboard becomes the primary asserted
  path exactly where the app is keyboard-first; the left-behind click specs remain a real regression
  net for a still-shipping mouse path.
- **Coverage targets, in priority order:** `g <key>` screen navigation, the command palette
  (`Primary+K`), one dense grid (the Squad table's row-oriented roving), the two-step Match Day
  substitution flow, and Escape layering (topmost-layer-only close). These are the global invariants
  and the two riskiest focus implementations. Text-input suppression and the help overlay are not
  authored unless a converted journey hits them.
- **Selector strategy: uphold the no-seam line.** Assert focus position with Playwright's
  `toBeFocused()` on role/text locators, and assert the ARIA states the focus model carries anyway
  (`aria-selected`, `aria-current`). No `data-testid` attributes are added for testability. The line
  breaks only if a real interaction proves unaddressable without one, and the break is recorded here.
- **Reliability contract unchanged.** `retries: 2` CI-only, per-test `timeout: 30_000` still hold.
  Keyboard tests wait on focus transitions, so author against auto-retrying `toBeFocused` assertions
  rather than manual waits; identity-based async focus restoration (ticket 06) is the flake case the
  contract's tolerance exists for.

## Alternatives considered

- **Duplicate every journey** (clicks plus keyboard). Rejected: doubles the runtime of a suite
  already serialized, to re-prove a mouse path the tiering demotes to secondary.
- **Keyboard smoke only.** Rejected: a handful of `press()` calls does not exercise focus
  restoration, roving, or the substitution flow, which are the code most likely to break.
- **Convert everything.** Rejected: creation/save-management/error-paths stay mouse-centric, and a
  keyboard-rewrite of them buys nothing the mouse clicks already prove.
- **Add `data-testid`s**. Rejected: the prior e2e efforts held a hard line against app testability
  seams; focus is assertable through role/text locators plus ARIA, so no seam earns its cost yet.
- **Loosen the reliability contract** (longer timeouts or higher retries for keyboard specs).
  Rejected: the flake modes differ but the contract's CI-only retries already absorb them if tests
  assert via `toBeFocused`.

## Acceptance criteria

- Level-3 journeys drive via keyboard; the other three specs remain click-based, and the suite
  passes as a whole.
- A keyboard test proves each of: `g <key>` navigation, palette open-and-command, Squad row roving,
  the Match Day substitution flow, and single-layer Escape close.
- No `data-testid` or other test-only attribute exists in `apps/desktop/src/`, **except the six
  recorded under "Recorded break" below**.
- Existing click tests survive unchanged (only locator/label copy edits if a surface's copy
  changes), and the gate records their results before and after the keyboard landing.
- The reliability contract values are unchanged.

## Recorded break: `data-testid` in the Active Leagues surface

The no-seam line above provides for exactly this — "The line breaks only if a real interaction
proves unaddressable without one, and the break is recorded here." Recording it, 2026-09-05, found
while repairing the e2e suite.

Six `data-testid` attributes exist in `apps/desktop/src/`, all in `renderer/activeLeagues/`, and
they are load-bearing for ~24 unit-test call sites plus one e2e assertion
(`e2e/active-leagues-setup.spec.ts` reads the entity total). They split cleanly in two, and the
distinction is what the next agent needs:

**Three are redundant — an accessible locator already exists, so these can be deleted for free:**

| testid | already addressable as |
|---|---|
| `consequence-sidebar` | `<aside aria-label="Setup consequences">` → `getByRole("complementary", { name })` |
| `processing-cost-meter` | `role="meter"`, name "Processing cost" |
| `setup-status` | `<section aria-labelledby="setup-status-heading">` → `getByRole("region", { name })` |

**Three are genuine gaps — the element has no role and no accessible name:**

| testid | what it marks | why it is unaddressable |
|---|---|---|
| `entity-count` | the loaded-entity total | a bare `<p>`; the number a player reads has no name of its own |
| `scope-summary` | the "N active leagues across M nations" line | a bare `<p>` |
| `league-list-region` | the screen's one scrolling region | an unlabelled `<div>` |

The second group is the more interesting finding: each is a value or landmark a *screen-reader user*
also cannot address, so the missing semantics are an accessibility gap first and a testability gap
second. Giving `entity-count` and `scope-summary` a live-region role with a name, and
`league-list-region` a landmark role, would close both at once and let all six attributes go.

Not done here, deliberately: those files were under active edit by a parallel session at the time,
and deleting the attributes would have broken its ~24 call sites mid-flight. The cleanup is cheap
and safe to do the next time this surface is touched.

## Risks

- Roving-focus tests may race React re-renders; the mitigation is `toBeFocused` auto-retry, which
  assumes stable retry semantics are exercised in CI where `retries: 2` is active.
- The no-seam line could make an obscure interaction slow to assert; the deliberate escape hatch is
  recorded decision to add a seam, not a silent one.
- `aria-selected` on grid rows is a11y-correct only if the focus model emits it; if it does not, the
  assertion is a false contract and must track the ARIA spec, not invent semantics.