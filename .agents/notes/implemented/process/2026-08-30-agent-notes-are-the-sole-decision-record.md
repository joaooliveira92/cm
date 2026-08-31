# Agent Note: Agent Notes are the sole decision record; the ADR layer is retired

Status: implemented

## Problem

This repo ran two decision layers side by side. Twelve numbered ADRs under `docs/adr/` held repo-wide,
durable, structural decisions; Agent Notes under `.agents/notes/` held decisions scoped to one
wayfinder map or implementation effort, with a `proposed` → `implemented` lifecycle.

The boundary between them was a judgment call — "durable enough for an ADR" versus "scoped to one
effort" — that had to be made every time a decision was recorded, and it was maintenance for no
mechanical benefit: both layers were plain markdown, neither was validated, and the notes layer already
carried strictly more structure (lifecycle, class, mandatory alternatives).

The ADR directory was then deleted from the working tree, which forced the question rather than posing
it. The deletion also broke 32 markdown links and left `pnpm check:all` red, left 151 `ADR-000x`
citations pointing at nothing, and left four instruction documents — including a vendored skill —
telling every future agent to write ADRs into a directory that no longer existed.

## Decision

**Agent Notes under `.agents/notes/` are this repo's only decision record.** `docs/adr/` is deleted, and
no document instructs an agent to create it. A decision that would once have been an ADR is an
`architecture`-class note; the lifecycle folder, not the directory, now carries how settled it is.

### The twelve ADRs were migrated, not discarded

Ten became new `implemented/` notes, dated to their original authoring date rather than the migration
date, since the filename date records when a decision was first proposed:

| Was | Now |
|---|---|
| ADR-0002 match engine | `implemented/architecture/2026-08-27-match-engine-three-phase-and-deterministic-seed` |
| ADR-0003 role rating | `implemented/architecture/2026-08-27-role-rating-outside-match-engine` |
| ADR-0004 calendar | `implemented/architecture/2026-08-27-fixture-driven-calendar` |
| ADR-0005 transfer economy | `implemented/architecture/2026-08-27-formula-driven-transfer-economy` |
| ADR-0006 board objectives | `implemented/feature/2026-08-27-board-objectives-and-manager-sacking` |
| ADR-0007 deciders | `implemented/architecture/2026-08-27-domain-bounded-deciders-and-chunked-resimulation` |
| ADR-0008 commentary | `implemented/architecture/2026-08-27-templated-match-commentary` |
| ADR-0009 contact duels | `implemented/feature/2026-08-27-contact-duel-modeling` |
| ADR-0010 post-handoff routing | `implemented/process/2026-08-27-classifying-post-handoff-decisions` |
| ADR-0011 player development | `implemented/feature/2026-08-28-deterministic-fractional-player-development` |

Two were **absorbed** rather than migrated, because a note already stated everything they contained:
ADR-0001 into `proposed/architecture/2026-08-29-player-ratings-are-derived-projections` (whose
Alternatives section gained ADR-0001's read-cost argument), and ADR-0012 into
`implemented/architecture/2026-08-29-action-model` (which ADR-0012 had merely pointed back at).

ADR-0010's own routing rule named `docs/adr/` as the destination for architectural decisions. Its
migrated form names `architecture`-class notes instead — the only content change made during migration.
See [classifying post-handoff decisions](2026-08-27-classifying-post-handoff-decisions.md), which
remains the rule for *which* record a decision belongs in; this note only changes *where* those records
live.

### Citations were repointed by link, not by identifier

Every markdown **link** to `docs/adr/` was rewritten to the note that absorbed it, including eleven that
pointed at the directory rather than a file and only surfaced once the empty directory was removed.

The roughly 110 `ADR-000x` citations in source and test comments were deliberately **left in place**.
They are stable historical identifiers, no gate checks them, and rewriting 110 comment sites by hand
would have been a large mechanical diff across the engine for no functional gain. The Decision-record
column of `.ai/TRACEABILITY.md` maps every identifier to its note, and `docs/agents/notes.md` tells
readers to treat such a citation as a pointer rather than as evidence a file exists.

### Two vendored skills were forked

`domain-modeling` and `improve-codebase-architecture` come from `mattpocock/skills` and both instructed
agents to read and write ADRs. Both were edited in place, marked with a `repo-fork` HTML comment, and
flagged in `skills-lock.json` with `forked: true` and a reason. Their upstream hashes are now pre-fork
baselines: re-syncing either without re-applying the fork silently reintroduces ADR guidance.

The `cm-setup` and `setup-matt-pocock-skills` `domain.md` **templates** were deliberately left generic.
They describe what setup installs into any repo, and abolishing ADRs is this repo's call, not a
universal one. The consequence is recorded below.

## Alternatives considered

- **Restore the twelve ADRs and keep both layers.** Rejected by the user as a deliberate call. It was
  the cheapest path to a green gate — one `git checkout` — and would have preserved 151 citations
  intact, but it keeps two markdown decision layers whose boundary is a judgment call.
- **Delete the ADRs without migrating them.** Rejected: the twelve records hold the rationale for
  derived ratings, deterministic seeding, the fixture-driven calendar, sacking, the decider split,
  commentary, injuries, and development. All of it is load-bearing and none of it is recorded anywhere
  else. Recovering the content cost one `git show` per file.
- **Keep `docs/adr/` as an empty directory** so existing directory links keep resolving. Rejected: an
  empty directory named for an abolished convention invites refilling. Removing it is what exposed the
  eleven directory-level links, which were broken in meaning even while they resolved on disk.
- **Rewrite all 151 citations now.** Rejected as a large mechanical diff with no gate behind it; see
  above.
- **Rewrite the `cm-setup` templates too.** Rejected: they are scaffolding for other repos.

## Consequences

- `pnpm check:all` is green: 570 files checked, all links resolve.
- One decision layer, one format, no "is this ADR-worthy?" judgment at record time.
- `.ai/TRACEABILITY.md`'s Decision-record column is now the ADR-identifier-to-note mapping, which makes
  it load-bearing rather than merely descriptive. If it drifts, the ~110 historical citations become
  unresolvable.
- **Re-running `cm-setup` would overwrite `docs/agents/domain.md` with ADR guidance.** The ADR removal
  must be re-applied by hand afterwards. This is recorded in `docs/agents/notes.md` as well.
- **Re-syncing `domain-modeling` or `improve-codebase-architecture` from upstream would reintroduce ADR
  instructions.** The lockfile flags both; the fork must be re-applied on any sync.
- `.agents/skills/domain-modeling/ADR-FORMAT.md` was deleted, having lost its only referent.
- Notes now carry the full weight of the decision record, including decisions the ADR layer would have
  held. Whether `.agents/notes/implemented/architecture/` stays scannable as it grows is a real
  question this decision does not answer.

## Note on lifecycle

This note is written directly as `implemented` rather than `proposed`, which departs from
`cm-wayfinder`'s rule that tickets it resolves always land in `proposed/`. The rule assumes resolution
decides and a later `cm-implement` pass ships. Ticket 01 of the Group A reconciliation map was chartered
as that map's deliberate execution exception — the work shipped in the same session that decided it —
so `proposed` would have been false at the moment of writing.
