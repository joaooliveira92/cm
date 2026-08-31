---
name: doc-standards
description: 'Use when writing, moving, reviewing, or auditing documentation in this repo: choosing hierarchy and detail, separating tutorials from references, checking tutorial progression, trimming doc slop, or on requests like "improve the docs", "audit the docs", "where should this be documented", or "this doc is too long".'
---

# Documentation standards for this repo

The documentation rules live in [AGENTS.md](../../../AGENTS.md), not in this skill. This skill supplies the workflow: placement, corpus audits, and validation across Markdown and code comments. It is guidance, not a script; use [unslop.md](../../../docs/agents/unslop.md) for prose style, and never treat length alone as a defect.

## Sources of truth (read, don't re-summarize)

- [AGENTS.md](../../../AGENTS.md) — standing orders, budgets, and the quality gates this skill protects.
- [docs/agents/domain.md](../../../docs/agents/domain.md) — how to consume the domain docs: read CONTEXT.md and the ADRs that touch the area before you change it.
- [CONTEXT.md](../../../CONTEXT.md) — the domain glossary; name concepts with its vocabulary, not synonyms.
- [.agents/notes/](../../notes/) — durable design decisions; flag a contradiction rather than overriding it silently.
- [docs/agents/notes.md](../../../docs/agents/notes.md) — when a decision earns an Agent Note, how to file it, and the section skeleton it must keep.
- [docs/agents/unslop.md](../../../docs/agents/unslop.md) — prose style: patterns to cut, plain speech, active voice.
- [README.md](../../../README.md) — the repo entry point and landing page.

## Review structure before prose

Apply the standard's authoring order to every human-facing document in scope. Do not apply this structural pass to Agent Notes: keep their mandated header and section skeleton, and classify postmortems as reference scoped to one incident, preserving chronological evidence without treating chronology as a teaching sequence.

1. Locate the document in the repository and navigation trees. State its own subject and identify its direct children.
2. Set the permitted level of detail. Keep full detail about the document's subject, summarize direct children by purpose, responsibility, and high-level behavior, and move deeper explanations to their owning descendants with links.
3. Classify the document from its intended use, not its path or title. A tutorial must lead through ordered work to an observable outcome; a reference must support lookup within an explicit scope without requiring sequential reading.
4. For a tutorial, privately classify the starting reader as beginner, intermediate, or advanced. Trace each concept to its prerequisites, reorder premature material, and move optional advanced detail to a later tutorial or reference.
5. Split substantial mixed forms. Put a small secondary form in a clearly labeled section.

Then check the constraints that make placement expensive or wrong:

- Gist-then-link catalogs (`docs/agents/domain-skills.md`, `docs/agents/cm-skills.md`) are never the source of truth: they are pointers, one line per skill. If a fact belongs there, change the skill's own `SKILL.md` first, then the catalog line to match.
- Before renaming or moving any doc, grep for inbound references. `pnpm run verify-md-links` checks Markdown link targets and repo-root-absolute links onto real files; it does NOT check `#fragment` anchors — this repo has none today (see `.scratch/skill-suite-merge/map.md` for that decision). Manual grep any fragment or string citation whose target never reaches a gate-scanned Markdown link.
- A move is atomic: remove from the old home, add to the new home, and fix every inbound link in the same change.
- `reference-project/` was an external mirror, excluded from the gates and from corpus audits; it has been removed from this checkout. Never edit or restate its decisions into this repo's docs.

## Audit the corpus

After the structural pass, hunt the slop checklist with the cheapest probes first.

1. Measure: `git ls-files '*.md' ':(exclude)reference-project/**' | xargs wc -w | sort -rn | head -30` to spot unbudgeted outliers. This repo has no doc-budget gate, so use the list as a heuristic, not a scripted pass/fail.
2. Hunt reasoning-transcript leakage — narrated history, dead design-session citations, review choreography, control-flow narration, test walkthroughs — using the [unslop.md](../../../docs/agents/unslop.md) taxonomy and rules for what to keep or delete. Preserve only a non-obvious contract or durable rationale; the same rationale repeated beside sibling sections keeps one home.
3. Hunt duplication by grepping distinctive phrases. Keep one home and replace other copies with links.
4. Replace hand-written catalogs, test and status inventories, and comment restatements with the authoritative tree, script, or generated reference.
5. In `implemented/` Agent Notes, remove migration plans, acceptance-task checklists, and future-tense spec language. Keep concise verification contracts that identify the behaviors pinning the shipped decision, plus named coverage gaps.
6. If removing prose changes a promised behavior rather than its explanation, write a proposed Agent Note or ticket first.

Exclude `.agents/notes/archived/` from corpus audits and edits. Active prose may repair, redirect, or delete an inbound link, but never follow an archive-wide cleanup into the frozen target.

Keep every load-bearing rule, preferably as one to three lines plus a link to its rationale. Cut stories, duplicates, status notes, and the path used to derive the rule. Do not create a new explanation merely to relocate disposable reasoning.

## Validation and PR hygiene

Run `pnpm check:all`; the doc-relevant gate is `pnpm run verify-md-links` (no broken Markdown links). Run `git diff --check` for whitespace errors. The PR body should give word deltas, explain any deliberately long exception, and list the checks run.