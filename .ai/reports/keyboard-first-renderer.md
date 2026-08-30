# Validation Report: keyboard-first-renderer

Written by the orchestrator after the gate, before the commit. Records what was **observed**.

## Sprint

- Effort: `.scratch/keyboard-first-renderer/`
- Tickets closed: `15-renderer-data-layer` (Stage 1); decisions `12-, 13-, 14-` resolved earlier this run; spec and slice (15–22) published this run
- Branch: `keyboard-first-renderer/e2e-strategy` (off `latest_branch`)
- Commits (this sprint): pending — `chore: repair pre-existing broken markdown relative links`, gate note; Stage-1 code commit follows

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