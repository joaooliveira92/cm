# 01 — Decision-record layer after ADR removal

Type: task
Status: resolved

## Question

The twelve numbered ADRs under `docs/adr/` were deliberately deleted. `docs/adr/` is now an empty
directory, and Agent Notes under `.agents/notes/` are the intended sole decision record. Three things
still point at the old layer:

1. **21 broken markdown links**, which make `verify-md-links` fail and `pnpm check:all` red. They live
   in `CONTEXT.md`, `docs/architecture.md`, `docs/roadmap.md`, `docs/agents/wayfinder-evaluation.md`,
   `.ai/TRACEABILITY.md`, `.ai/SPRINT-PLAN.md`, `.ai/ENGINEERING-CONTRACT.md`, and one agent note.
   (Nine further breakages in `wayfinder-evaluation.md` point at `.scratch/` directories that were
   archived earlier and are unrelated to the ADR deletion — decide whether they ride along.)
2. **Instructions that still route agents to `docs/adr/`**: `docs/agents/domain.md` describes the
   repo as "one CONTEXT.md + `docs/adr/` at the repo root", and the `domain-modeling` skill's file-structure
   and "Offer ADRs sparingly" sections tell agents to create ADRs there.
3. **151 `ADR-000x` citations** in source comments and docs, several load-bearing — `managerStatus.ts`
   cites ADR-0006 for the sacked-save rule, and `.ai/TRACEABILITY.md` is built entirely around the ADR
   column.

What replaces each, and does `docs/adr/` itself get removed?

This ticket **executes** rather than only deciding — the map's one deliberate exception to plan-don't-do,
because every later session inherits the red gate until it lands.

## Done when

`pnpm check:all` is green, no document instructs an agent to write an ADR, and `.ai/TRACEABILITY.md`
traces to something that exists.

## Answer

**Agent Notes are now the sole decision record; the twelve ADRs were migrated rather than discarded, and the gate is green.** See [Agent Note](../../../.agents/notes/implemented/process/2026-08-30-agent-notes-are-the-sole-decision-record.md).
