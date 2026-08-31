# Agent Notes

An Agent Note records a decision made while planning or building a feature — the *why* and *what was given up* — that outlives the ticket that produced it. This doc defines where they live, when `cm-wayfinder` and `cm-implement` write them, and the format they follow. Adapted from a companion project's Agent Notes system, trimmed to prose-only enforcement (no verification script, no CI gate, no hash-pinned manifest) for v1.

## Layout and naming

Every Agent Note's path encodes two axes: `.agents/notes/{lifecycle}/{class}/yyyy-mm-dd-topic.md`.

**Lifecycle** (top-level folder):

- `proposed/` — decided but not yet built. `cm-wayfinder` writes here when a resolved ticket asserts a choice, design, or convention.
- `implemented/` — the decision shipped. `cm-implement` promotes a note here from `proposed/` in the same commit that ships the code.
- `rejected/` — considered and declined; kept only while its rationale prevents a plausible re-litigation, otherwise deleted.
- `archived/` — a low-future-value `implemented/` note, frozen. See `cm-archive-notes`.

**Class** (nested folder), one of:

| Class | What it covers |
|---|---|
| `feature` | A new user- or model-facing capability. |
| `bug-fix` | Corrects a defect. |
| `simplification` | Removes code, behavior, or surface area without adding a capability. |
| `architecture` | A structural decision scoped to one effort — see the ADR line below. |
| `process` | Tooling, policy, or workflow around the code. |
| `testing` | Test infrastructure and strategy. |

The `yyyy-mm-dd` in the filename is the date the decision was first proposed.

## Agent Notes are the only decision record

This repo once ran two decision layers: twelve numbered ADRs under `docs/adr/` for repo-wide, durable, structural decisions, and `.agents/notes/{lifecycle}/architecture/` for structural calls scoped to one effort. The ADR layer was retired. Its twelve records were migrated into `.agents/notes/implemented/` (see the Decision-record column of [.ai/TRACEABILITY.md](../../.ai/TRACEABILITY.md) for the mapping) and `docs/adr/` was deleted.

There is now no distinction to maintain between "durable enough for an ADR" and "scoped to one effort". A repo-wide structural decision and an effort-scoped one are both `architecture`-class notes; the lifecycle folder, not the directory, carries how settled it is. Do not create `docs/adr/`, and do not offer to write an ADR.

**Historical citations.** `ADR-0001` … `ADR-0012` still appear in roughly 110 source and test comments, and in some older notes and reports. They were deliberately left in place rather than rewritten in bulk. Read such a citation as a stable historical identifier pointing at the note that absorbed it; `.ai/TRACEABILITY.md` maps every one. Two ADRs were absorbed into notes that already stated their content rather than migrated to new files: ADR-0001 into `proposed/architecture/2026-08-29-player-ratings-are-derived-projections`, and ADR-0012 into `implemented/architecture/2026-08-29-action-model`.

**A re-run of `cm-setup` would undo part of this.** The setup skill's `domain.md` template still describes the generic `CONTEXT.md` + `docs/adr/` convention, and installing it would overwrite [domain.md](domain.md) with ADR guidance. The templates were left generic on purpose — abolishing ADRs is this repo's call, not a universal one — so if `cm-setup` is ever re-run here, re-apply the ADR removal to `docs/agents/domain.md` afterwards.

## The file format

**Header** — the first three lines, exactly:

```markdown
# Agent Note: <title>

Status: <proposed|implemented|rejected>
```

**Body**, in `proposed/`:

```markdown
## Problem
## Proposal
…bespoke sections…
## Alternatives considered
## Acceptance criteria
## Risks
```

**Body**, in `implemented/` (after promotion):

```markdown
## Problem
## Decision
…bespoke sections…
## Alternatives considered
## Consequences
```

`## Alternatives considered` is mandatory in both: record only genuinely-weighed alternatives, never invented after the fact.

## Enforcement

Prose-only for v1: no `verify-agent-note-format`-equivalent script, no CI gate. This may become scripted later if the convention proves worth enforcing mechanically.

## Directories are lazy

`.agents/notes/{lifecycle}/{class}/` directories are not pre-created by `cm-setup`. Git can't track empty directories; each folder comes into existence the first time `cm-wayfinder` or `cm-implement` writes a note into it.
