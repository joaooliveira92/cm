# 01: Register Screen 23's divergences in a Group B reconciliation ledger

**What to build:** A reader who asks "why doesn't Continue let me pick a date to stop at, or cancel
a long advance, or coordinate with other managers" gets an answer without re-litigating anything.
Group B gains a reconciliation ledger in the format the Group A pilot fixed, and Screen 23 is
written out in it: one row per import section this project knowingly does not follow, each with a
populated Anchor, and a status line for the screen.

Screen 23's rows are at minimum:

- Multiplayer readiness, participant coordination, host disconnect and migration — `out-of-scope`,
  one human manager per Save.
- Permission contexts, private-data scoping, manager switching — `out-of-scope`, same axis.
- Career revisions, expected-revision payloads, stale-response discarding by revision —
  `out-of-scope`; the renderer holds no revision and the advance is a single local command.
- The "Stop at" policy selector and advancement to an explicit future date — `contradicted`. The
  Calendar advances only to the next scheduled event; anchor it to the `CONTEXT.md` **Calendar**
  term. If a date-targeted view is still wanted, the owning screen is 28 Calendar and Schedule.
- Cancellation at a safe boundary, `cancellation_requested`, and queued/processing progress events —
  `contradicted`; one advance is one boundary and commits or does not.
- Off-device telemetry and diagnostic reporting — `out-of-scope`, no backend.
- Localization, plural forms, right-to-left layout — `deferred`.
- The condensed LLM brief, next-planned-item, and suggested-commit sections — `out-of-scope`,
  non-normative import scaffolding.

This is a register-only ticket. No file outside the ledger changes, and no row invents a decision:
every `contradicted` row names an existing Agent Note or `CONTEXT.md` term.

**Decisions:**

- Each spec group gets one reconciliation ledger recording only divergence, as an index that points
  at the decision carrying it rather than storing the rationale. See [Agent Note](../../../.agents/notes/implemented/process/2026-08-30-spec-reconciliation-ledger.md).
- A screen audit reads the implementation, writes ledger rows, and changes no code; where the import
  disagrees with a decision this codebase has already made, the audit registers a `contradicted` row
  and stops. See [Agent Note](../../../.agents/notes/implemented/process/2026-08-30-screen-audit-against-imported-spec.md).

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] A Group B ledger exists, explains the four kinds and the status lines, and carries a coverage
      table naming all eleven screens in the group.
- [x] Screen 23 carries a row for every import section this project does not follow, each with a
      populated Anchor, and a status line of `Reviewed`.
- [x] Every `contradicted` row names an existing Agent Note or `CONTEXT.md` term; none is invented.
- [x] Screens 22 and 24 through 32 read `Not yet audited`.
- [x] No file under `docs/specs/` other than the new ledger has been edited.
- [x] `pnpm check:all` is green, `verify-md-links` included.
