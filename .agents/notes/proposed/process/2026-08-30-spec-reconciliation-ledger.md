# Agent Note: Reconciliation ledger for imported screen specs

Status: proposed

## Problem

`docs/specs/` holds an imported clean-room specification of 19 screen groups. Group A alone is 30,202
lines across 22 files. The import is not a set of requirements: it reads as generated from a generic
template rather than authored against this game, and it routinely specifies subsystems this project has
never decided to build — multiplayer sessions, cloud synchronization, worker pools, an unsaved-progress
model that contradicts durable-at-commit persistence.

Reconciling a screen against its import therefore produces two outputs: what the implementation must do,
and a record of every place the import is knowingly not followed. Without the second output, the
divergences are invisible and get re-litigated. Someone reads `21_quit_game_confirmation.md §8 Cloud
synchronization`, finds no cloud sync in the app, and cannot tell whether it was ruled out, contradicted
by a decision made elsewhere, or simply never built.

That last distinction is the one that carries weight. "We will never do this" and "we have not done this
yet" read identically in a flat list of gaps, and conflating them is how such a record decays into an
undifferentiated backlog nobody trusts.

## Proposal

Each spec group gets one **reconciliation ledger** at
`docs/specs/<group>/RECONCILIATION.md`, recording only divergence. Group A's is the pilot; the other
eighteen groups adopt it only if the pilot holds.

### The ledger is an index, not a store

A row states the divergence in one line and points at the decision carrying it. Any rationale needing
more than a line belongs in an Agent Note, with the row linking to it. A reader must never discover a
decision for the first time in the ledger — it indexes decisions recorded elsewhere. This mirrors the
wayfinder map's own index-not-store discipline and keeps `.agents/notes/` the sole decision record
(see [[2026-08-30-agent-notes-are-the-sole-decision-record]]).

### Four kinds, each with a mandatory anchor

Every row is one of four kinds, and each kind's obligation is carried in a single **Anchor** column whose
meaning is set by the kind:

- `out-of-scope` — permanently outside this game. Anchor holds the reason. Never returns.
- `contradicted` — this codebase already made an incompatible decision. Anchor holds the Agent Note or
  `CONTEXT.md` term carrying that decision. Returns only if that decision is overturned.
- `deferred` — wanted, in scope, unbuilt. Anchor holds the owning spec group, or the literal
  `unscheduled`. This is the kind that rots, so it is the one required to name where the work went.
- `renamed` — the concept exists here under different vocabulary; behaviour agrees. Anchor holds the
  `CONTEXT.md` term.

One always-populated Anchor column is chosen over four kind-specific optional columns because an empty
Anchor is visibly wrong on sight regardless of kind, whereas four sparse columns let a row skip its
obligation silently.

`renamed` is retained despite asserting agreement rather than divergence. It is the cheapest row to
write and the most expensive to omit: without it, the next reader sees the import say "Main Menu",
sees the code say `saveList`, and re-opens a settled question. It also keeps the ledger from reading as
a pure complaint list.

### Citation key

A row cites the import **file, section number, and heading text** — `21_quit_game_confirmation.md §8
Cloud synchronization`. The heading text is carried because the import is template-generated and its
numbering is not trusted to be stable; a renumbered section still resolves for a human reader.
`verify-md-links` checks the file half and does not check `#fragment` anchors, so the file link is the
only machine-checked part of a citation.

### Granularity

One row per `## N.` section, with a single row allowed to cite several sections when one reason disposes
of them all. Per-screen summary rows lose the citation that makes the ledger auditable against the
import; per-subsection rows would generate hundreds of entries in the 1,700-line files without adding
precision, and `### N.M` subsections exist in only some import files.

### Silence, and what it asserts

Sections followed as written get no row. Each screen therefore carries a status line — `Audited`,
`Not yet audited`, or `New design` — and under an *audited* screen the standing rule is that every
section not listed is followed as written. Under the other two, silence asserts nothing. That single
line is what converts absence into a claim; it is also the only field that must be maintained as audit
tickets close. The alternative, listing every followed section explicitly, would multiply the file's
size to restate agreement.

### The import is never edited

The 22 Group A files, and every other group's, stay exactly as they arrived. Their value is that the
diff between what arrived and what was chosen remains visible. A ledger appended into the import
destroys that.

### Ticket references are unlinked

Status lines name the originating ticket in prose rather than linking it. Tickets live under
`.scratch/`, which is cleared when an effort is archived; the ledger outlives the effort that produced
it, and a link into `.scratch/` would fail `verify-md-links` the day the effort is archived.

## Duplicate screens in the import

`Screen 2: New Game, Database Initialization` appears in full, with an identical 29-section structure,
in both `01_app_shell.md` and `02_new_game.md`. `01_app_shell.md` additionally contains Screen 1 and a
screen-inventory preamble, so its `## N.` numbering restarts three times and is not unique within the
file. `02_new_game.md` is canonical for Screen 2; the copy inside `01_app_shell.md` is not audited
separately, and the file-plus-heading citation key is what keeps the two distinguishable.

## Alternatives considered

- **Per-screen deviation sections inside the effort's `spec.md`.** Puts the divergence next to the
  requirement it contradicts, which is where a reader wants it. Rejected because `spec.md` is a handoff
  artifact for `/to-spec` living under `.scratch/`, and the question "why doesn't the app do X" is asked
  years after the effort is archived.
- **Appending a reconciliation section to each imported spec file.** Keeps everything in one place per
  screen. Rejected because it edits a vendored import and destroys the distinction between what the
  import said and what this project decided.
- **A single flat list of gaps with a free-text reason.** Simplest to write. Rejected because it is
  exactly the failure mode described above: permanent exclusions and unbuilt work become
  indistinguishable within weeks.
- **Prose blocks per entry rather than table rows.** Handles nuance without a link hop. Rejected because
  Group A alone will hold well over a hundred entries; the table's one-line-per-cell constraint is what
  forces rationale out into Agent Notes where it belongs.
- **Recording followed sections as well as diverging ones**, making coverage self-evident without a
  status line. Rejected on size: it would restate most of a 30,000-line import to say "yes".
- **Naming it a deviation register.** Rejected because "deviation" grants the import a normative
  authority it does not have; the reconciliation framing also survives the case where the import is
  right and this codebase has a genuine gap.

## Acceptance criteria

- `docs/specs/group_a_application_shell_and_game_lifecycle_remaining/RECONCILIATION.md` exists, explains
  the four kinds and the status lines, and carries a coverage table naming all 21 screens.
- Screen 21 is written out in full as the worked example, exercising all four kinds.
- Every row has a populated Anchor.
- No file under `docs/specs/` has been edited other than the new ledger.
- `pnpm check:all` is green, including `verify-md-links`.
- `CONTEXT.md` carries the terms any `renamed` row anchors to.

## Risks

- **The status line is the whole coverage guarantee and nothing enforces it.** An audit ticket that
  closes without flipping `Not yet audited` leaves the ledger asserting less than it should; worse, one
  that flips the line without doing the work leaves it asserting more. There is no gate for this, by
  design — enforcement is prose-only in this repo — so it rests on the audit tickets themselves.
- **`deferred` rows can still accumulate** even with a mandatory owner, if `unscheduled` becomes the
  habitual answer. The anchor makes the rot visible rather than preventing it.
- **A ledger per group is 19 files if the pilot generalises**, with the cross-group divergences (the
  multiplayer axis appears in most groups) restated in each. Extracting shared rows was not attempted;
  the pilot is deliberately one group, and whether the repetition is tolerable is a question for the
  second group, not this one.
- **Anchoring `contradicted` rows to notes that do not exist yet.** Screen 21's durable-at-commit rows
  currently anchor to the domain-bounded-deciders note, which establishes the single-writer local SQLite
  premise but does not itself state "there is no unsaved progress". That explicit note is owed by the
  screen 21 design ticket, and until it lands the anchor is weaker than the rule demands.
