# Validation Report: group-a-reconciliation ticket 20

## Sprint

- Effort: `.scratch/group-a-reconciliation/`
- Tickets closed: `20-quit-dialog-hidden-under-router-overlays`
- Ticket opened: `21-quit-dialog-under-base-ui-modals` (from the review; a decision precedes its fix)
- Branch: `dev` (no feature branch, per `.ai/AUTONOMOUS-AGENT.md` § Git policy)

The ticket was found already `Status: claimed` from commit `4a5b2bb` with nothing landed behind it —
a prior session claimed it and stopped. Resumed rather than skipped.

## What shipped

`QuitGuard` moves off the shared `MODAL_SCRIM` (`z-40`) onto a new `MODAL_SCRIM_TOP` (`z-[60]`).

The ticket under-counted the problem. It described one tier of overlays at `z-40` and proposed
raising the dialog above it. There are two: ten hand-rolled overlays share `MODAL_SCRIM` at `z-40`,
where DOM order breaks the tie, and the vendored shadcn/Base UI surfaces portal to `document.body`
at `z-50` and outrank all of them outright. A fix that cleared only the first tier would have left
the bug half-present. `z-[60]` clears both. Verified by auditing every `z-*` in the renderer: nothing
sits above 50.

No stacking-context trap: `QuitGuard`'s only DOM ancestor is `#root`; `HotkeysBoundaryProvider` is
`HotkeysProvider` (`hotkeys.ts:57`), which renders no element, and `index.css` gives `html, body,
#root` only `height`. `#root` creates no stacking context, so `z-[60]` competes in the root stacking
context and therefore also beats the surfaces that portal to `document.body`.

## Acceptance criteria → evidence

| # | Criterion | Proving test | Result |
|---|---|---|---|
| 1 | Quit dialog visible, topmost, buttons receive clicks with an overlay open | `e2e/quit-guard-over-overlays.spec.ts` | **pass, observed** (splash). Help overlay and command palette pass by construction — both compose `MODAL_SCRIM` with alignment overrides only, verified by reading `HelpOverlay.tsx:248` and `CommandPalette.tsx:133`; not separately pinned by a test |
| 2 | A test proves it for at least the splash | same spec | **pass** |

`toBeVisible()` is not the assertion here — the dialog was laid out and painted even when fully
covered. The occlusion assertion is `hover()` / `click()`, which run Playwright's hit-target check.

### Mutation check — observed, both directions

The reviewer argued the test kills the mutant but was read-only and could not run it. The
orchestrator ran it.

- Fix reverted to `MODAL_SCRIM`, renderer rebuilt, spec re-run → **1 failed**, with
  `<span>Navigate sections (g 1 Squad, g 2 Tactics…)…</span> from <div class="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"> subtree intercepts pointer events`
  at `quit-guard-over-overlays.spec.ts:46` — the splash card eating the click, which is the reported
  bug. A pointer-interception failure, not a timeout or a worker stall.
- Fix restored, rebuilt, re-run → **1 passed (2.1s)**.

## Gate

| Gate | Command | Result |
|---|---|---|
| typecheck | `pnpm -r typecheck` | **pass** (covers `e2e/`, so the new spec is typechecked) |
| lint | `oxlint .` | **fail — pre-existing.** 12 errors, none in this diff's files. Changed files lint clean |
| effect-lint | `tsx scripts/effect-lint.ts` | **pass** — no violations, 866 files |
| verify-md-links | `tsx scripts/verify-md-links.ts` | **fail — pre-existing.** 18 broken, unchanged before and after; none under `group-a-reconciliation` |
| verify-db-schema | `tsx scripts/verify-db-schema.ts` | **pass** |
| test | `pnpm -r test` | **fail — pre-existing.** 61 failed / 1884 passed |
| e2e | `pnpm --filter @cm-clone/desktop test:e2e` | 42 passed, 4 failed — all four pre-existing |
| determinism | — | not applicable: no simulation, seeding or Player Development path touched |
| save compatibility | — | not applicable: no persistence or schema change |

### The pre-existing failures, confirmed by stashing this diff and re-running

`pnpm check:all` was already red on `dev` before this sprint. Verified, not assumed:

- **lint** — 12 errors at clean HEAD, in `packages/contracts/src/rpc.ts`, `PlayerContractScreen`,
  `PlayerProfileScreen`, `MatchHomeTeamScreen`, `MatchPreviewScreen`, `main/career/player.ts` and
  `budget-review.test.ts`. None is a file this diff touches.
- **verify-md-links** — 18 broken at clean HEAD, all under
  `.scratch/group-c-club-information/RECONCILIATION.md` and
  `.scratch/group-d-player-and-staff-records/`. Still exactly 18 after this diff.
- **test** — 61 failures, all `ReferenceError: window is not defined` at
  `src/renderer/navigation/scroll-state.ts:21` via `navigation/adapter.ts`. Stashed the diff and ran
  `test/renderer/router/team-scout-report-route.test.ts` at clean HEAD: **identical failure**. No
  import-graph overlap with the changed files.
- **e2e** — the four failures are `development-centre`, `performance-report`, `training-plan`,
  `training-workload`, all Training-section navigation (`heading "Coaching Assignments"` not found).

None is folded into this sprint's repair, per `.ai/AUTONOMOUS-AGENT.md` § Failure policy. They need
their own tickets; the unit-test and Training-e2e clusters in particular are repo-level and block a
green gate for every future sprint.

## Review

APPROVE, no blocker or high. Four findings were acted on before commit:

- **[MEDIUM]** The `main.tsx` comment claimed mounting ahead of the router protects the quit guard
  from a router error. Verified false — the renderer has no error boundary at all, so an uncaught
  throw unmounts the whole React root regardless of sibling order. Comment rewritten to the true
  reason (app-level, not route-level).
- **[MEDIUM]** The `MODAL_SCRIM_TOP` comment claimed "one layer above *everything*". Verified
  overclaimed — `chrome/header/HeaderActionsMenu.tsx:19` renders the vendored modal `Dialog`, which
  inerts everything outside its portal, so the quit dialog would paint on top but take no clicks.
  Comment softened to name the two tiers it does clear; split out as ticket 21.
- **[LOW]** The layering explanation was internally inconsistent ("at equal z-index" explains the
  `z-40` tier only). Rewritten.
- **[LOW]** One paragraph of the comment was opinion with no instruction or fact behind it
  (`docs/agents/unslop.md` rule 27). Cut. The constraint on future edits — nothing else takes this
  constant — was kept.

## Agent Notes

None to promote. Ticket 20 cites none, and ticket 03's note
(`.agents/notes/proposed/feature/2026-08-30-quit-confirmation-design.md`) is not completed by this
change — its AC-4 is still open on ticket 03, so it correctly stays in `proposed/`.

## Known limitations

- The help overlay and command palette pass by construction, not by assertion. If someone later
  gives the palette its own scrim, nothing fails.
- A Base UI modal still blocks the quit dialog's clicks. Pre-existing, not worsened here, ticket 21.
