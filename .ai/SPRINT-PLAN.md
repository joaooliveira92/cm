# Sprint Plan

The orchestrator's queue. Derived from `.scratch/` on 2026-08-29 by reading every ticket's `Type:`,
`Status:`, and `Blocked by:` lines.

This file answers **"what next"**. It is not the tracker — ticket truth lives in
`.scratch/<effort>/issues/`, and [docs/roadmap.md](../docs/roadmap.md) is the human-facing narrative
snapshot. When a row and the tracker disagree, the tracker is right and the row is stale: fix the row.

**Re-derive rather than trust.** A frontier is computed, not remembered: the lowest-numbered ticket
in an effort that is open, unblocked, and unclaimed. Every "next move" below is a claim about the
tracker at a moment in time, and each one decays.

## The queue is closed

**No new effort may be added while any map in `.scratch/` is open.** The full rule — what counts as a
complete map, and the command that checks it — is in
[AUTONOMOUS-AGENT.md § Sprint creation is gated on open maps](AUTONOMOUS-AGENT.md). Finish what is
charted before charting more. A new effort is a human's call or a decision request, never something
the orchestrator starts for itself.

**21 decision tickets across 6 efforts are unresolved.** The gate is shut.

It does not block **implementation** of efforts that are already charted — working an existing
ticket is not inventing work. Both lanes below are legal; only Lane A can open the gate.

## Lane A — close the open maps

Decision work. One ticket per session; resolving one writes its Agent Note.

| # | Effort | Frontier | Then | Blocked until |
|---|---|---|---|---|
| A1 | `keyboard-first-renderer/` | **done — all 14 decisions resolved; map retired** | spec-creator (`/cm-to-spec`) | — |
| A2 | `scouting/` | **04** (screen prototype) — `claimed` but unanswered; reclaim it | — | nothing; 04 is the last ticket |
| A3 | `retro-match-screen/` | **01** (scaffold disposition) — unblocked now that 02 resolved | 04 (fidelity references, unblocked) | 03 (matchday mount) waits on 01 |
| A4 | `e2e-coverage-wave-2/` | **07** (seed scenarios spec section) | 08, 09, 10 — all unblocked | 11 waits on 07; 12 waits on 07–11 |
| A5 | `effort-archival/` | **01** (completion predicate) | 02, 03 — both unblocked | 04/05 wait on 01–03; 06 waits on 04/05 |
| A6 | `visual-design-language/` | **03** (dense table and abbreviations) — unblocked now that 02 resolved; then **04** (navigation frame) — also unblocked | Spec handoff | Human-chartered effort from `docs/ui-elements.md` reference. Tickets 01 (audit) and 02 (visual frame tokens) resolved. Agent Note at `.agents/notes/proposed/architecture/2026-08-29-visual-design-tokens.md`.

10 of A's remaining 16 tickets are unblocked right now (one of them, `scouting/04`, only nominally
claimed), so nothing in this lane is waiting on anything but attention.

`injury-system/` has **no `map.md`** — it went straight to a spec. That is not the same as a closed
map. Before treating its 9 build tickets as settled design, confirm its decisions actually were made
somewhere; if they were not, it needs charting, and that is a human's call under the gate.

## Lane B — implementation, on efforts whose maps are closed

Build tickets. Every decision behind these is resolved.

| # | Effort | State | Next move |
|---|---|---|---|
| B0 | `keyboard-first-renderer/` | Spec `ready-for-agent`; 8 build tickets (15–22); tickets 15, 16, 17, 18, 19, 20, 21 shipped | **Frontier: ticket 22 (keyboard e2e conversion), the final stage.** Two routed-out decision requests block the typed-error and creation-happy-path ACs (see `.scratch/keyboard-first-renderer/decision-request-*.md`); a third (binding-collision tiers) tunes Stage-6 validation strictness. Stages 5–6 shipped: tables/grid, match-day live keyboard control, and user key binding overrides; all nine screens level-1, Match Day/Transfers/Tactics/Squad no-mouse driveable. |
| B1 | `training/` | Spec `ready-for-agent`; all 5 decisions resolved; build tickets 03/04/05 unimplemented | The most implementation-ready work in the repo — no design debt in front of it. Player Development math is shipped ([deterministic fractional Player Development](../.agents/notes/implemented/feature/2026-08-28-deterministic-fractional-player-development.md)); **Training Focus** is not. |
| B2 | `onboarding/` | Spec `ready-for-agent`; all 11 decisions resolved; 11 build tickets still marked `ready-for-agent` | **Statuses are stale** — recent commits landed wave 1 (01a, 01b, 02) and part of 03/04/05. Re-derive what is actually done from the code before picking up a ticket, and fix the statuses as you go. Likely frontier: 06 (Continue as global career loop). |
| B3 | `injury-system/` | Spec `ready-for-agent`; 9 build tickets; [contact duel modeling](../.agents/notes/implemented/feature/2026-08-27-contact-duel-modeling.md) settles duel modeling | Frontier 01 (injury/fitness attributes) — but see the no-map caveat above first. |
| B4 | `player-ratings-derived/` | 4 build tickets against already-shipped behavior | Test and documentation hardening for [player ratings are derived projections](../.agents/notes/proposed/architecture/2026-08-29-player-ratings-are-derived-projections.md). Good filler between feature sprints; low risk, real value. |

## Immediate next action

**Lane B0 — `keyboard-first-renderer/`: implement ticket 22 (keyboard e2e conversion), the last stage.**
Stages 1 (15), 2 (16), 3 (17), 4 (18), 5 (19 — tables/grid; 20 — match-day live control), and 6 (21 —
user key binding overrides) shipped; gate green throughout, all unit tests green. The pipe's final
ticket is 22: convert the level-3 journeys (Match Day, Transfers, Tactics, Squad) to keyboard-driven
e2e with `toBeFocused` + ARIA assertions, keep creation/save-management/error-paths as clicks, cover
the five mandated coverages, and record the existing click suite's result before and after. Stage 6
delivered the four rebinding RPC methods (main owns `keybindings.json` under `userData`; renderer
never touches the filesystem), the help-overlay rebinding surface, per-Action/reset-all, and
lock/collision/shape validation. Notes promoted this run: `user-key-binding-overrides` proposed →
implemented (`intra-screen-focus-model` stays proposed until Stage 7's tier-3 e2e widgets ship).
Three decision requests open: typed-error wire loss and club-selection commit blocker (routed out of
this effort), and binding-collision-tiers (tunes Stage-6 validation strictness).

**Lane B1 — `training/`:** fallback if the renderer pipe stalls; the most implementation-ready work
with no design debt.

**Lane A (decisions):** A2 (`scouting/04`) and A3 (`retro-match-screen/01`) are the next open
decision frontiers. Only closing maps opens the chartering gate.

## Closed — not in the queue

| Effort | Why |
|---|---|
| `cm-clone/` | The v1 game. Decisions 01–08 and 19–20 resolved, build tickets 09–18 shipped into `apps/desktop` and `packages/`. Historical. |
| `e2e-coverage/` | All 6 tickets resolved; wave 1 Playwright coverage shipped. |
| `effect-migration/` | All 6 tickets resolved. Open questions noted in roadmap.md (`saves.ts` consistency, remaining async/await files) are **not tickets** — raising them means a decision request, not a self-started map. |
| `effect-lint-hardening/` | Both tickets resolved, including the rule-adoption list. Repeat review findings route here per AGENTS.md. |
| `effect-v4-migration/` | All 7 tickets resolved. Superseded by `effect-migration/`; do not start work from it. |
| `skill-suite-merge/` | All 8 tickets resolved. The spec still reads `ready-for-agent`, but the `cm-*` skills and `.agents/notes/` layer it describes are already in use. Stale status; do not re-drive. |

## Known tracker debt

Do not "fix" these mid-sprint — they are recorded so you read the tracker correctly, and each is its
own decision.

- **Two status vocabularies.** Wayfinder decision tickets use a bare `Status: resolved` header; build
  tickets from `cm-to-tickets` use a `**Status:** ready-for-agent` line in the body. Three
  `training/` tickets carry **both**, saying `resolved` in the header and `ready-for-agent` in the
  body — the decision is settled, the code is not. Read both before concluding anything.
- **Mixed numbering.** `cm-clone/` and `onboarding/` interleave decision tickets, build tickets, and
  follow-on decisions in one number space (`onboarding/` also has duplicate numbers: two `02`s, two
  `03`s). [classifying post-handoff decisions](../.agents/notes/implemented/process/2026-08-27-classifying-post-handoff-decisions.md) accepts this
  as process debt.
- **Absence of a `Type:` line is a fragile discriminator** for "this is a build ticket" — it may just
  be missing. ADR-0010 says so explicitly.

## Row hygiene

When a sprint closes, in the same commit: mark the ticket resolved, append the decision pointer to
the effort's `map.md`, promote any shipped Agent Note to `implemented/`, update this file's row and
**Immediate next action**, add the [TRACEABILITY.md](TRACEABILITY.md) entry if a durable capability
shipped, and write `.ai/reports/<effort>.md`.

When Lane A empties, say so rather than refilling it: an empty Lane A is the signal that chartering
is unlocked, and that is a conversation with a human.
