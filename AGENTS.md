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
| effect-lint | `tsx scripts/effect-lint.ts` | Custom Effect anti-pattern detection (no Effect.ignore, no Effect.asVoid, no Effect.catchAllCause, no Effect.serviceOption, no disableValidation, no void expressions, no nested Layer.provide, explicit concurrency on Effect.all/Effect.forEach). AST-based, so mentions in comments and strings do not trip it. |
| verify-md-links | `tsx scripts/verify-md-links.ts` | No broken markdown links |
| test | `pnpm -r test` | All unit tests (dot reporter; set `VERBOSE=1` for full names) |

Add new Effect-specific lint rules to `scripts/effect-lint.ts`. They fire before tests in the gate pipeline. See the [accountability repo](https://github.com/mikearnaldi/accountability) for inspiration on Effect lint conventions.

### Routing repeat review findings

When `/code-review` raises the same Effect finding a third time, that's a signal about the tooling, not about that branch. Route it by kind rather than fixing it again in place:

- **Mechanical and grep-detectable** → a new rule in `scripts/effect-lint.ts`. It then costs zero review attention forever.
- **Needs judgement** → a line in `.agents/skills/effect-code/SKILL.md`, so the *implementer* gets it up front instead of the reviewer catching it after. Wrap it in a `<!-- repo-finding: <id> -->` fence and add the matching row to that skill's `references/distillation-state.md` registry. `SKILL.md` is also the output of an automated distillation pass; an unfenced line has no source note behind it and gets silently overwritten the next time that pass rewrites the section, which puts the finding straight back into the review loop.

Without this, the reviewer slowly degrades into a hand-run linter and the skill file stops reflecting what actually goes wrong in this codebase.
