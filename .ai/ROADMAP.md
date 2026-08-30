# Roadmap — cm-clone autonomous sprint lanes

A snapshot of where cm-clone's efforts stand, derived from `.scratch/` maps/specs and
`.agents/notes/`. This file is a **point-in-time index**, not a tracker — it goes stale as tickets
resolve. **Re-derive it from `.scratch/` rather than trusting it** once any linked effort's status has
moved on.

The durable, human-facing narrative lives at [docs/roadmap.md](../docs/roadmap.md); this file is its
machine-oriented mirror so a cold agent picks up the same picture without leaving `.ai/`. The
queueing authority (frontier pointers, the immediate-next-action, and the open-map gate) is
[SPRINT-PLAN.md](SPRINT-PLAN.md).

Each effort below is a `.scratch/<name>/` directory. See [issue-tracker.md](../docs/agents/issue-tracker.md)
for how these are structured, and [notes.md](../docs/agents/notes.md) for the Agent Notes lifecycle
referenced throughout.

## Shipped

- **cm-clone** (`.scratch/cm-clone/`) — the v1 game: squad selection, tactics, transfers,
  season-long league play resolved through text commentary. Closed at handoff; built out into
  `apps/desktop`, `packages/game-engine`, `packages/shared`, `packages/contracts`.
- **e2e-coverage** (`.scratch/e2e-coverage/`) — wave 1 Playwright coverage for the desktop app.
  Closed at handoff.
- **Player Development** (part of the Training milestone, [ADR-0011](../docs/adr/0011-deterministic-fractional-player-development.md)) —
  deterministic, fraction-of-gap Attribute growth toward **Potential Ability**. Implemented.
- **Training** (`.scratch/training/`) — Player Development (shipped, above) plus **Training Focus**
  (per-player, per-Category growth bias). Spec is `ready-for-agent`; design settled. Next step is
  ticketing/implementation, not more design.

## In flight

- **Injury system** (`.scratch/injury-system/`) — spec is `ready-for-agent`. No `map.md` (took a
  shorter path to spec); confirm its design is actually settled before treating it as
  implementation-ready.
- **Scouting** (`.scratch/scouting/`) — fog-of-war for non-own-squad players, resolved via
  assignable Scouts narrowing **Attribute Range** over time. Design mostly resolved; tuning constants
  and the new Scouting screen's UI layout deferred to implementation. Map charted, not yet closed to
  a `spec.md`.
- **E2E coverage wave 2** (`.scratch/e2e-coverage-wave-2/`) — spec extension for free-agent signing,
  bidding/counter-offers, matchday subs, save-management edge cases, and UI-reachable error paths.
- **Effect v4 migration** (`.scratch/effect-migration/`) — seam-by-seam move of the desktop
  main-process onto typed `Effect<A, E, R>` failures. Open questions (saves consistency, remaining
  async/await files) are **not tickets** — raising them is a decision request, not a self-started map.
- **Effect lint hardening** (`.scratch/effect-lint-hardening/`) — which additional
  `accountability`-style lint rules to adopt. Repeat Effect review findings route here per
  [AGENTS.md](../AGENTS.md).
- **Skill suite merge** (`.scratch/skill-suite-merge/`) — the `cm-*` skill suite and `.agents/notes/`
  decision-record layer itself; already present and in active use. Treat its spec status as stale.
- **keyboard-first-renderer** (`.scratch/keyboard-first-renderer/`) — command palette and
  discoverability; currently on branch `prototype/command-palette-discoverability`. Furthest-along
  open map.
- **retro-match-screen** (`.scratch/retro-match-screen/`), **effort-archival**
  (`.scratch/effort-archival/`), **training** (design side) — remaining open charts, per
  SPRINT-PLAN Lane A.

## Suggested next step

See [SPRINT-PLAN.md](SPRINT-PLAN.md) **Immediate next action** — it is the frontier pointer and wins
over anything recalled here. As of the last snapshot that was **resolving `keyboard-first-renderer`
ticket 12 (e2e strategy)**; the most implementation-ready build work is **Training Focus**.
