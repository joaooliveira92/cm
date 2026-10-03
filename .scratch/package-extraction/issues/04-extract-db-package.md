# 04 — Extract `@cm-clone/db` (BLOCKED)

Type: task
Status: blocked

**What to build (if unblocked):** Move the SQLite schema, the generated migrations and the
save-schema creation into a `@cm-clone/db` package, so the save format has one home and `main` reads
through a package.

**Why it is blocked:** `apps/desktop/AGENTS.md` states, under `src/main/`:

> **`db/schema.ts` must not move or be split.** `drizzle.config.ts` pins its exact path, and its
> file docstring asserts whole-schema invariants. Changing it forces `pnpm db:generate` and a
> gate-blocking regenerated-artifact diff.

A `db` package necessarily moves `db/schema.ts`, and `scripts/effect-lint.ts` also hard-codes a
`db/schema.ts` path exemption. This is a deliberate, documented constraint — a "must not" — so it
needs an explicit human decision to override, not an agent deciding to move it. This ticket stays
blocked until that decision is recorded (and the rule, `drizzle.config.ts`, `pnpm db:generate`, and
the lint allowlist are all updated together).

## Acceptance criteria

- [ ] The `db/schema.ts`-must-not-move rule is explicitly superseded by a recorded decision.
- [ ] `drizzle.config.ts`, the generated artifacts, and the effect-lint allowlist are updated in the
      same change.
- [ ] _(then the move itself, as ticket 01/02 above)_

**Blocked by:** an explicit override decision, not yet taken.

## Answer

_(not started — blocked)_
