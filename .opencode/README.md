# .opencode

opencode configuration for the cm-clone autonomous engineering pipeline. It defines the four
orchestrator **subagents** (`.opencode/agents/`) and the **slash commands** (`.opencode/command/`)
that drive the cm-* skills in `.agents/skills/`.

## Layout

| Path | Purpose |
|---|---|
| [agents/implementator.md](agents/implementator.md) | The **implementator** subagent: executes one frontier ticket as a vertical slice, writes code and tests, runs focused validation. Edit allowed; never commits. |
| [agents/research.md](agents/research.md) | The **research** subagent: grounds factual questions against primary sources and writes one note under `docs/research/`. Writes notes only; never touches code, specs, or game data. |
| [agents/reviewer.md](agents/reviewer.md) | The **reviewer** subagent: adversarial, read-only review of an implemented ticket along the code-review skill's Standards and Spec axes; returns severity-tagged findings and a verdict. Never edits. |
| [agents/spec-creator.md](agents/spec-creator.md) | The **spec-creator** subagent: synthesizes resolved decision tickets into one precise spec at `.scratch/<effort>/spec.md` (cm-to-spec format). Writes the spec file only. |
| [command/boot.md](command/boot.md) | `/boot` — start the autonomous orchestrator from a zero-context session: verify repo state, load minimum operating context, launch the frontier sprint. |
| [command/chart.md](command/chart.md) | `/chart` — chart one foggy effort with `cm-wayfinder` and resolve exactly one decision ticket, writing its Agent Note. One decision per session; the front half of the pipeline. |
| [command/gate.md](command/gate.md) | `/gate` — run the full orchestrator validation gate and write the sprint's validation report. Observe and report; never fixes. |
| [command/sprint.md](command/sprint.md) | `/sprint` — run the autonomous engineering agent: execute the current frontier sprint through the 4-role pipeline and the validation gate, then auto-advance until a stop condition. |

## Pipeline

A sprint flows through the four roles in order: **spec-creator → research → implementator →
reviewer**, with the orchestrator (the `build` agent running `/sprint`) owning Git, traceability, and
the validation gate before every commit. `/chart` is the foggy-effort front half: one resolved
decision per session, no code, no spec. `/gate` is the standalone, read-only validation report.

## Relationship to the repo

This configuration is only the wiring. The behavior it invokes lives in:

- `.agents/skills/` — the cm-* skill suite and the domain/code-review skills the agents import by
  name.
- `.ai/` — the autonomous-agent authority, the engineering contract, the orchestration pipeline,
  and the sprint plan these commands and agents treat as binding.
- `AGENTS.md` — repo conventions and the quality gate (`pnpm check:all`).

## Dependency

`package.json` pins `@opencode-ai/plugin` for plugin typing. `node_modules`, `package.json`,
`package-lock.json`, and `bun.lock` are intentionally gitignored locally.
