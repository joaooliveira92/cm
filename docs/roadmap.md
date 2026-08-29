# Roadmap

A snapshot of where cm-clone's efforts stand, derived from `.scratch/` maps/specs and
`.agents/notes/`. This file is a point-in-time index, not a tracker — it goes stale as tickets
resolve. Re-derive it from `.scratch/` rather than trusting it once any linked effort's status has
moved on.

Each effort below is a `.scratch/<name>/` directory. See [issue-tracker.md](agents/issue-tracker.md)
for how these are structured, and [notes.md](agents/notes.md) for the Agent Notes lifecycle
referenced throughout.

## Shipped

- **cm-clone** (`.scratch/cm-clone/`) — the v1 game spec: squad selection, tactics, transfers,
  season-long league play resolved through text commentary. Closed at handoff; built out into
  `apps/desktop`, `packages/game-engine`, `packages/shared`, `packages/contracts`.
- **e2e-coverage** (`.scratch/e2e-coverage/`) — wave 1 Playwright coverage spec for the desktop
  app. Closed at handoff.
- **Player Development** (part of the Training milestone, [ADR-0011](adr/0011-deterministic-fractional-player-development.md)) —
  deterministic, fraction-of-gap Attribute growth toward Potential Ability. Implemented.
- **Training** (`.scratch/training/`) — Player Development (shipped, above) plus **Training
  Focus** (per-player, per-Category growth bias). Spec is `ready-for-agent`; both design tickets
  resolved, nothing left unspecified. Next step is ticketing/implementation, not more design.

## In flight


- **Injury system** (`.scratch/injury-system/`) — spec is `ready-for-agent`. No map.md (took a
  shorter path to spec); worth confirming its design tickets are actually settled before treating
  it as implementation-ready.
- **Scouting** (`.scratch/scouting/`) — fog-of-war for non-own-squad players, resolved via
  assignable Scouts narrowing Attribute Range over time. Three of its design tickets are resolved
  (resource/assignment model, [progress accrual & Attribute Range](../.agents/notes/proposed/feature/2026-08-28-progress-accrual-and-attribute-range.md),
  technical contract). Still open: exact tuning constants (Scout count per Stature Tier,
  noise-band width, per-Matchday accrual rate) and the new Scouting screen's UI layout — both
  deferred to implementation, not separate design tickets. Map is still "charted, decisions in
  progress," not yet closed to a spec.md.
- **E2E coverage wave 2** (`.scratch/e2e-coverage-wave-2/`) — spec extension covering free agent
  signing, bid response/counter-offer, match day subs, save management edge cases, and
  UI-reachable error paths. Two tickets resolved (match day structural extension, error-path
  catalog), two open (transfer features spec, error-path coverage spec), two claimed but
  unanswered (seed scenarios, save management edge cases).
- **Effect v4 migration** (`.scratch/effect-migration/`) — seam-by-seam move of desktop
  main-process logic onto typed `Effect<A, E, R>` failures. Six tickets resolved (pure-packages
  posture, throws→tagged errors, engine boundary lift convention, run* edge-only audit, renderer
  boundary posture, preload bridge typed-error preservation). Not yet specified: whether the
  already-Effect-shaped persistence layer (`saves.ts`) needs consistency tickets, and disposition
  of the remaining 10 async/await files in `apps/desktop`.
- **Effect lint hardening** (`.scratch/effect-lint-hardening/`) — deciding which additional
  `mikearnaldi/accountability`-style lint rules/diagnostics to adopt. One ticket resolved (dual-lint
  architecture: oxlint stays general-purpose, a new ESLint `local` plugin hosts AST-shape Effect
  rules). Ticket 02 (rule and diagnostic adoption) is claimed but unanswered — the actual rule list
  is still open.
- **Skill suite merge** (`.scratch/skill-suite-merge/`) — the `cm-*` skill suite and
  `.agents/notes/` decision-record layer itself. Spec is `ready-for-agent`, but the skills
  (`.agents/skills/cm-*`) and note-promotion mechanics are already present and in active use
  elsewhere in this repo — treat the spec's status as stale rather than re-driving this effort.

## Suggested next step

Of the in-flight efforts, **Training** and **Scouting** are furthest along on the design side but
have no code yet — Training's spec has nothing left unspecified, making it the most
implementation-ready. Scouting is one ticket-worth of tuning-constant/UI-layout decisions behind
it. The Effect migration and lint-hardening efforts are architecture/tooling work that can proceed
in parallel without blocking either feature milestone.
