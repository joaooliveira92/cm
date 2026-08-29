# Design cm-setup's Agent Notes scaffolding questions

Type: task


Status: resolved

Blocked by: 01

## Question

`cm-setup` (forked from `setup-matt-pocock-skills`) needs a new section alongside issue tracker /
triage labels / domain docs: scaffolding `.agents/notes/{proposed,implemented,rejected,archived}/
{class}/` and writing a config file (e.g. `docs/agents/notes.md`, mirroring `domain.md` /
`issue-tracker.md`) that downstream `cm-*` skills read. Depends on ticket 01's answer for what to ask
about the `architecture` class specifically (does it still route to `docs/adr/`?). Also decide: are
all six classes always created, or does setup ask which apply (matt-pocock's setup pattern prefers
defaults-with-override over per-repo bespoke lists).

## Answer

**New config file, not new directories.** `cm-setup` writes `docs/agents/notes.md` — a fourth config
doc alongside `issue-tracker.md` / `triage-labels.md` / `domain.md` — but does **not** pre-create the
`.agents/notes/{lifecycle}/{class}/` tree. Git can't track empty directories, so scaffolding them now
would either persist nothing or force `.gitkeep` clutter for classes that may never be used in a given
repo. Each lifecycle/class folder comes into existence the first time `cm-wayfinder` or `cm-implement`
actually writes a note into it — the same lazy-creation behavior `mkdir -p` gives for free. `notes.md`
documents the full six-class, four-lifecycle tree as the *convention*, whether or not any given branch
exists on disk yet.

**Architecture/ADR line: documented, not asked.** Ticket 01's coexistence answer (scope/durability
line, `docs/adr/` for repo-wide/durable, `architecture`-class Agent Notes for effort-scoped) is
already-settled doctrine by the time `cm-setup` runs — it's a property of how the `cm-*` chain works,
not a per-repo preference. `cm-setup` states it verbatim in `notes.md` (adapted from `reference-
project`'s `README.md` Classification section, trimmed to prose, no script-gate references). No
question, no section asks the user to pick a side.

**Classes: one yes/no question, defaults-with-override, mirroring Section B.** Add a new section
between Section C (Domain docs) and step 3 (Confirm and edit), following the existing triage-labels
pattern exactly:

> Do you want to keep the default six Agent Note classes — `feature`, `bug-fix`, `simplification`,
> `architecture`, `process`, `testing`? (recommended: **yes**)

On **yes** (expected default), write the six as-is into `notes.md`. Only on **no** does `cm-setup` ask
which subset applies — this repo may not need `testing` or `process` as distinct classes, for example.
This mirrors Section B's "keep the defaults?" framing rather than Section C's silent single-context
default, because unlike domain-doc layout (which exploration can infer from repo shape), class
vocabulary is a judgment call exploration can't make for the user — same reason Section B asks instead
of assuming.

**What `cm-setup` writes, concretely:**
- `docs/agents/notes.md`: lifecycle folders (`proposed/implemented/rejected/archived`), the class
  table (six rows, or the user's subset), the ADR-coexistence rule from ticket 01, and a trimmed
  header/body skeleton (`# Agent Note: <title>` / `Status:` line / `## Problem` + lifecycle-specific
  sections) — prose-only, no reference to a verification script per the map's Notes.
- A new `### Agent Notes` sub-block in the `## Agent skills` section of `CLAUDE.md`/`AGENTS.md`,
  parallel to the existing `### Issue tracker` / `### Triage labels` / `### Domain docs` sub-blocks:
  one-line summary + link to `docs/agents/notes.md`.
- Nothing under `.agents/notes/` itself — that tree is a runtime effect of `cm-wayfinder` and
  `cm-implement`, not a setup-time scaffold.
