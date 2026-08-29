## Agent skills

### Issue tracker

Issues live as markdown files under `.scratch/<feature>/` in this repo. See [issue-tracker](docs/agents/issue-tracker.md).

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See [triage-labels.md](docs/agents/triage-labels.md).

### Domain docs

Single-context: one [CONTEXT.md](CONTEXT.md)  + `docs/adr/` at the repo root. See [domain.md](docs/agents/domain.md).

### Agent Notes

Default six classes: `feature`, `bug-fix`, `simplification`, `architecture`, `process`, `testing`. See [notes.md](docs/agents/notes.md).

### CM skill suite

Forked, Agent-Notes-aware copies of the decision-record chain (`cm-wayfinder`, `cm-implement`, `cm-to-spec`, `cm-to-tickets`, `cm-triage`, `cm-setup`, `cm-archive-notes`) under `.agents/skills/`. See [cm-skills.md](docs/agents/cm-skills.md).

### Domain skills

Effect v4 pair: `effect-code` for writing v4 code, `effect-v4-migration` for reviewing and incrementally migrating a codebase to v4. See [domain-skills.md](docs/agents/domain-skills.md).

### Documentation

`doc-standards` for writing, moving, reviewing, or auditing any Markdown doc in this repo: placement, hierarchy and detail, tutorial-vs-reference classification, and corpus audits. Its sibling-prose source is [unslop.md](docs/agents/unslop.md). See the skill's own [`SKILL.md`](.agents/skills/doc-standards/SKILL.md).

### Comunication

Use [unslop.md](docs/agents/unslop.md)

### Quality gates

Run `pnpm check:all` (or `check:ci`) after every task. This runs:

| Gate | Command | Purpose |
|------|---------|---------|
| typecheck | `pnpm -r typecheck` | TypeScript errors |
| lint | `oxlint .` | oxlint with stricter rules (typescript/unicorn/oxc/import plugins) |
| effect-lint | `tsx scripts/effect-lint.ts` | Custom Effect anti-pattern detection (no Effect.ignore, no Effect.asVoid, no Effect.catchAllCause, no Effect.serviceOption, no disableValidation, no void expressions, no nested Layer.provide) |
| verify-md-links | `tsx scripts/verify-md-links.ts` | No broken markdown links |
| test | `pnpm -r test` | All unit tests (dot reporter; set `VERBOSE=1` for full names) |

Add new Effect-specific lint rules to `scripts/effect-lint.ts`. They fire before tests in the gate pipeline. See the [accountability repo](https://github.com/mikearnaldi/accountability) for inspiration on Effect lint conventions.