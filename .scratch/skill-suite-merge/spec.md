# Spec: `cm-*` skill suite (aihero.dev decision-record chain × reference-project Agent Notes)

Status: ready-for-agent

## Problem Statement

This repo runs an aihero.dev-style skill chain (`wayfinder` → `to-spec` → `to-tickets` → `implement`,
plus `triage` and `setup-matt-pocock-skills`) to plan and build features. Decisions made while working
a `wayfinder` map currently live only as prose inside `.scratch/<effort>/` ticket files and a one-line
gist in the map's Decisions-so-far — ephemeral, effort-scoped, and never promoted into a durable,
classified, lifecycle-tracked record once the decision actually ships as code.

A companion repo, `reference-project`, solves this with an Agent Notes system:
`.agents/notes/{proposed,implemented,rejected,archived}/{class}/` files that carry a decision from
"proposed" through "shipped" with a stable header/body skeleton. This repo's own evaluation of
`reference-project` flagged its main weakness as over-coupling to that repo's specific tooling
(hardcoded script gates, hash-pinned manifests) — a system that isn't portable as-is.

The user wants durable, classified decision records without losing the existing wayfinder-driven
planning flow, and without inheriting `reference-project`'s tooling lock-in.

## Solution

Fork the six decision-record-chain skills into prefixed `cm-*` copies (`cm-wayfinder`, `cm-implement`,
`cm-to-spec`, `cm-to-tickets`, `cm-triage`, `cm-setup`), plus one new skill with no unprefixed
original (`cm-archive-notes`), and wire an Agent Notes layer adapted from `reference-project` —
prose-only enforcement for v1, no scripts or CI gates — into `cm-wayfinder`'s resolution step and
`cm-implement`'s shipping step. The unprefixed originals stay untouched as an upstream mirror; `cm-*`
is a new, separate, diverging set that this repo's existing `.scratch/`-based wayfinder tracker and
`docs/adr/` keep working alongside, unmodified.

## User Stories

1. As an agent running `cm-wayfinder`, I want a note-worthiness check on every resolved ticket, so
   that I only write an Agent Note for answers that assert a real choice, design, or convention — not
   for scoping calls, fact-only research, or abandoned tickets.
2. As an agent running `cm-wayfinder`, I want the note-worthiness check to apply uniformly regardless
   of a ticket's `Type` (`research`/`prototype`/`grilling`/`task`), so that a `task`-type ticket that
   happens to assert a decision still gets a note, and a `grilling`-type ticket that only closes scope
   does not.
3. As an agent running `cm-wayfinder`, I want to write a warranted Agent Note atomically in the same
   resolve step that closes the ticket, so that a ticket is never left "resolved" while claiming a
   note that doesn't exist yet.
4. As an agent running `cm-wayfinder`, I want the note written to
   `.agents/notes/proposed/{class}/yyyy-mm-dd-topic.md` with `Status: proposed`, so that unshipped
   decisions are clearly distinguished from shipped ones.
5. As an agent running `cm-wayfinder`, I want to pick `{class}` from the closed set `feature`,
   `bug-fix`, `simplification`, `architecture`, `process`, `testing`, so that every note is
   classified consistently with `reference-project`'s taxonomy.
6. As an agent running `cm-wayfinder`, I want the note's header to be exactly `# Agent Note: <title>`
   followed by a blank line then `Status: proposed`, so that every note in the tree is mechanically
   parseable by eye even without a script.
7. As an agent running `cm-wayfinder`, I want the note's body to follow the fixed section order
   `## Problem` / `## Proposal` / bespoke sections / `## Alternatives considered` /
   `## Acceptance criteria` / `## Risks`, so that notes are consistently structured and comparable.
8. As an agent running `cm-wayfinder`, I want `## Problem` derived from the ticket's `## Question`
   restated standalone, and `## Proposal` derived from the ticket's `## Answer` in future tense, so
   that the note reads coherently without needing the source ticket open.
9. As an agent running `cm-wayfinder`, I want `## Alternatives considered` to be mandatory and record
   only genuinely-weighed alternatives, so that the note doesn't fabricate a false decision trail.
10. As an agent running `cm-wayfinder`, I want, once a note is written, the ticket's `## Answer` to be
    trimmed to a one-line `**<gist>.** See [Agent Note](<path>).`, so that the durable answer has one
    source of truth and the ticket doesn't duplicate prose that can drift.
11. As an agent running `cm-wayfinder`, I want the map's Decisions-so-far entry to keep linking to the
    ticket file, never directly to the note, so that the map's existing linking convention doesn't
    branch on a per-entry fact.
12. As an agent running `cm-wayfinder`, I want a one-line supersession check before writing a new note
    — does this note replace an existing active note on the same decision — so that conflicting active
    notes don't silently accumulate; the full archive-vs-retain judgment stays out of this step.
13. As an agent running `cm-implement`, I want to discover which `proposed/{class}/` notes belong to
    the spec/tickets I'm shipping by following explicit links carried in those files, so that I never
    have to fuzzy-search `.agents/notes/proposed/` by keyword or date.
14. As an agent running `cm-implement`, I want promotion to be the default once a linked decision fully
    ships, so that a shipped decision doesn't linger in `proposed/` waiting on a separate judgment
    call.
15. As an agent running `cm-implement`, I want the one skip case to be partial shipment — the note
    stays in `proposed/` and the gap is recorded on the ticket/PR — so that partially-built decisions
    aren't misrepresented as done.
16. As an agent running `cm-implement`, I want the promotion rewrite (future-tense `## Proposal` →
    present-tense `## Decision`, `## Acceptance criteria`/`## Risks` folded into `## Consequences`,
    `Status: proposed` → `Status: implemented`, file moved to `implemented/{class}/`) to happen between
    running the full test suite and committing, so that the promoted note ships in the same commit as
    the code.
17. As an agent running `cm-to-spec`, I want each Implementation Decisions bullet whose source ticket
    produced a note to end with that ticket's gist+link sentence copied verbatim, so that the spec
    carries forward a working trail to the note without re-deriving prose.
18. As an agent running `cm-to-spec`, I want a decision whose source ticket carried no note (a
    scoping/fact-only/abandoned answer) stated in plain prose with no link, so that the spec doesn't
    fabricate a link that doesn't exist.
19. As an agent running `cm-to-spec`, I want one bullet per decision even when several decisions share
    a source ticket or map, never merged into a shared paragraph or link, so that `cm-implement`'s
    promotion step can act on each one independently.
20. As an agent running `cm-to-tickets`, I want a `## Decisions` section (or `**Decisions:**` on a real
    tracker) inserted between "What to build" and "Blocked by"/"Acceptance criteria" in the ticket
    template, listing one gist+link bullet per note the ticket implements, so that `cm-implement` has
    an explicit forward-link to follow.
21. As an agent running `cm-to-tickets`, I want a ticket with no linked decisions (pure scaffolding
    work) to omit the `## Decisions` section entirely rather than leave it empty, so that empty
    boilerplate doesn't accumulate.
22. As an agent running `cm-to-tickets` on the local-markdown tracker, I want the link to be a relative
    path to the note file, and on a real tracker whatever URL the note lives at, so that the link
    resolves correctly regardless of which tracker is configured.
23. As a repo maintainer running `cm-setup`, I want a new `docs/agents/notes.md` config doc documenting
    the four lifecycle folders, the class table, the ADR-coexistence rule, and the note header/body
    skeleton, so that downstream `cm-*` skills (and humans) have one place to read the convention.
24. As a repo maintainer running `cm-setup`, I want `cm-setup` to never pre-create the
    `.agents/notes/{lifecycle}/{class}/` directory tree, so that the repo doesn't accumulate empty
    directories or `.gitkeep` clutter for classes that may never be used.
25. As a repo maintainer running `cm-setup`, I want a single yes/no question — "keep the default six
    Agent Note classes?" (recommended: yes) — mirroring the existing triage-labels defaults-with-
    override pattern, so that setup doesn't force a bespoke class list decision on every repo.
26. As a repo maintainer running `cm-setup`, I want the ADR/Agent-Notes coexistence line stated
    verbatim as fixed doctrine in `notes.md` (not asked as a question), so that setup doesn't imply
    it's a per-repo preference when it's actually a property of how the `cm-*` chain works.
27. As a repo maintainer running `cm-setup`, I want a new `### Agent Notes` sub-block added to
    `CLAUDE.md`/`AGENTS.md`'s `## Agent skills` section, parallel to the existing `### Issue tracker` /
    `### Triage labels` / `### Domain docs` sub-blocks, so that agents discover the convention the same
    way they discover the others.
28. As an agent making a structural decision, I want repo-wide/durable structural calls to still go to
    `docs/adr/` and only effort-scoped structural calls to go to `.agents/notes/{lifecycle}/
    architecture/`, so that the ADR corpus stays reserved for permanent, system-shaping records.
29. As an agent, I want a documented (manual, unscripted) promotion path from
    `implemented/architecture/` to a full ADR, so that an effort-scoped call that turns out to be
    durable after all isn't stuck in the wrong tier.
30. As an agent auditing Agent Notes, I want a dedicated `cm-archive-notes` skill carrying a trimmed
    five-way classify-by-future-value taxonomy (implemented-keep, implemented-archive,
    proposed-never-archive, rejected-keep-as-guardrail, rejected-delete) with calibrated examples, so
    that archival judgment isn't buried as a subsection of another skill's docs.
31. As an agent running `cm-archive-notes`, I want archival to be a stated prose convention only
    ("never edit, move, or reformat a note once archived") with no hash-pinned manifest, so that
    freezing doesn't depend on tooling this repo doesn't have.
32. As an agent, I want rejected-note deletion to stay in scope as a normal, reviewed PR action (git
    history as the audit trail), so that stale rejected notes can be cleaned up without new tooling.
33. As a repo maintainer, I want the seven new skill directories
    (`cm-wayfinder`, `cm-implement`, `cm-to-spec`, `cm-to-tickets`, `cm-triage`, `cm-setup`,
    `cm-archive-notes`) to have zero name collisions with the existing `.agents/skills/` set, so that
    both chains can coexist without ambiguity.
34. As a repo maintainer, I want the ~13 skills outside the decision-record chain (`teach`, `wizard`,
    `handoff`, `wait-what`, `resolving-merge-conflicts`, `tdd`, `codebase-design`,
    `writing-for-agents`, `code-review`, `improve-codebase-architecture`, `to-questionnaire`,
    `ask-matt`, `grill-me`, `grilling`, `domain-modeling`, `prototype`, `research`,
    `grill-with-docs`) left completely untouched, so that this merge doesn't have blast radius beyond
    the chain that actually reads/writes decision storage.
35. As a repo maintainer, I want `cm-triage`'s files (`SKILL.md`, `AGENT-BRIEF.md`,
    `OUT-OF-SCOPE.md`) carried over unchanged from `triage/`, so that triage behavior doesn't diverge
    even though it's part of the forked set (it doesn't read or write Agent Notes).
36. As a repo maintainer, I want `cm-setup` to ship one new seed file (`notes.md`) alongside its
    carried-over `domain.md`/`issue-tracker-*.md`/`triage-labels.md`, so that the `docs/agents/
    notes.md` template it writes is itself version-controlled and reviewable.
37. As a future contributor reading this repo's domain docs, I want none of this convention's
    vocabulary (Agent Note, supersession check, classify-by-future-value) to leak into `CONTEXT.md`,
    so that the game-domain glossary stays scoped to the audit-product domain, not agent tooling.
38. As a repo maintainer, I want no migration of the two existing live wayfinder maps (`cm-clone`,
    `e2e-coverage`) into the new convention, so that in-flight work finishes on the convention it
    started on rather than being disrupted mid-flight.

## Implementation Decisions

- **Fork scope**: only `wayfinder`, `implement`, `to-spec`, `to-tickets`, `triage`,
  `setup-matt-pocock-skills` get `cm-*` forks (→ `cm-setup` for the last one); one new skill,
  `cm-archive-notes`, has no unprefixed original. The other ~13 installed skills are untouched.
- **Coexistence, not replacement**: unprefixed originals at `.agents/skills/` stay as an untouched
  upstream mirror. `docs/adr/` and the existing `.scratch/`-based wayfinder tracker keep functioning
  exactly as documented in `docs/agents/issue-tracker.md` today; `cm-*` is additive.
- **Portability**: `cm-*` skills follow `setup-matt-pocock-skills`' existing pattern of being
  config-doc-driven rather than hardcoded to this repo's specific tooling, per this repo's own
  evaluation of `reference-project`'s over-coupling weakness.
- **Enforcement**: prose-only for v1 across the whole convention — no
  `verify-agent-note-format.ts`-equivalent script, no CI gate, no hash-pinned manifest. May become
  scripted later if the convention proves worth enforcing mechanically.
- **ADR/Agent-Notes coexistence** (scope/durability line, not topic line): `docs/adr/` stays sole home
  for repo-wide/durable structural decisions; `.agents/notes/{lifecycle}/architecture/` is for
  effort-scoped structural calls tied to one wayfinder map or implementation effort. Manual (unscripted)
  promotion path from `implemented/architecture/` to a full ADR exists as a documented judgment call.
  [Coexist on a scope/durability line.](issues/01-adr-vs-agent-notes.md)
- **Storage split**: `cm-wayfinder`'s map + open tickets keep living in `.scratch/<effort>/`
  (ephemeral). Only a resolved ticket's answer, when note-worthy, becomes a classified Agent Note
  under `.agents/notes/`.
- **Lifecycle semantics**: `implemented/` means shipped code kept current with reality. A resolved
  wayfinder ticket is a decision, not yet built, so its note lands in `proposed/{class}/` at
  resolution time; `cm-implement` promotes it to `implemented/{class}/` when the code actually ships.
- **Six classes adopted as-is** from `reference-project`: `feature`, `bug-fix`, `simplification`,
  `architecture`, `process`, `testing`.
- **No migration** of existing live maps (`cm-clone`, `e2e-coverage`) — forward-only.
- **Ticket/note relationship**: a resolved ticket's `## Answer` trims to a one-line
  `**<gist>.** See [Agent Note](<relative-path-to-note>).` once a note is written — same gist-then-link
  shape the map's Decisions-so-far already uses. Note-worthiness is a per-ticket judgment call
  evaluated from the answer's content alone (uniform across ticket `Type`), skipped only for pure
  scoping calls, fact-only findings with no attached decision, or superseded/abandoned tickets. Note
  writing is atomic with the resolve step. The map always links to the ticket, never straight to the
  note. [Gist + pointer, note-worthiness a per-ticket judgment
  call.](issues/02-ticket-note-relationship.md)
- **`cm-wayfinder`'s resolution step** replaces the unprefixed skill's step 4 with: append `## Answer`
  and set `Status: resolved` as today; run the note-worthiness check; if warranted, write
  `.agents/notes/proposed/{class}/yyyy-mm-dd-topic.md` atomically, with header
  `# Agent Note: <title>` / blank line / `Status: proposed`, and body order `## Problem` (ticket's
  `## Question`, restated standalone) / `## Proposal` (ticket's `## Answer`, future tense) / bespoke
  sections / `## Alternatives considered` (mandatory, only genuinely-weighed alternatives) /
  `## Acceptance criteria` / `## Risks`; trim the ticket's `## Answer` to gist+link; append the
  context pointer to the map's Decisions-so-far linking the ticket file (never the note). Before
  writing, check whether the new note supersedes an existing active note on the same decision and, if
  so, cross-link inline or flag for a later `cm-archive-notes` pass (full archive-vs-retain judgment
  stays out of this step). [Exact resolution-step
  rewrite.](issues/03-cm-wayfinder-resolution-step.md)
- **`cm-implement`'s promotion step**: discovery is via explicit forward-links carried in the
  spec/tickets being built (never a keyword/date-range search of `.agents/notes/proposed/`). Promotion
  is the default once a linked decision fully ships: rewrite `## Proposal` → present-tense
  `## Decision`, fold `## Acceptance criteria`/`## Risks` into `## Consequences`, flip
  `Status: proposed` → `Status: implemented`, move the file to `implemented/{class}/`. The one skip
  case is partial shipment — note stays in `proposed/`, gap recorded on the ticket/PR. The rewrite is
  its own step inserted between running the full test suite and committing, so it ships atomically in
  the same commit as the code. [Discovery via forward-links, promotion default with partial-shipment
  skip.](.agents/notes/proposed/process/2026-08-27-cm-implement-promotion-step.md)
- **`cm-to-spec`/`cm-to-tickets` note linking**: `cm-to-spec`'s Implementation Decisions bullets end
  with the source ticket's gist+link sentence verbatim when a note exists; plain prose with no link
  when it doesn't. `cm-to-tickets`' templates (local-file and issue) gain a `## Decisions` /
  `**Decisions:**` section between "What to build" and "Blocked by"/"Acceptance criteria", one bullet
  per linked note, gist+link copied verbatim from the source ticket — omitted entirely when a ticket
  has no linked decisions. One decision, one bullet, one link, never merged even when several share a
  source ticket or map. On the local tracker the link is a relative path to the note; on a real
  tracker it's the note's URL. [One bullet per decision, verbatim gist+link, never
  merged.](.agents/notes/proposed/process/2026-08-27-cm-to-spec-note-linking.md)
- **`cm-setup` additions**: writes a new `docs/agents/notes.md` config doc (fourth alongside
  `issue-tracker.md`/`triage-labels.md`/`domain.md`) documenting the four lifecycle folders, the class
  table, the ADR-coexistence rule (stated verbatim as fixed doctrine, not asked as a question), and the
  trimmed note header/body skeleton — never pre-creates the `.agents/notes/{lifecycle}/{class}/` tree
  (git can't track empty dirs; folders appear lazily on first note write). Adds one new section between
  Domain docs and "Confirm and edit": a single yes/no "keep the default six Agent Note classes?"
  question (recommended: yes), mirroring the existing triage-labels defaults-with-override pattern; on
  "no", asks which subset applies. Adds a new `### Agent Notes` sub-block to the `## Agent skills`
  section of `CLAUDE.md`/`AGENTS.md`, parallel to `### Issue tracker`/`### Triage labels`/
  `### Domain docs`. [New config file, not new directories; one defaults-with-override
  question.](issues/05-cm-setup-additions.md)
- **Archival**: dedicated `cm-archive-notes` skill (no unprefixed original) carrying a trimmed
  supersession-check + five-way classify-by-future-value taxonomy (implemented-keep,
  implemented-archive, proposed-never-archive, rejected-keep-as-guardrail, rejected-delete) with
  calibrated examples, invoked explicitly. `manifest.json` hash-pinning is dropped entirely for v1 —
  freezing an archived note is a stated prose convention only. `cm-wayfinder`'s resolution step carries
  only a one-line supersession flag; the full taxonomy lives solely in `cm-archive-notes`.
  Rejected-note deletion stays in scope, done via normal reviewed PR. [Dedicated skill, prose-only
  freezing, two-tier supersession
  split.](issues/06-archival-convention.md)
- **Final file inventory** (all seven new directories under `.agents/skills/`, no name collisions with
  the existing unprefixed set):
  1. `cm-wayfinder/` — `SKILL.md` (resolution step per ticket 03, plus ticket 06's supersession flag),
     `agents/openai.yaml`.
  2. `cm-implement/` — `SKILL.md` (promotion step per ticket 04), `agents/openai.yaml`.
  3. `cm-to-spec/` — `SKILL.md` (Implementation Decisions linking per ticket 08), `agents/openai.yaml`.
  4. `cm-to-tickets/` — `SKILL.md` (`## Decisions` section per ticket 08), `agents/openai.yaml`.
  5. `cm-triage/` — `SKILL.md`, `AGENT-BRIEF.md`, `OUT-OF-SCOPE.md` (carried over unchanged),
     `agents/openai.yaml`.
  6. `cm-setup/` — `SKILL.md` (new Agent Notes scaffolding section per ticket 05), `domain.md`,
     `issue-tracker-github.md`, `issue-tracker-gitlab.md`, `issue-tracker-local.md`,
     `triage-labels.md` (all carried over unchanged), plus new seed file `notes.md`,
     `agents/openai.yaml`.
  7. `cm-archive-notes/` — `SKILL.md` (taxonomy per ticket 06), `agents/openai.yaml`
     (`display_name: "CM Archive Notes"`, `allow_implicit_invocation: false`).
  Layout mirrors `setup-matt-pocock-skills/`: each directory holds `SKILL.md` +
  `agents/openai.yaml` (display_name prefixed "CM ", short_description, policy stanza) plus any seed
  files. [Seven directories, exact
  layout.](issues/07-final-skill-inventory.md)

## Testing Decisions

- This is a documentation/skill-file merge (markdown skill definitions, config docs, `openai.yaml`
  manifests) — there is no application code path to unit- or integration-test. "Correctness" here
  means: the produced `SKILL.md`/config files match the decisions above, no name collisions exist
  under `.agents/skills/`, and the convention is internally consistent (e.g. `cm-wayfinder` writes
  exactly what `cm-implement` expects to find via forward-link, `cm-to-spec`/`cm-to-tickets` produce
  exactly the link shape `cm-implement` follows).
- A good check for this work is a **read-through consistency pass**: for each pair of skills that hand
  off state to each other (`cm-wayfinder` → `cm-to-spec`/`cm-to-tickets` → `cm-implement`), confirm the
  file path, header format, and link format one skill writes is byte-for-byte what the next skill
  reads. This is the equivalent of a contract test for prose-driven skills.
- Prior art in this repo: none of the existing skill forks (there are none yet) have a test suite of
  their own — `setup-matt-pocock-skills` and the rest are exercised by using them, not by automated
  tests. No new testing infrastructure is introduced by this spec.
- Once the seven directories exist, a manual dry run is the practical verification: run `cm-setup` on
  a scratch branch, confirm `docs/agents/notes.md` and the `AGENTS.md`/`CLAUDE.md` sub-block are
  written as specified; then run a small `cm-wayfinder` map through resolve to confirm a note lands at
  the right path with the right header/body shape and the ticket trims correctly.

## Out of Scope

- Forking `dsh-doc-site-sync`, `dsh-translate-docs`, `dsh-merging-stacked-prs` — this repo has no
  doc-publishing site, no i18n/bilingual docs, and no stacked-PR (`gh stack`) workflow.
- Scripted or CI enforcement of the Agent Note format (`verify-agent-note-format`-equivalent) —
  explicitly deferred to prose-only for v1.
- Migrating `.scratch/cm-clone` or `.scratch/e2e-coverage` into the new convention — they finish on
  the old convention.
- Renaming or forking the ~13 skills outside the decision-record chain (`teach`, `wizard`, `handoff`,
  `wait-what`, `resolving-merge-conflicts`, `tdd`, `codebase-design`, `writing-for-agents`,
  `code-review`, `improve-codebase-architecture`, `to-questionnaire`, `ask-matt`, `grill-me`,
  `grilling`, `domain-modeling`, `prototype`, `research`, `grill-with-docs`).
- `cm-trim-cot-leakage` / `cm-find-simplifications` (adapted from `dsh-trim-cot-leakage` /
  `dsh-find-simplifications`) — plausible future additions, but a later effort, not this one.
- `manifest.json` hash-pinning for archived notes — dropped entirely for v1; archival freezing is
  convention-only.
- Pre-creating the `.agents/notes/{lifecycle}/{class}/` directory tree at setup time — folders appear
  lazily on first note write.

## Further Notes

- This spec closes out `.scratch/skill-suite-merge/map.md`; all eight tickets (`01`–`08`) are
  resolved and the map's "Not yet specified" section is empty.
- Two of the eight tickets (`04` and `08`) produced their own `proposed/process/` Agent Notes ahead of
  this convention formally existing — written by hand as worked examples of the format being
  specified. These are backward-referenced above rather than duplicated. They currently sit at
  `.agents/notes/proposed/process/2026-08-27-cm-implement-promotion-step.md` and
  `.agents/notes/proposed/process/2026-08-27-cm-to-spec-note-linking.md`; once `cm-implement` exists
  and ships this spec's own code, its promotion step should apply to these two notes as the first real
  exercise of the promotion rule.
- Building this spec effectively means writing eight new `SKILL.md`/config files, so the natural next
  step is `/to-tickets` to break the seven-directory inventory (ticket 07) into one ticket per skill
  directory, each `Blocked by` the config docs it depends on (`cm-setup`'s `notes.md` before any skill
  that reads the convention it defines).
