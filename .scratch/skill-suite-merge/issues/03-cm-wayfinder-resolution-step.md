# Draft cm-wayfinder's rewritten "record the resolution" step

Type: task


Status: resolved

Blocked by: 02

## Question

Write the exact replacement text for `wayfinder`'s "Work through the map" step 4 (currently: "post
the answer as a resolution comment, close the issue, append a context pointer to the map's
Decisions-so-far"). The new version must specify: the Agent Note's header/body skeleton (adapted from
`reference-project`'s format — header block, `## Problem`/`## Proposal`/`## Alternatives
considered`/`## Acceptance criteria`/`## Risks` for a note landing in `proposed/`), that it lands in
`.agents/notes/proposed/{class}/yyyy-mm-dd-topic.md`, how the ticket file and the note relate (per
ticket 02's answer), and how the map's Decisions-so-far links to the note.

## Answer

Exact replacement text for `cm-wayfinder`'s "Work through the map" step 4 (replaces the unprefixed
skill's "post the answer as a resolution comment, close the issue, append a context pointer to the
map's Decisions-so-far"):

---

> 4. Record the resolution: append the answer under an `## Answer` heading and set the ticket to
>    resolved, as today. Then decide **note-worthiness**: skip the note only if the answer is (i) a
>    pure scoping call (closed out-of-scope / not-applicable), (ii) a fact-finding result with no
>    decision attached (e.g. a `research` ticket that only confirms something, decision made
>    elsewhere), or (iii) superseded/abandoned before producing a real answer. Any answer that
>    asserts a choice, design, or convention gets a note — regardless of ticket `Type`.
>
>    When a note is warranted, write it **atomically with resolution**, in the same step, never a
>    deferred pass:
>    - **Path**: `.agents/notes/proposed/{class}/yyyy-mm-dd-topic.md`, where `yyyy-mm-dd` is today's
>      date and `{class}` is the best-fit member of the closed set `feature`, `bug-fix`,
>      `simplification`, `architecture`, `process`, `testing` (judgment call — pick the one the
>      decision most changes).
>    - **Header block** — the first three lines, exactly:
>      ```markdown
>      # Agent Note: <title>
>
>      Status: proposed
>      ```
>      followed by a blank line. A ticket resolved through `cm-wayfinder` always lands in
>      `proposed/`, never `implemented/` — the decision isn't shipped code yet; promotion to
>      `implemented/{class}/` happens later, when `cm-implement` ships the code the ticket decided.
>    - **Body skeleton** — in this order, with genuinely bespoke technical sections free-form between
>      the required ones:
>      ```markdown
>      ## Problem
>      ## Proposal
>      …bespoke sections…
>      ## Alternatives considered
>      ## Acceptance criteria
>      ## Risks
>      ```
>      `## Problem` is the ticket's `## Question`, restated to stand alone without the answer.
>      `## Proposal` is the ticket's `## Answer`, in future tense where the work is unbuilt.
>      `## Alternatives considered` is mandatory: each genuine alternative the ticket weighed and why
>      it lost — never invented after the fact, only recorded from what was actually considered.
>      `## Acceptance criteria` states what observable state means done. `## Risks` covers both what
>      could go wrong and what the decision knowingly gives up.
>    - **Ticket file after resolution**: once the note is written, trim the ticket's `## Answer`
>      section to one line: `**<gist>.** See [Agent Note](<relative-path-to-note>).` — the same
>      gist-then-link shape used everywhere else in this convention (see below). Do not leave the
>      full prose duplicated in both places.
>
>    Finally, **append a context pointer to the map's Decisions-so-far**, as today — always linking
>    the **ticket file**, never the note directly, even when a note exists: `- [<ticket
>    title>](<ticket link>): <one-line gist>.`

---

**Why this shape:**
- Reuses the existing ticket-file mechanics (`## Answer` heading, `Status: resolved`) unchanged —
  `cm-wayfinder` only adds a note-writing branch inside the same step, it doesn't restructure the
  resolve flow.
- Note-worthiness test and the ticket-trims-to-gist-plus-link rule are lifted verbatim from ticket
  02's answer (see [ticket 02](02-ticket-note-relationship.md)) so the two tickets don't drift into
  disagreeing conventions.
- Header/body skeleton is copied from `reference-project`'s `proposed/` format
  (`.agents/notes/README.md` — see [Agent Notes README](../../../reference-project/.agents/notes/README.md#the-file-format))
  verbatim, since the map's Notes call for adapting that format, not reinventing it. `Status:
  proposed` is hardcoded (never `implemented`) because `cm-wayfinder` only ever produces
  not-yet-built decisions — the `proposed → implemented` rewrite is out of this ticket's scope and
  belongs to `cm-implement` (ticket 04).
- No `verify-agent-note-format`-equivalent gate is invoked, per the map's Notes (prose-only
  enforcement for v1) — the step describes the shape but nothing mechanically checks it yet.

**Scope check (domain-modeling pass):** this is tooling/process for the planning layer itself
(the `cm-*` skill suite), not a decision about this repo's audit-product domain — no `CONTEXT.md` or
ADR update needed; consistent with ticket 02's same check.

**Addendum (from [ticket 06](06-archival-convention.md)):** when a note is warranted, before writing
it, add one check: does this note supersede an existing **active** note (in `proposed/` or
`implemented/`) covering the same decision? If so, note the relationship inline (a one-line
cross-link in the new note) or flag it for a later `cm-archive-notes` pass — do not attempt the full
archive-vs-retain judgment here; that taxonomy lives only in `cm-archive-notes`.
