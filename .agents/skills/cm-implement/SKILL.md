---
name: cm-implement
description: "Implement a piece of work based on a spec, a set of tickets, or the conversation, updating any Agent Note the work contradicts."
disable-model-invocation: true
---

Implement the work described by the user, in a spec, tickets, or the conversation. Work below the
threshold in AGENTS.md § When to use the process needs no ticket and no Agent Note.

Use /tdd where possible, at pre-agreed seams.

Read `.agents/skills/effect-code/SKILL.md` and `.agents/skills/effect-v4-migration/SKILL.md` **before writing code**, not after. No exceptions and no
judgement call about whether the work "touches Effect" — that judgement needs the document it gates.

It front-loads the decisions that are expensive to undo: what lives in the error channel versus what's
a defect, how services and layers compose, `Effect.gen` versus pipeline. Those are settled in the first
few lines and everything downstream inherits them, so a reviewer who finds them wrong is asking for a
rewrite, not a fix. The read costs ~3k tokens; getting them wrong costs the whole implementation twice.

Leave `references/effect-report/*.md` unread until a specific question needs one, then pull that single
topic file. Never preload the set — it's ~60k tokens and belongs in the reviewer's context, not here.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

If the work carries a spec or tickets, follow their forward-links (the spec's "Implementation
Decisions" bullets, the tickets' "Decisions" sections) to each Agent Note they reference. Never
search `.agents/notes/` by keyword or date-range; only follow known links, including the ones in
source comments of the files you touch.

- **Contradicted note.** If what shipped departs from a linked note, update the note in the same
  change. A wrong note is worse than an unpromoted one.
- **Promotion is optional.** When a linked note's decision fully shipped, you may promote it:
  rewrite `## Proposal` as a present-tense `## Decision`, fold `## Acceptance criteria`/`## Risks`
  into `## Consequences`, flip `Status: proposed` to `Status: implemented`, and move the file from
  `proposed/{class}/` to `implemented/{class}/`. It need not share the commit that ships the code;
  notes left in `proposed/` get reconciled in a `cm-archive-notes` pass.

## Review the work

Run /code-review for the two-axis standards/spec pass. Beyond what code alone can show, trace:

- **Both sides of every changed interface** — errors, cancellation, ownership, disposal — against the contract the note or ticket promised.
- **Lifecycle and concurrency** — races before publication, cancellation across awaits, callbacks contained, teardown to quiescence.
- **Capability and consumer fit** — a new public method whose only caller is one consumer is an unnecessary API expansion; hand that consumer a private capability closure at construction instead.
- **Borrowed vs owned state** — for every retained value, name the owner and trace each cache, notification, echo, replay, and query view to the documented success point.
- **Bounds over the final operation** — probe tiny and exact limits, oversized single chunks, multibyte text.
- **Real entry path** — tests exercise the shipped loader/bin, not a hand-mounted plugin.
- **Test strength** — assertions fail on the intended regression and observe external state, logs, events, or disposal — not the implementation or an agent's report.

Report the defect, location, impact, and evidence; a short review with one substantiated blocker beats a list of nits.

## Verify before done

The full suite once at the end is the rehearsal, not a per-commit habit. For the outgoing diff, select the narrowest checks that would fail for its regression and add broader checks only for surfaces the diff reaches; never repeat a passing check merely because commit or push follows, and never push hoping CI differs. History rewrites are lease-protected only (`--force-with-lease`, never raw `--force`). If the work lands as part of a PR stack, land it through GitHub's native stack feature and verify merged state before deleting anything — see the [landing checklist](references/landing.md).

## Resolve the ticket

When the work has a ticket, once the diff is verified, mark it resolved mechanically rather than
hand-editing its checkboxes and `Status:` line: `pnpm resolve-ticket <path-to-ticket.md>`. It
checks every acceptance-criterion box and flips `Status:` to `resolved`, idempotently. Skip it only
for **partial implementation**: a ticket with unbuilt scope stays open, boxes unchecked for the
parts that didn't ship, and the commit says which part remains.

Commit your work to the current branch.
