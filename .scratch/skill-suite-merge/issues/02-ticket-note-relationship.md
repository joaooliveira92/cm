# Relationship between a wayfinder ticket file and its Agent Note

Type: grilling


Status: resolved

Blocked by: None (can start immediately)

## Question

A resolved `cm-wayfinder` ticket currently lives at `.scratch/<effort>/issues/NN-<slug>.md` with its
answer inline. Once resolution also writes a classified Agent Note to
`.agents/notes/proposed/{class}/yyyy-mm-dd-topic.md` (per the map's Notes), what's the ticket file's
role afterward?

Options: (a) the ticket file stays exactly as it is today (question + answer), and the Agent Note is
a separate, independent copy of the durable parts — accepting two sources of the same fact; (b) the
ticket file's `## Answer` section is trimmed to a one-line pointer to the Agent Note once written,
making the note the sole source of the durable answer; (c) something else.

Answer shapes ticket 03 (the exact `cm-wayfinder` resolution-step rewrite).

## Answer

**Gist + pointer (option c), written atomically, note-worthiness a per-ticket judgment call — not
every resolved ticket produces a note.**

- **Ticket file after resolution**: when a note is written, the ticket's `## Answer` section is one
  line: `**<gist>.** See [Agent Note](.agents/notes/proposed/{class}/yyyy-mm-dd-topic.md).` — same
  gist-then-link shape the map's own Decisions-so-far already uses, so the pattern recurs identically
  at both levels instead of inventing a second convention. Not full prose duplication (drifts when one
  copy is edited and not the other), not a bare pointer (unreadable cold, with no memory of the
  session).
- **Note-worthiness is a judgment call, not automatic.** A resolved ticket gets a note *unless* its
  `## Answer` is (i) a pure scoping call (closed out-of-scope / not-applicable), (ii) a fact-finding
  result with no decision attached (a `research` ticket that only confirms something, decision made
  elsewhere), or (iii) superseded/abandoned before producing a real answer. Anything else — any answer
  that asserts a choice, design, or convention — gets a note. This is checked from the ticket's answer
  content alone, uniformly across ticket `Type` (grilling/research/prototype/task); `Type` does not
  predict note-worthiness (e.g. a `task` ticket can assert a real decision, as ticket 05 in this map
  likely will).
- **Atomic with resolution.** The note (when warranted) is written in the same resolve step that
  closes the ticket — never a deferred follow-up pass — so a ticket is never left "resolved" while
  claiming a note that doesn't exist yet.
- **Map linking is unchanged.** The map's Decisions-so-far always links to the ticket file, never
  directly to the note, even when a note exists — consistent with every other Decisions-so-far entry,
  rather than branching the link target on a per-entry fact.
- **Scope check (domain-modeling pass):** this convention is meta/tooling for the planning layer
  itself, not a decision about this repo's audit-product domain — no `CONTEXT.md` or ADR update
  needed. [ADR-0010](/docs/adr/0010-post-handoff-decisions-live-in-adrs-map-closes.md) already governs
  the *unprefixed* `wayfinder` skill's decision storage (ADR layer) and stays untouched per this map's
  scope; only `cm-wayfinder` diverges to the Agent Notes layer, which is what this ticket specifies.
- This ticket itself was resolved on the existing (unprefixed) `wayfinder`/local-markdown tracker,
  since `cm-wayfinder` and `.agents/notes/` don't exist yet — the convention just decided is what a
  *future* `cm-wayfinder` resolve step will do, not something applied retroactively here.
