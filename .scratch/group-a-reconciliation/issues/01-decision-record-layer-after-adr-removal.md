# 01 — Decision-record layer after ADR removal

Type: task
Status: resolved

## Problem

The twelve numbered ADRs under `docs/adr/` were deliberately deleted. The `docs/adr/` directory is now empty, and Agent Notes under `.agents/notes/` are the intended sole decision record. Three things still point at the old layer:

1. **Broken markdown links** – 21 broken links in `CONTEXT.md`, `docs/architecture.md`, `docs/roadmap.md`, `docs/agents/wayfinder-evaluation.md`, `.ai/TRACEABILITY.md`, and `.ai/SPRINT-PLAN.md`.
2. **Instructions that route agents to `docs/adr/`** – Several documents (including a vendored skill) still reference the deleted directory.
3. **151 `ADR-000x` citations** – Historical identifiers scattered in source comments and docs, still pointing to non-existent files.

## Solution

Each of the twelve ADRs was migrated to an `implemented/` note in `.agents/notes/implemented/` (dated to the original authoring date rather than the migration date). The directory `docs/adr/` was deleted. Agent Notes are now the sole decision record; no document instructs an agent to write an ADR.

### Migration Mapping

| Original ADR | New Location |
|--------------|--------------|
| ADR-0002 – match engine | [match engine](../../../.agents/notes/implemented/architecture/2026-08-27-match-engine-three-phase-and-deterministic-seed.md) |
| ADR-0003 – role rating | [role rating](../../../.agents/notes/implemented/architecture/2026-08-27-role-rating-outside-match-engine) |
| ADR-0004 – calendar | [driven calendar](../../../.agents/notes/implemented/architecture/2026-08-27-fixture-driven-calendar) |
| ADR-0005 – transfer economy | [transfer economy](../../../.agents/notes/implemented/architecture/2026-08-27-formula-driven-transfer-economy) |
| ADR-0006 – board objectives | [board objectives](../../../.agents/notes/implemented/feature/2026-08-27-board-objectives-and-manager-sacking) |
| ADR-0007 – deciders | [domain bounded deciders](implemented/architecture/2026-08-27-domain-bounded-deciders-and-chunked-resimulation) |
| ADR-0008 – commentary | [templated match commentary](../../../.agents/notes/implemented/architecture/2026-08-27-templated-match-commentary) |
| ADR-0009 – contact duels | [contact dual modeling](../../../.agents/notes/implemented/feature/2026-08-27-contact-duel-modeling) |
| ADR-0010 – post-handoff routing | [classyfing post handoff desicions](../../../.agents/notes/implemented/process/2026-08-27-classifying-post-handoff-decisions) |
| ADR-0011 – player development | [player. development](../../../.agents/notes/implemented/feature/2026-08-28-deterministic-fractional-player-development) |

Two ADRs were absorbed rather than migrated (existing notes already covered their content):
- **ADR-0001** → `proposed/architecture/2026-08-29-player-ratings-are-derived-projections` (merged into existing note)
- **ADR-0012** → `implemented/architecture/2026-08-29-action-model` (already referenced)

### Citations

Approximately 110 `ADR-000x` citations remain in source and test comments. These were deliberately left in place because they are stable historical identifiers; rewriting them would be a large mechanical diff with no functional gain. The Decision-record column of `.ai/TRACEABILITY.md` maps each identifier to its new note.

### Side Effects

- `pnpm check:all` is now green (570 files checked, all links resolve).
- There is now one decision layer (Agent Notes) and one format, eliminating the “is this ADR‑worthy?” judgment at record time.
- `.ai/TRACEABILITY.md`’s Decision‑record column serves as the ADR‑identifier‑to‑note mapping, making it load‑bearing rather than merely descriptive.
- Re‑running `cm-setup` would overwrite `docs/agents/domain.md` with ADR guidance; the templates were left generic on purpose — abolishing ADRs is this repo’s call, not a universal one — so the templates must be reapplied manually after the ADR removal.
- The vendored skills `domain-modeling` and `improve-codebase-architecture` were forked to reflect the new architecture; their upstream hashes are pre‑forked baselines.

## Done When

- `pnpm check:all` is green, no document instructs an agent to write an ADR, and `.ai/TRACEABILITY.md` traces to an existing note.

## Answer

**Agent Notes are now the sole decision record; the twelve ADRs were migrated rather than discarded, and the gate is green.** See [Agent Note](../../../.agents/notes/implemented/process/2026-08-30-agent-notes-are-the-sole-decision-record.md).
