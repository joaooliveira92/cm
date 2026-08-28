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

## Coexistence with `docs/adr/`

`docs/adr/` stays the sole home for repo-wide, durable, structural decisions that outlive any single effort. `.agents/notes/{lifecycle}/architecture/` is for structural calls scoped to one wayfinder map or implementation effort — too local or provisional for a permanent ADR, but still worth lifecycle tracking. An `implemented/architecture/` note can later be promoted to a full ADR by hand if it turns out to be repo-wide and durable after all; this is a judgment call, not a scripted step.

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
