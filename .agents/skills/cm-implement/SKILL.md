---
name: cm-implement
description: "Implement a piece of work based on a spec or set of tickets, promoting each linked proposed Agent Note to implemented as part of the same commit."
disable-model-invocation: true
---

Implement the work described by the user in the spec or tickets.

Use /tdd where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Promote each linked Agent Note. Follow the explicit forward-links carried in the spec's
"Implementation Decisions" bullets (from `cm-to-spec`) or the tickets' "Decisions" sections (from
`cm-to-tickets`) to each `.agents/notes/proposed/{class}/yyyy-mm-dd-topic.md` note they reference.
Never search `.agents/notes/proposed/` by keyword or date-range — only follow known links.

For every linked note whose decision fully shipped, promotion is the default, not a judgment call:

- Rewrite `## Proposal` into present-tense `## Decision`.
- Fold `## Acceptance criteria`/`## Risks` into `## Consequences` (or a present-tense
  `## Testing`/`## Verification` section).
- Flip `Status: proposed` to `Status: implemented`.
- Move the file from `.agents/notes/proposed/{class}/` to `.agents/notes/implemented/{class}/`.

The one skip case is **partial** implementation: if the shipped code only partly realizes the
proposal, leave the note in `proposed/` and note on the commit/PR which part remains unbuilt.
Divergence between what was proposed and what actually shipped is NOT a skip case — it's exactly
what the rewrite reconciles.

This promotion rewrite happens in the same commit as the shipped code, atomic, not a deferred
follow-up pass. There is no mechanical gate checking that promotion happened correctly (prose-only
for v1, per `docs/agents/notes.md`) — this relies on the step being followed faithfully.

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

Commit your work to the current branch.
