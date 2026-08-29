# Final cm-* skill file inventory and naming

Type: task
Status: resolved

Blocked by: 03, 04, 05, 06, 08

## Question

## Answer

**No name collisions.** None of the seven `cm-*` names below exist under `.agents/skills/` today.
The unprefixed originals (`wayfinder`, `implement`, `to-spec`, `to-tickets`, `triage`,
`setup-matt-pocock-skills`) stay as-is per the map's Notes; `cm-*` is purely additive.

**Seven skills, seven new directories under `.agents/skills/`:**

1. `cm-wayfinder/` — forked from `wayfinder/`. Files: `SKILL.md` (rewritten resolution step per
   ticket 03: note-worthiness check, writes `proposed/{class}/` note, trims `## Answer` to gist+link;
   plus the one-line supersession-check flag from ticket 06), `agents/openai.yaml` (display_name
   "CM Wayfinder", description updated for the Agent-Notes-aware resolution step).
2. `cm-implement/` — forked from `implement/`. Files: `SKILL.md` (adds the proposed→implemented
   promotion step from ticket 04: follows forward-links to linked `proposed/` notes, promotes on full
   shipment only, same-PR atomic rewrite), `agents/openai.yaml`.
3. `cm-to-spec/` — forked from `to-spec/`. Files: `SKILL.md` (Implementation Decisions bullets end
   with the source ticket's link when one exists, per ticket 08), `agents/openai.yaml`.
4. `cm-to-tickets/` — forked from `to-tickets/`. Files: `SKILL.md` (ticket template gains a
   `## Decisions` section between "What to build" and "Blocked by", one bullet per linked note, per
   ticket 08), `agents/openai.yaml`.
5. `cm-triage/` — forked from `triage/`. Files: `SKILL.md`, `AGENT-BRIEF.md`, `OUT-OF-SCOPE.md`
   (carried over unchanged — triage doesn't read or write Agent Notes), `agents/openai.yaml`.
6. `cm-setup/` — forked from `setup-matt-pocock-skills/`. Files: `SKILL.md` (new Section between
   Domain docs and "Confirm and edit": scaffolds `docs/agents/notes.md`, asks the one
   defaults-with-override six-classes question, adds the `### Agent Notes` sub-block to
   `CLAUDE.md`/`AGENTS.md` — per ticket 05), `domain.md`, `issue-tracker-github.md`,
   `issue-tracker-gitlab.md`, `issue-tracker-local.md`, `triage-labels.md` (all four seed docs carried
   over unchanged), **plus one new seed file**: `notes.md` (the `docs/agents/notes.md` template —
   lifecycle folders, six-class table, the ticket-01 ADR-coexistence line, trimmed note
   header/body skeleton), `agents/openai.yaml`.
7. `cm-archive-notes/` — new skill, no unprefixed original to fork (`reference-project`'s
   `dsh-archive-agent-notes` is the source of the adapted taxonomy, not a file in this repo). Files:
   `SKILL.md` (trimmed supersession-check + five-way classify-by-future-value taxonomy with calibrated
   examples, prose-only, no manifest/hash script, per ticket 06), `agents/openai.yaml` (display_name
   "CM Archive Notes", `allow_implicit_invocation: false` matching the rest of the chain).

**Layout pattern**, mirrored from `setup-matt-pocock-skills/`: each skill directory holds
`SKILL.md` + `agents/openai.yaml` (display_name/short_description/policy stanza, name prefixed with
"CM "), plus any seed/reference `.md` files the skill ships or reads at runtime — `cm-setup` is the
only one gaining a new seed file (`notes.md`); `cm-triage` and the rest carry their existing
supporting files over unchanged.

**Not part of this round** (per the map's Out of scope): `cm-trim-cot-leakage`,
`cm-find-simplifications`, and forks of the other ~13 skills outside the decision-record chain.

This closes the last open question before `.scratch/skill-suite-merge/spec.md` can be written.

Enumerate the exact final list of files/skills to create under `.agents/skills/` (e.g. `cm-wayfinder`,
`cm-implement`, `cm-to-spec`, `cm-to-tickets`, `cm-triage`, `cm-setup`, plus `cm-archive-notes` if
ticket 06 calls for one), confirm no name collisions with the existing unprefixed set, and produce the
directory/file layout each will need (SKILL.md plus any seed templates, mirroring how
`setup-matt-pocock-skills` ships `issue-tracker-*.md` seed files). This is the last ticket before the
spec can be written.
