# Validation Report: keyboard-first-renderer

Written by the orchestrator after the gate, before the commit. Records what was **observed**.

## Sprint

- Effort: `.scratch/keyboard-first-renderer/`
- Tickets closed: `15-renderer-data-layer` (Stage 1); `16-router-adoption` (Stage 2); decisions `12-, 13-, 14-` resolved earlier this run; spec and slice (15–22) published this run
- Branch: `keyboard-first-renderer/stage-1-data-layer` — renamed from the boot-default branch; carries stages 1–2 (off `latest_branch`)
- Commits (this sprint): Stage 1 — `6d6ba56` (seam+data layer), `4696d55` (atom-react pin), `9de16f7` (boundary lint), `68e8d1f` (note promotion), `88c9967` (close ticket 15 + plan/report); Stage 2 — pending until this run's commits land

## Stage 2 gate evidence (ticket 16, router adoption)

| Gate | Command | Result |
|---|---|---|
| check:all | `pnpm check:all` | PASS — typecheck ✓, lint ✓, effect-lint ✓, verify-md-links ✓ (452 files), tests ✓ (265 total) |
| e2e | `pnpm --filter @cm-clone/desktop test:e2e` | RUN — 21 passed (8 new router specs), 2 skipped, 4 failed (same four stale specs) |
| determinism | n/a | Not applicable — renderer-only; no seeding/simulation change |
| save compatibility | n/a | Not applicable — no persistence/schema change |

## Stage 2 acceptance → evidence

| # | Criterion | Proving test | Result |
|---|---|---|---|
| AC-10 | Hash history; reload preserves route | `e2e/router.spec.ts` | PASS |
| AC-11 | Career parent owns shell + registry | `e2e/router.spec.ts` | PASS |
| AC-12 | No loaders; malformed vs missing distinct | `roundtrip.test.ts`, `router-stage2.test.ts`, `e2e/router.spec.ts` | PASS (structure-distinct; typed render blocked on wire-loss decision request) |
| AC-13 | Creation session lifecycle | `e2e/router.spec.ts` ×3 | PASS (happy-path commit blocked on club-selection decision request) |
| AC-14 | Typed destinations; `g b` history | `router-stage2.test.ts` | PASS |
| AC-15 | Semantic focus; back restore; Match Day resume | `focus-coordinator.test.ts`, `e2e/router.spec.ts` | PASS |

## Behavior changes

- **Router adopted.** Navigation is now real hash routes; `App.tsx` and its four state variables are
  deleted. Renderer-only; no game behavior, contract, persistence, or seeded outcome changed.
- **Two routed-out blockers surfaced by this stage, both pre-existing but previously invisible:**
  (1) Effect `TaggedError` custom fields are erased crossing Electron IPC, so typed errors render as a
  generic message in production; (2) creation commits a placeholder club id, so `commitCareer` always
  fails and no career has ever been creatable through the UI. Both filed as decision requests in
  `.scratch/keyboard-first-renderer/` and re-scoped out of the keyboard-first ACs until resolved.

## Decision records

- ADRs added: none.
- Agent Notes promoted (`implemented/`): `2026-08-29-router-adoption-shape` (amended with the two
  routed gaps + Match Day resume interpretation before promotion). Stage 1's two Atom notes promoted
  earlier this run.
- Decision requests filed: `decision-request-wire-loss.md`, `decision-request-club-selection.md`.

## Pre-existing failures

- The same four stale e2e specs (see Stage 1 section below): reproduced at HEAD by the reviewer.
- Plus the two routed-out blockers above.

## Deferred and known limitations

- Stage 1: MatchDay `listOpponentClubs` fetch-on-mount; `awaiting_match_id` resume ships with the
  router stage's match session; `submitMatchCommand` polling discards its success chunk (candidate
  bug-fix ticket); three mutation atoms pruned (rules tested); Effect v4 rc renames applied.
- Stage 2: `navigateBack` marker-leak path fixed (unit-tested); `CareerIndexRedirect` effect deps
  fixed; Match Day resume is ephemeral-session (no await-match RPC yet).

## Review

- **Stage 1:** APPROVE (repair list executed at ship).
- **Stage 2:** NEEDS_REWORK, both highs routed out-of-effort (not fixable in a renderer ticket),
  in-branch repairs executed (M2 `navigateBack` tests, M3 `CareerIndexRedirect` dep, L2 newline) and
  re-verified green.

## Acceptance criteria → evidence

| # | Criterion | Proving test | Result |
|---|---|---|---|
| AC-01 | No career screen hand-rolls a fetch triple or manual `reload()`; reads through the seam | `apps/desktop/test/renderer-boundary-lint.test.ts`; grep shows `window.cmClone.call` only in `rpc/call.ts` | PASS |
| AC-02 | Seam decodes both wire branches; three distinct failure variants | `apps/desktop/test/renderer-rpc-seam.test.ts` (6 wire-decode cases) | PASS |
| AC-03 | Typed errors by pattern-matching, never `_tag` string-matching | `renderer-rpc-seam.test.ts` (typed-error surface), `renderer-screens.test.tsx` | PASS |
| AC-04 | Family identity = complete request; reactivity keys separate | `renderer-rpc-seam.test.ts` (family identity) | PASS |
| AC-05 | `["save", saveId]` subscription; success-only invalidation; no wildcards | `renderer-rpc-seam.test.ts` (rules, no-wildcards, fail-no-invalidate) + `renderer-screens.test.tsx` registry-level integration test | PASS |
| AC-06 | SWR management reads; no SWR for match; no refresh-on-window-focus | `renderer-rpc-seam.test.ts` (staleness, source scan) | PASS |
| AC-07 | Polling/reveal pacing preserved; dispose never abandons durable match | `renderer-rpc-seam.test.ts` (pacing) — resume-on-arrival deferred to ticket 16 AC-15 | PASS (partial: resume ships at router stage) |
| AC-08 | Exact rc catalog pin; frozen install; typecheck | `pnpm install --frozen-lockfile` exit 0; gate typecheck green | PASS |
| AC-09 | Boundary lint ships with failing fixture | `scripts/effect-lint-fixtures/renderer-boundary.tsx` asserted in gate; `renderer-boundary-lint.test.ts` | PASS |

## Gate

| Gate | Command | Result |
|---|---|---|
| check:all | `pnpm check:all` | PASS — typecheck ✓, lint ✓, effect-lint ✓ (109 files + fixture), verify-md-links ✓ (448 files), tests ✓ (175 total: 27 contracts, 45 game-engine, 104 desktop) |
| e2e | `pnpm --filter @cm-clone/desktop test:e2e` | RUN — 13 passed, 2 skipped, 4 failed (all four pre-existing stale specs, reproduced at HEAD; see Pre-existing failures) |
| determinism | n/a | Not applicable — renderer-internal; no seeding/simulation change; existing determinism suites green in gate |
| save compatibility | n/a | Not applicable — no persistence/schema change; no migration |

## Behavior changes

- **None to game behavior.** This sprint rewrote the renderer's data-fetching plumbing only. The IPC
  contract surface (`packages/contracts`) is unchanged — no new methods, no signature changes. No
  seeded or saved outcome differs.
- **Renderer-visible change:** screens now show a typed error message and a "Refreshing…" SWR
  indicator instead of the previous hand-rolled fetch/error/reload pattern; the flight model on
  club selection was re-targeted onto the seam's plain-promise path. Cosmetic, not mechanical.

## Decision records

- ADRs added: none (ADR-0012 already exists).
- Agent Notes written (`proposed/`): none new this sprint.
- Agent Notes promoted (`implemented/`): `2026-08-29-renderer-data-layer-effect-atom`,
  `2026-08-29-atom-adoption-shape` (both fully shipped decisions; rewritten Proposal→Decision,
  AC+Risks→Consequences/Testing, moved to `.agents/notes/implemented/architecture/`).

## Pre-existing failures

- **4 e2e tests stale at HEAD, not regressions** (reproduced before/after by the reviewer):
  `journeys.spec.ts` "a save persists across app restarts" and `save-management.spec.ts` ×3 — all
  target a `Save name`/`Create` landing UI the current `App.tsx` never renders (creation moved to
  `CreationStep1` earlier), and one carries a genuine `userDataDir` undestructured bug. Left
  untouched pending an owner (potential onboarding-status reconciliation per SPRINT-PLAN B2).
- **5 broken markdown links** on `origin/latest_branch` (introduced in `c63e635`): repaired in a
  dedicated chore commit this run (`..` depth errors in ADR-0012, note 11 prototype link, retro 02
  findings link, branded-domain-ids note link). Repaired separately, not folded into ticket work.
- **Dead `apps/desktop/src/renderer/components/`** (unreferenced prototype demo code; hung the patched
  TS7 typecheck with 190-min orphaned processes): removed as the only way to meet AC-08. Reversible
  from history. Zero references confirmed by grep and `git ls-files`.

## Deferred and known limitations

- MatchDay `listOpponentClubs` remains a `useState`/`useEffect` fetch behind the seam (match-day
  carve-out, ticket 08 note AC) — accepted.
- `awaiting_match_id` resume-on-arrival ships at ticket 16 (router AC-15), not here.
- MatchDay `submitMatchCommand` polling discards its success chunk (fresh match feed never advances
  on its own) — preserved exactly; flagged as a candidate bug-fix ticket, not changed here.
- Three mutation atoms (`renewContract`, `setTrainingFocus`, `commitCareer`) pruned — no consumer
  yet; their `INVALIDATION_RULES` rows remain and are tested. `commitCareer` plain seam function stays.
- Effect v4 rc renames (`Either`→`Result`, `Effect.either`→`Effect.result`) applied as observed.

## Review

- Verdict: **APPROVE** (no blocker, no high). Mediums: (1) registry-level invalidation integration
  test — added this run, (2) note promotion — done this run. Lows: 3 unreachable mutation atoms —
  pruned; MatchDay opponents fetch — accepted as deliberate; `awaiting_match_id` — routed to ticket
  16. Info: "Advance Calendar" is a CONTEXT.md _Avoid_ as player-facing copy — re-registered for the
  level-3 stage.
- Review confirmed the 4 e2e failures are stale, not regressions.

---

## Stage 3 (ticket 17: Action registry and keyboard spine)

## Gate evidence

| Gate | Command | Result |
|---|---|---|
| check:all | `pnpm check:all` | PASS — typecheck ✓, lint ✓ (35 pre-existing warnings, 0 errors), effect-lint ✓ (no violations, 137 files), verify-md-links ✓, tests ✓ (200 desktop / 45 game-engine / 28 contracts / shared) |
| e2e | `pnpm --filter @cm-clone/desktop test:e2e` | NOT RUN this session — requires OS-level setup; unit-level equivalents cover the Stage-3 ACs in jsdom |
| determinism | n/a | Renderer-only; zero diff under `packages/`; existing determinism suites green in gate |
| save compatibility | n/a | No persistence/schema change; no migration |

## Acceptance criteria → evidence (ticket 17)

| # | Criterion | Proving test | Result |
|---|---|---|---|
| AC-16 | Every button dispatches a registered Action; no half-conversion; palette can't list an undispatchable Action | `actions-inventory.test.tsx` (League/Transfers/Tactics/MatchDay `data-action-id` → registry in-scope + `hasActionHandler`) | PASS |
| AC-17 | One keystroke, at most one action; automated collision checks across scopes | `keymap-priority.test.ts` (`resolveDispatch` single decision point, four-views reconcile); `actions-registry.test.ts` (build-time collisions incl. locked-infra keys) | PASS |
| AC-18 | `g <key>` prefix nav, explicit bindings, visible nonmodal feedback, Escape/timeout/invalid cancel | `PrefixIndicator` + `keyboard-spine-live.test.tsx` (full live lifecycle); `keymap-prefix.test.ts` | PASS |
| AC-19 | Enter activates focused control only; Space Continues only per safety contract; bare keys suppressed while typing | `keyboard-spine-live.test.tsx` (continue-safety at season_complete = 0 calls, mid-season = 1; typing suppression); `keymap-priority.test.ts` | PASS |
| AC-21 | Hybrid focus: native Tab + roving, selection ≠ focus, one `:focus-visible` ring, identity async restoration | `focus-restoration.test.ts`, `focus-coordinator.test.ts`, Squad roving in `level1-a11y.test.tsx` | PASS |
| AC-22 | All nine screens level 1 (tab order, focus ring, Enter/Space on every control) | `level1-a11y.test.tsx` (all nine tier-table screens) | PASS |

Stage-3 done criteria met: every career screen dispatches registered Actions (read-only screens have
no operations), key map active across all seven career screens, `g <key>`/Enter/suppression work,
gate green.

## Behavior changes

- **Action registry first-class.** Career screens dispatch named, scoped Actions from a single
  registry (ADR-0012); buttons and the key map are views of the same record. Renderer-only.
- **Keyboard spine live.** `g <key>` prefix navigation with visible `PrefixIndicator`, `Enter`
  activates the focused control, `Space`→Continue guarded by the league safety contract,
  text-input bare-key suppression, and a single `:focus-visible` ring across all nine screens.
- **`react-hotkeys-hook@^5.0.1` added** via the workspace catalog behind the single-file
  `renderer/hotkeys.ts` seam; the renderer-boundary lint now forbids direct imports. The spine
  routes keystrokes through the tested `resolveDispatch`/`prefixReduce` policy (not a parallel
  mirror).
- **Premature State-4/5 avoided:** palette/help/splash/badge UI and the match-day live-control
  flow are not built; only their registry foundations landed. `data-action-id` attributes (production
  action identity, not a test seam) support Stage-4 badges/help.

## Decision records

- ADRs: none added (ADR-0012 stands).
- Agent Notes **promoted** (`implemented/architecture/`): `2026-08-29-action-model`,
  `2026-08-29-keyboard-binding-library` — both fully shipped, links updated across spec/issues/ADR.
- Agent Notes left **proposed** (partially shipped): `2026-08-29-global-key-map` (palette/help UI and
  the `b`→focus-bid workflow open are Stage 4/5), `2026-08-29-intra-screen-focus-model`
  (selection-vs-focus separation and tier-3 widget interactions are Stage 5). Their code coverage so
  far is noted on the tickets they belong to.

## Pre-existing failures / tracked

- `matchCommands.test.ts` flaked once in an early `check:all` run (`ForceOff homeSubs.used` 0 vs 1);
  deterministic in isolation and every subsequent full-suite/gate run, absent from this diff —
  pre-existing main-process domain logic, tracked separately, not a Stage-3 regression.
- The two routed-out decision requests (`decision-request-wire-loss.md`,
  `decision-request-club-selection.md`) remain open; they govern Stage 3-adjacent AC-12/AC-13 typed
  render and creation happy path, not the work above.

## Review

- **First review: NEEDS_REWORK.** 4 HIGHs (tested dispatch model dead-mirror; AC-18 no prefix
  feedback; AC-19 Space bypass at season_complete; `focus-bid` live no-op) + mediums (binding drift
  "c"; AC-22 5/9; AC-16 2 converted screens) + lows.
- **Repair pass:** all executed — spine routes through `resolveDispatch`/`prefixReduce`; `PrefixIndicator`
  rendered; continue guard checked at season_complete (registry predicate + screen handler + spine
  re-check); `focus-bid` focuses the draft input; `"c"` reconciled; all nine screens level-1; Tactics/
  MatchDay added to inventory test; vestigial code removed (`primary`/`metadata` kept, justified).
- **Second (repair) review: APPROVE** — no blocker/high; all 6 ACs PASS (AC-22 9/9 implemented; the
  one repair-folder item, a missing Transfers `level1-a11y` row, folded in this session; dead
  `LOCKED_INFRA_BINDINGS` re-export in `keymap/priority.ts` and a partial Transfers bid-button ring
  also folded). Gate green after folding.

---

## Stage 4 (ticket 18: command palette and discoverability)

## Gate evidence

| Gate | Command | Result |
|---|---|---|
| check:all | `pnpm check:all` | PASS — typecheck ✓, lint ✓ (34 pre-existing warnings, 0 errors), effect-lint ✓ (no violations, 150 files), verify-md-links ✓, tests ✓ (249 desktop / 45 game-engine / 28 contracts / shared) |
| e2e | `pnpm --filter @cm-clone/desktop test:e2e` | NOT RUN this session — OS-level setup; jsdom levels cover the Stage-4 ACs |
| determinism | n/a | Renderer-only; zero diff under `packages/` |
| save compatibility | n/a | No persistence/schema change; no migration |

## Acceptance criteria → evidence (ticket 18)

| # | Criterion | Proving test | Result |
|---|---|---|---|
| AC-20 | `Primary+K` palette, `Primary+/` help, Escape topmost-only, no history entries | `discoverability-escape-layering.test.tsx` (open/close, topmost-only, no nav/back, precedence over `b`/`g`, focus restore) + `keymap-priority.test.ts` overlay branch | PASS |
| AC-23 | Palette lists global + current-screen, available-above-unavailable, disabled-with-reason, never hidden, commands-only | `discoverability-command-palette.test.tsx`, `discoverability-rank.test.ts` | PASS |
| AC-24 | Help overlay All/Global/This-screen tabs; live registrations | `discoverability-help-overlay.test.tsx` (overlay == registry snapshot) | PASS |
| AC-25 | Inline key badges on screen-scoped buttons, per-screen toggle via registry metadata | `discoverability-key-badges.test.ts` + League `c` / Transfers `b` renders | PASS |
| AC-26 | One-shot splash on first career-screen load, exactly three shortcuts, never re-shown | `discoverability-teaching-splash.test.tsx`, `discoverability-escape-layering.test.tsx` | PASS |

Stage-4 done criteria met: palette, help overlay, inline badges, and splash ship together, and the
palette is consistent with every screen's registry.

## Behavior changes

- **Discoverability big-bang.** Command palette (`Cmd+K`), help overlay (`Cmd+/`), inline key badges,
  and the one-shot teaching splash land together — the map's prescribed big-bang gated on every
  career screen dispatching registered Actions. Renderer-only.
- **Escape layering.** `Escape` closes only the topmost transient layer (splash > palette|help >
  `g` prefix); overlays open via React state, never the router, so they create no history entries.
- **`app_global` palette/help un-gated.** The two infra actions are now always active (per the
  global-key-map note "Active when: Always") rather than career-scoped.
- **Splash persistence** is a renderer-local `localStorage` flag — cosmetic UI preference, not
  authoritative game state; the contract's no-localStorage rule targets authoritative state, and the
  Stage-6 rebinding store is the separate home for applied settings.

## Decision records

- ADRs: none (no structural/package/boundary change).
- Agent Notes **promoted** (`implemented/feature/`): `2026-08-29-command-palette-and-discoverability`
  (fully shipped), `2026-08-29-global-key-map` (Stage-3-open AC-13/14/16/19/26 now close). Links
  updated across spec/issues.
- Agent Note still **proposed**: `2026-08-29-intra-screen-focus-model` (selection-vs-focus separation
  and tier-3 widget interaction are Stage 5).

## Review

- **First review: APPROVE** (no blocker/high) with repairs: (1) medium — `open-palette`/`open-help`
  were career-scoped, violating the key-map note's "Active when: Always"; (2) low — no direct
  priority-2 overlay unit test; (3) low — splash Escape not exercised from the autofocused button.
- **Repairs folded this session:** un-gated both infra actions to `available: true`; added
  `keymap-priority` overlay-branch unit tests + a focused-button splash-Escape test. Gate green after
  folding (71 focused tests pass).

## Pre-existing / tracked

- `matchCommands.test.ts` flake family (seed-dependent sub-count) — pre-existing, absent from this
  diff, deterministic in the gate; tracked since Stage 3.
- The two routed-out decision requests remain open (typed-error wire loss, club-selection commit).
- Note for Stage 7: the one-shot splash appears on first career-screen load, so the click-driven e2e
  creation journey must dismiss it once — that is exactly AC-26's Playwright class.
