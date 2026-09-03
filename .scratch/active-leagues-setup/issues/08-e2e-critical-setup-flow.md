# 08: End-to-end critical setup flow

**What to build:** one focused Playwright flow over the critical setup path, proving the whole screen works together in the built app — per the spec's "one Playwright flow over the critical setup path" testing decision:

1. Open the Active Leagues setup screen (start a new career).
2. Add a league.
3. Change that league's simulation depth.
4. Apply a setup preset.
5. Toggle a real advanced option.
6. Verify the performance estimate and entity count change.
7. Reach a valid setup.
8. Continue.
9. Assert navigation to Step 2 · Manager.

The terminal assertion is navigation to the next step, not world creation: generation runs behind the Manager step, so campaign creation has no single-step surface on this screen. Selectors are role-based only. The existing e2e harness provides the built-app launch with a temp `--user-data-dir` and the shared launch/seed helpers.

The slice's edge promise: the flow is the whole vertical path through the shipped screen over the real trusted service — the natural capstone that asserts the slicing produced a coherent screen rather than an assembled one. Failures surface as the Playwright test's own assertion failures, not as anything the app prints.

**Blocked by:** 05 — Workspace layout, the advanced disclosure, and the introduction (the flow drives add/depth/preset/options on the workspace); 06 — Sidebar, footer, handoff, and draft persistence (the flow asserts the estimate, the sidebar, and Continue's handoff); 07 — Manage leagues retention, responsive behavior, and accessibility (the screen it drives must be complete and accessible).

**Status:** resolved

- [x] A single Playwright spec drives the setup path above from the built app and asserts navigation to Step 2 · Manager at the end.
- [x] The flow verifies the estimate and entity count change after the configuration edits.
- [x] Selectors are role-based; no CSS selectors or implementation-specific class names are used.
- [x] `pnpm test:e2e` passes; `pnpm check:all` is green at this commit.