# `.ai/` — the autonomous workflow

Governance for agents running cm-clone **without a human in the loop**: what the standards are, how
much an agent may decide alone, and the procedure a sprint follows from question to commit.

Everyday agent work does not need this folder — [AGENTS.md](../AGENTS.md) and the `cm-*` skills
cover it. `.ai/` is what you load when an agent is going to run a whole sprint by itself, launched
via [/sprint](../.opencode/command/sprint.md) or [/boot](../.opencode/command/boot.md).

## The files

| File | Answers |
|---|---|---|
| [ENGINEERING-CONTRACT.md](ENGINEERING-CONTRACT.md) | What good looks like here — boundaries, authority, determinism, Effect discipline, testing, gates. Binding. |
| [AUTONOMOUS-AGENT.md](AUTONOMOUS-AGENT.md) | How much authority the agent has: decide alone vs. stop, plus Git and failure policy. |
| [ORCHESTRATION.md](ORCHESTRATION.md) | The pipeline: four roles, which skill each runs, the handoff contract, the validation gate. |
| [IMPLEMENTATION-PROMPT.md](IMPLEMENTATION-PROMPT.md) | The eight-step procedure a sprint follows. |
| [REVIEW-PROMPT.md](REVIEW-PROMPT.md) | The adversarial review checklist and required finding format. |
| [SPRINT-PLAN.md](SPRINT-PLAN.md) | The queue and the **Immediate next action** pointer. |
| [TRACEABILITY.md](TRACEABILITY.md) | Shipped capability → domain term → decision record → proving test. |
| [templates/](templates/) | Validation report, decision request. |
| [reports/](reports/) | One validation report per sprint. Audit trail. |

## Where things actually live

`.ai/` holds **contracts and prompts**. It is not a store for work:

- **Tickets and specs** → `.scratch/<effort>/`, per [issue-tracker.md](../docs/agents/issue-tracker.md).
  There is no `.ai/specs/` index; the tracker is the index.
- **Decisions** → [.agents/notes/](../.agents/notes/), `architecture`-class if repo-wide and durable, otherwise scoped to
  one effort, per [notes.md](../docs/agents/notes.md).
- **Research** → `docs/research/<effort>-<topic>.md`.
- **Narrative status** → [docs/roadmap.md](../docs/roadmap.md). SPRINT-PLAN.md is the machine-facing
  queue; roadmap.md is the human-facing snapshot.

## Reading order for a cold agent

Follow [AUTONOMOUS-AGENT.md](AUTONOMOUS-AGENT.md) § Mandatory reading order, then
[ORCHESTRATION.md](ORCHESTRATION.md) for the pipeline and roles, then
[SPRINT-PLAN.md](SPRINT-PLAN.md) for what to do first.

[CONTEXT.md](../CONTEXT.md) is read alongside all of them: it defines the words, and using the wrong
one is a defect rather than a style choice.
