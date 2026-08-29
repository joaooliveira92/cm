Type: task
Status: ready-for-agent
Blocked by: None (can start immediately)

## Work

A spec section documenting `error-paths.spec.ts` — 4 tests covering generic transfer failure (smoke), InvalidTacticError (journey), sacking error (skipped), and loadSave no-op (smoke). Records which error patterns each test represents and why the rest were not covered individually.

## Decisions

- 4 tests in error-paths.spec.ts: generic transfer failure smoke, InvalidTacticError journey, sacking error smoke (skipped), loadSave no-op smoke; fresh seed suffices. See [Agent Note](../../../.agents/notes/implemented/testing/2026-08-28-error-path-coverage-spec.md).

- [ ] Spec documents all 4 tests with seed, type, and assertion
- [ ] Spec explains why only 4 paths were selected from the 30+ catalog
- [ ] Spec records the sacking test as skipped with rationale
- [ ] Spec references the error-paths catalog research without duplicating it