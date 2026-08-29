# Map: cm-* skill suite (aihero.dev × reference-project merge)

## Destination

A written **spec document** (`.scratch/skill-suite-merge/spec.md`) describing a new `cm-*` skill
suite: forked, prefixed copies of the aihero.dev decision-record skill chain (`wayfinder`,
`implement`, `to-spec`, `to-tickets`, `triage`, `setup-matt-pocock-skills`) integrated with an
`.agents/notes/{proposed,implemented,rejected,archived}/{class}/` durable decision-record layer
adapted from `reference-project`'s Agent Notes system (prose-only enforcement, no scripts/CI gates
for v1) — ready to hand off to a building effort (`/to-tickets` → `/implement`).

## Notes

**Settled during charting (decided, not up for re-litigation on this map):**
- Fork scope: only the decision-record chain gets `cm-*` copies — `wayfinder`, `implement`,
  `to-spec`, `to-tickets`, `triage`, `setup-matt-pocock-skills` (→ `cm-setup`). The other ~13
  installed skills (`teach`, `wizard`, `handoff`, `wait-what`, `resolving-merge-conflicts`, `tdd`,
  `codebase-design`, `writing-for-agents`, `code-review`, `improve-codebase-architecture`,
  `to-questionnaire`, `ask-matt`, `grill-me`, `grilling`, `domain-modeling`, `prototype`,
  `research`, `grill-with-docs`) are untouched — they don't read or write decision storage.
- The unprefixed originals at `.agents/skills/` stay untouched as an upstream mirror; `cm-*` is a
  new, separate, diverging set.
- Portable where cheap (config-doc-driven like `setup-matt-pocock-skills`, not hardcoded to this
  repo's exact tooling) — this repo's own eval of `reference-project` named over-coupling to one
  repo's tooling as that system's main weakness.
- Extend, not replace: `docs/adr/` and the existing `.scratch/`-based wayfinder tracker keep working
  as they do today; this merge adds a layer, it doesn't rip anything out.
- Enforcement is prose-only for v1 — no `verify-agent-note-format.ts`-equivalent script, no CI gate.
  May become scripted later if the convention proves worth enforcing mechanically.
- Storage split: `cm-wayfinder`'s map + open tickets keep living in `.scratch/<effort>/` (ephemeral,
  many small transient questions — not durable knowledge on their own). Only a **resolved** ticket's
  answer becomes a real classified Agent Note under `.agents/notes/`.
- Lifecycle semantics matter: `implemented/` means *shipped code*, kept current with reality.
  A resolved wayfinder ticket is a decision, not yet built — so its Agent Note lands in
  `proposed/{class}/` at resolution time, and a later step (part of `cm-implement`) promotes it to
  `implemented/{class}/` (future-tense Proposal → present-tense Decision) when the code actually
  ships.
- Six classes adopted as-is from `reference-project`, unmodified: `feature`, `bug-fix`,
  `simplification`, `architecture`, `process`, `testing`.
- No migration of existing live maps (`cm-clone`, `e2e-coverage`) — forward-only; they finish on the
  old convention.
- Skills every session should consult: `writing-for-agents` (SKILL.md format conventions) when
  drafting the new `cm-*` skill files.

## Decisions so far

- [ADRs vs. Agent Notes — coexist or replace?](issues/01-adr-vs-agent-notes.md): Coexist on a
  scope/durability line — `docs/adr/` stays sole home for repo-wide/durable structural calls; Agent
  Notes' `architecture` class is for effort-scoped structural calls. Manual (unscripted) promotion
  path from `implemented/architecture/` to a full ADR.
- [Relationship between a wayfinder ticket file and its Agent Note](issues/02-ticket-note-relationship.md):
  Ticket's `## Answer` trims to a one-line gist + link once a note is written (not full duplication,
  not a bare pointer); note-writing is a per-ticket judgment call (skip for scoping/fact-only/abandoned
  answers), atomic with the resolve step; map always links to the ticket, never straight to the note.
- [Draft cm-wayfinder's rewritten "record the resolution" step](issues/03-cm-wayfinder-resolution-step.md):
  Step 4 keeps the existing `## Answer`/`Status: resolved` mechanics, adds a note-worthiness check
  (ticket 02's test verbatim), and — when warranted — writes a `proposed/{class}/` Agent Note using
  `reference-project`'s header/body skeleton before trimming the ticket's `## Answer` to a gist+link.
- [Design cm-implement's proposed→implemented promotion step](issues/04-cm-implement-promotion-step.md):
  `cm-implement` follows explicit forward-links from the spec/tickets (not a search) to each linked
  `proposed/` note, always promotes on full shipment (partial shipment is the one skip case), and does
  the rewrite atomically between test-suite and commit — mirroring `reference-project`'s own
  proposed→implemented rewrite rule and same-PR requirement.
- [Design cm-setup's Agent Notes scaffolding questions](issues/05-cm-setup-additions.md): `cm-setup`
  writes a new `docs/agents/notes.md` config doc (lifecycle folders, class table, the architecture/ADR
  line as fixed doctrine, trimmed header/body skeleton) but never pre-creates the `.agents/notes/`
  directory tree — git can't track empty dirs, so folders appear lazily on first note write. Adds one
  yes/no "keep the default six classes?" question mirroring the existing triage-labels section.
- [Archival: separate cm-archive-notes skill, or documented convention only?](issues/06-archival-convention.md):
  Dedicated `cm-archive-notes` skill carrying a trimmed supersession-check/classify-by-future-value
  taxonomy in prose; `manifest.json` hash-pinning dropped entirely for v1 (convention-only freezing);
  `cm-wayfinder`'s resolution step gets a one-line supersession flag, full taxonomy stays only in
  `cm-archive-notes`; rejected-note deletion stays in scope, done via normal PR review.
- [Carry forward explicit links from spec/ticket files to their Agent Notes](issues/08-cm-to-spec-note-linking.md):
  One bullet per decision, gist+link copied verbatim from the source ticket's `## Answer`. `cm-to-spec`'s
  "Implementation Decisions" bullets end with the source ticket's link when one exists; `cm-to-tickets`'
  templates gain a `## Decisions` section between "What to build" and "Blocked by" listing one bullet
  per linked note. Never merged, even when several decisions share a ticket or a map.
- [Final cm-* skill file inventory and naming](issues/07-final-skill-inventory.md): Seven new
  directories under `.agents/skills/` — `cm-wayfinder`, `cm-implement`, `cm-to-spec`, `cm-to-tickets`,
  `cm-triage`, `cm-setup` (each forked with the SKILL.md changes from tickets 03/04/08/05), plus new
  `cm-archive-notes` (ticket 06's taxonomy, no unprefixed original). No name collisions. `cm-setup`
  gains one new seed file (`notes.md`); all other seed/support files carry over unchanged.

## Not yet specified

Nothing left in scope for this round — the way to the destination is clear.

## Out of scope

- Forking `dsh-doc-site-sync`, `dsh-translate-docs`, `dsh-merging-stacked-prs` — this repo has no
  doc-publishing site, no i18n/bilingual docs, and no stacked-PR (`gh stack`) workflow (confirmed by
  exploration during charting).
- Scripted/CI enforcement of the Agent Note format — explicitly deferred to prose-only for v1.
- Migrating `.scratch/cm-clone` or `.scratch/e2e-coverage` into the new convention.
- Renaming/forking the ~13 skills outside the decision-record chain.
- `cm-trim-cot-leakage` / `cm-find-simplifications` (adapted from `dsh-trim-cot-leakage` /
  `dsh-find-simplifications`) — plausible future additions, but outside this round's fork scope (see
  Notes); a later effort, not this one.
