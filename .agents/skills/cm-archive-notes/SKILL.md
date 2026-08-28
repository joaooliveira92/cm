---
name: cm-archive-notes
description: Use when auditing, archiving, or pruning Agent Notes — periodically or when a supersession flag left by cm-wayfinder needs resolving. Not invoked automatically; run it explicitly ("audit/archive Agent Notes").
disable-model-invocation: true
---

Reduce the active Agent Note corpus without erasing history that can still guide work. Judge every note semantically; word count and age are discovery aids, never archive criteria.

## Read the contract

Read [docs/agents/notes.md](../../../docs/agents/notes.md) first: the lifecycle folders, the class table, the header/body skeleton, and the ADR-coexistence line. This skill only operates on notes that already follow that contract.

## Supersession: what's already handled, and what isn't

`cm-wayfinder`'s resolution step carries a one-line supersession flag: when it writes a new note, it checks whether that note supersedes an existing active note on the same decision, and flags it inline if so. That flag is not a judgment — it's a pointer. Resolving it (archive the superseded note? retain it as still-useful? reject it?) is this skill's job, along with everything else in scope below: a periodic or explicit-invocation audit pass over the whole corpus, not a per-write check.

## Classify by future value

Apply these five lifecycle-specific outcomes to every note in scope:

- **Implemented — keep active:** retain a note when its rationale, alternatives, negative guarantees, or reintroduction condition is likely to guide a future change. Length does not matter.
- **Implemented — archive:** archive a note when the shipped decision is complete and its body is unlikely to guide future work — one-off UI chrome, a narrow adapter, a minor closed bug, or process history whose current behavior is obvious elsewhere.
- **Proposed — never archive:** keep a live proposal active. If it's no longer worth pursuing, reject it with an honest reason instead — that moves it to `rejected/`, out of this outcome.
- **Rejected — keep as guardrail:** retain a rejection only when the losing proposal remains a tempting, plausible mistake and the note explains why it loses.
- **Rejected — delete:** delete the note outright when the rejected idea is obsolete, superseded, or unlikely to prevent re-litigation.

Do not archive toward a quota. Inspect every note in scope, classify analogous notes under one principle, use best judgment for close cases, and call out genuinely borderline decisions when reporting.

## Calibrated examples

Illustrative, not drawn from this repo's own corpus (which doesn't exist yet) — the word counts show size isn't the test.

Archive implemented notes such as:

- a collapsed-sidebar toggle behavior — 340 words: closed, minor UI detail with no future design leverage;
- a one-off CSV-import adapter for a discontinued data source — 610 words: substantial detail, but the source is gone.

Keep implemented notes such as:

- a cross-match fitness recovery formula — 280 words: states a durable simulation rule other systems depend on;
- a "no live migration" policy for save-file schema changes — 190 words: short, but it's a standing constraint future schema work must respect;
- a deferred multi-league support decision — 250 words: borderline-short, kept because it states the condition under which the feature gets revisited.

For rejected notes:

- keep "rejected real-time multiplayer sync" — 400 words: the temptation to revisit this remains real and expensive if re-litigated blind;
- delete "rejected storing player attributes as floats" — 300 words: a later, broader precision decision resolved this question and superseded it.

## Archive one implemented note

This repo has no `.zh.md` sidecar, no `manifest.json`, and no verification script — freezing is a stated prose convention, not tooling.

1. Move the single `.md` file from `implemented/{class}/` to `archived/{class}/`.
2. Make no body edits. Insert only `Archived: YYYY-MM-DD` immediately below `Status: implemented`.
3. Search for inbound links from active prose (other notes, tickets, maps). Redirect them to current authority, or leave them pointing at the archived path when the historical snapshot is the intentional citation.

After that move, the note is frozen by convention: never edit, move, or reformat it again. Archived notes remain valid inbound-link targets but are historical snapshots, not authority for current behavior.

## Delete a rejected note

A deliberate, reviewed action in a normal PR — no separate tooling gates it. Git history is the audit trail. Repair or drop inbound links pointing at the deleted note as part of the same PR.

## Report

For each audit pass, report: implemented notes kept vs. archived, rejected notes kept vs. deleted, any proposed notes that got rejected along the way, and every genuinely borderline case with the reasoning for its outcome.
