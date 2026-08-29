# Agent Note: Save management edge case e2e coverage

Status: implemented

## Problem

What e2e coverage do we add for the landing screen's save management edge cases? Three specific scenarios need decisions: empty save name, duplicate save name, and loading a nonexistent save (stale list entry). Each could be a smoke test, a journey, or skipped.

## Decision

All three edge cases are covered via e2e tests in `save-management.spec.ts`, using the `fresh` seed (no custom seed scenario needed):

- **Empty save name** — journey test: clicks "Create" with an empty name, asserts no save appears in the "Continue career" list, and the app does not crash. Locks in the current UX behaviour (silent no-op) and guards against regression.
- **Duplicate save name** — smoke test: creates a save via the frontend API, then creates a second save with the same name. Asserts both appear in the "Continue career" list and neither crashes. The app permits duplicate names; the test confirms it works.
- **Nonexistent save** — smoke test: creates a save via the frontend API, programmatically deletes its `.sqlite` file from disk, then clicks the stale list entry. Asserts the user stays on the landing screen with no crash and no error banner.

## Alternatives considered

- **Skip empty-name test**: Rejected — it is one of only a few validation edge cases in the entire app, and the current silent-no-op behaviour is non-obvious. A test locks the contract.
- **Journey for duplicate name**: Rejected — there is no error message or specific behaviour to assert. A smoke test that it doesn't crash is sufficient.
- **Journey for nonexistent save**: Rejected — the current handling is a silent return. Until the UX is improved (e.g., toast, remove stale entry), a smoke test guards against regressions.
- **Extend existing smoke test file**: Rejected — save management is a distinct screen (landing) with its own concerns; colocating with match day or transfer tests would blur responsibility.

## Consequences

- `save-management.spec.ts` exists with three test cases
- Empty-name journey passes against `fresh` seed
- Duplicate-name smoke passes against `fresh` seed
- Nonexistent-save smoke passes against `fresh` seed (save UUID obtained from `seedFresh` return value; file deleted via `rmSync` before click)
- All three tests meet the wave 2 reliability contract: `retries: 2`, `timeout: 30_000`, no shared state
- Deleting the `.sqlite` file inside an e2e test is feasible via the `seedFresh` return value (UUID), which gives the filename. No restructuring needed.
- If a future change adds a disabled button or inline validation for empty names, the journey test will break — this is intentional