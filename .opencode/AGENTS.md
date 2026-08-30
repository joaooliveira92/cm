# AGENTS.md — .opencode

This is the opencode wiring for the cm-clone autonomous engineering pipeline: the four orchestrator
subagents (`.opencode/agents/`) and the slash commands (`.opencode/command/`). It contains no
application logic — it is only the instructions and permissions for agents editing this directory.

## What lives here

| Path | Role | Edit | Bash |
|---|---|---|---|
| `agents/spec-creator.md` | spec-creator subagent | allow | ask |
| `agents/research.md` | research subagent | allow | ask |
| `agents/implementator.md` | implementator subagent | allow | allow |
| `agents/reviewer.md` | reviewer subagent | deny | ask |
| `command/boot.md` | `/boot` command | — | — |
| `command/chart.md` | `/chart` command | — | — |
| `command/gate.md` | `/gate` command | — | — |
| `command/sprint.md` | `/sprint` command | — | — |

Each file is a Markdown document with YAML frontmatter (`description`, `mode`/`agent`, `permission`).
The pipeline order is **spec-creator → research → implementator → reviewer**, run by the `build`
orchestrator from `/sprint`; `/chart` handles one foggy decision per session; `/gate` observes and
reports only.

## Editing rules

- Keep each agent/command file focused on its one role. These files are instructions, not
  implementation — do not add logic or scripts here.
- Respect the permission intent in the frontmatter: the reviewer **never** edits; the implementator
  never commits. Do not loosen these constraints.
- Match the existing register: terse, imperative, referencing `.agents/skills/`, `.ai/`, and
  `AGENTS.md` by path rather than restating their content wholesale.
- The behavior these files invoke lives upstream (`..`): `.agents/skills/`, `.ai/`, and the root
  `AGENTS.md`. When the pipeline changes, prefer editing there and only reflecting the change here.
- `node_modules/` and the package manifests (`package.json`, `package-lock.json`, `bun.lock`) are
  local-only; do not commit them.

## Boundaries

- Do not treat this directory as a place for repo engineering policy — that belongs in the root
  `AGENTS.md`, `.ai/`, or `.agents/skills/`.
- If a command or agent file contradicts the root `AGENTS.md` or `.ai/` contracts, those upstream
  documents win; fix the mismatch here.
