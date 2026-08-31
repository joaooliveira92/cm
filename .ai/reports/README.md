# Validation reports

One report per sprint, `<effort>.md`, written by the orchestrator from
[../templates/validation-report.md](../templates/validation-report.md) after the validation gate and
before the commit.

These are an audit trail, not documentation: they record which commands were actually run and what
they actually printed, so a later reader can tell a verified claim from an assumed one. They are not
maintained after the fact — a stale report is a historical record, not a bug.

Durable outcomes belong elsewhere: decisions in [.agents/notes/](../../.agents/notes/) or
`.agents/notes/`, capabilities in [../TRACEABILITY.md](../TRACEABILITY.md), status in
[../SPRINT-PLAN.md](../SPRINT-PLAN.md).
