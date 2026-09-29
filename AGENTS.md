## Agent skills

### When to use the process

Most work goes straight to code: bug fixes, UI work on an existing screen, refactors, tests, and
features that fit in one session. No ticket, no Agent Note, no pipeline. Commit with a Conventional
Commit, and when the change made a non-obvious choice, say why in the body in a sentence or two.

Reach for the tracker and the planning chain only when the work does one of these:

- Changes a rule or behaviour an existing Agent Note explains. Update or delete that note in the
  same change so it doesn't go stale. Code that depends on a note links to it, so follow the links
  in the files you touch.
- Adds a domain concept, changes the save format, or changes a cross-process contract (IPC, the DB
  schema).
- Needs more than one session, or gets split across parallel sessions. That's where the `claimed`
  lock earns its keep.

That work runs through [.ai/ORCHESTRATION.md](.ai/ORCHESTRATION.md).

### Issue tracker

Issues live as markdown files under `.scratch/<feature>/` in this repo, for work that meets the
threshold in *When to use the process*. See [issue-tracker](docs/agents/issue-tracker.md).

### Triage labels

Two vocabularies, for two different questions, and it matters which one a ticket is using.

- **Intake state** -- `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See [triage-labels.md](docs/agents/triage-labels.md).
- **Work lifecycle** -- `claimed` then `resolved`, for child tickets under `.scratch/<effort>/issues/`. See [issue-tracker.md](docs/agents/issue-tracker.md), which defines the claim/resolve protocol, and `scripts/resolve-ticket.ts`, which automates the resolve half.

**`claimed` is a lock, so treat it as one.** The frontier scan skips claimed tickets, which means a
ticket claimed and then abandoned is invisible to every future agent -- the effort looks in
progress while nothing can pick it up. Set `claimed` immediately before starting work, not when
filing, and never in bulk. A ticket that is merely written and ready is `ready-for-agent`.

### Domain docs

Single-context: one [CONTEXT.md](CONTEXT.md) at the repo root. There is no `docs/adr/` -- design
decisions live in [.agents/notes/](.agents/notes/), and ADR identifiers map through
[`.ai/TRACEABILITY.md`](.ai/TRACEABILITY.md). See [domain.md](docs/agents/domain.md).

### Agent Notes

Default six classes: `feature`, `bug-fix`, `simplification`, `architecture`, `process`, `testing`. See [notes.md](docs/agents/notes.md).
Write one only for a decision a future contributor would plausibly undo without it; routine rationale belongs in the commit body.

### CM skill suite

Forked, Agent-Notes-aware copies of the decision-record chain (`cm-wayfinder`, `cm-implement`, `cm-to-spec`, `cm-to-tickets`, `cm-triage`, `cm-setup`, `cm-archive-notes`) under `.agents/skills/`. See [cm-skills.md](docs/agents/cm-skills.md).

### Domain skills

Effect v4 pair: `effect-code` for writing v4 code, `effect-v4-migration` for reviewing and incrementally migrating a codebase to v4. See [domain-skills.md](docs/agents/domain-skills.md).

### Documentation

`doc-standards` for writing, moving, reviewing, or auditing any Markdown doc in this repo: placement, hierarchy and detail, tutorial-vs-reference classification, and corpus audits. Its sibling-prose source is [unslop.md](docs/agents/unslop.md). See the skill's own [`SKILL.md`](.agents/skills/doc-standards/SKILL.md).

### Communication

Use [unslop.md](docs/agents/unslop.md)

### Quality gates

Run `pnpm check:all` (or `check:ci`) after every task. Both profiles are defined in one place,
`scripts/run-gates.ts`, so this table must be kept in step with that file. This runs:

| Gate | Command | Purpose |
|------|---------|---------|
| typecheck | `pnpm -r typecheck` | TypeScript errors. Every package's `include` covers its tests as well as its sources (`apps/desktop` adds `e2e/` too), so a file move that breaks only a spec's import fails here rather than fifteen minutes later in `test`. |
| lint | `oxlint --disable-nested-config .` | oxlint with stricter rules (typescript/unicorn/oxc/import plugins). Root config only: a git worktree under `.claude/worktrees/` carries its own `.oxlintrc.json`, and discovering it double-registers the `@shadcn/lint` plugin and fails the run |
| effect-lint | `tsx scripts/effect-lint.ts` | Custom Effect anti-pattern detection (no Effect.ignore, no Effect.asVoid, no Effect.catchAllCause, no Effect.serviceOption, no disableValidation, no void expressions, no nested Layer.provide, explicit concurrency on Effect.all/Effect.forEach), a ban on Tailwind's numeric font sizes (`text-xs` … `text-3xl`, `text-[11px]`) in renderer source, where text is sized by the `--text-*` type-scale roles in `index.css`, a ban on passing a size role in `className` to a primitive that owns one (`Button`, `TableCell`, `TabsTrigger`, `KeyValueKey`, ...) outside `components/ui`, following class constants through relative imports, with a reasoned per-file exemption list in the script, a ban on `localeCompare` under `packages/shared/src` and `packages/game-engine/src` (use `compareCodeUnits`), a ban on zero-argument `new Date()` and `Date.now()` in `apps/desktop/src/main/{club,career,transfers,season,match}` and the two pure packages (ages and prices read the game date), plus a 600-line ceiling on source files and a ban on the vitest environment pragma under `apps/*/test/**`, where the renderer/main split belongs to `apps/desktop/vitest.config.ts`. AST-based, so mentions in comments and strings do not trip it -- except the last two, which are the non-AST checks. The pragma rule fires on a *mention* as well as a use, deliberately: vitest matches the string anywhere in a file's leading comment block, so a comment explaining the pragma silently re-applies it. Its exemptions are a hard-coded allowlist in the script: `db/schema.ts` (drizzle-pinned path, whole-schema invariants) and `db/migrations.generated.ts` (generated). |
| verify-md-links | `tsx scripts/verify-md-links.ts` | No broken markdown links |
| verify-db-schema | `tsx scripts/verify-db-schema.ts` | The committed drizzle artifacts still match `db/schema.ts` |
| test | `pnpm -r test` | All unit tests (dot reporter; set `VERBOSE=1` for full names) |

Add new Effect-specific lint rules to `scripts/effect-lint.ts`. They fire before tests in the gate pipeline. See the [accountability repo](https://github.com/mikearnaldi/accountability) for inspiration on Effect lint conventions.

### Routing repeat review findings

When `/code-review` raises the same Effect finding a third time, that's a signal about the tooling, not about that branch. Route it by kind rather than fixing it again in place:

- **Mechanical and grep-detectable** → a new rule in `scripts/effect-lint.ts`. It then costs zero review attention forever.
- **Needs judgement** → a line in `.agents/skills/effect-code/SKILL.md`, so the *implementer* gets it up front instead of the reviewer catching it after. Wrap it in a `<!-- repo-finding: <id> -->` fence and add the matching row to that skill's `references/distillation-state.md` registry. `SKILL.md` is also the output of an automated distillation pass; an unfenced line has no source note behind it and gets silently overwritten the next time that pass rewrites the section, which puts the finding straight back into the review loop.

Without this, the reviewer slowly degrades into a hand-run linter and the skill file stops reflecting what actually goes wrong in this codebase.
