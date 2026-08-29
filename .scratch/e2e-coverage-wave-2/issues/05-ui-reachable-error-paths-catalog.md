# Issue: UI-reachable error paths catalog

Type: research
Status: resolved

## Question

Catalog every error state a user can reach through legitimate UI interaction in `@cm-clone/desktop`. For each mutating RPC (`signFreeAgent`, `respondToBid`, `respondAsBidder`, `placeBid`, `changeTactics`, `startMatch`, `submitMatchCommand`, `advanceCalendar`, `createSave`, `loadSave`, `renewContract`, `setTrainingFocus`), trace:

1. What error types does the backend return? (list every TaggedError the handler can produce)
2. Is the error reachable through the current UI? (i.e., can a user's actions cause this error without directly calling the RPC?)
3. If reachable, what UI feedback does the frontend render? (toast message, disabled button, error banner, inline validation, silent no-op?)
4. If reachable, what are the user actions that trigger it? (e.g., "try to sign a free agent when wage budget is 0" → `WageBudgetExceededError`)

Return a table: RPC | Error | UI-reachable? | Frontend handling | Triggering action

## Answer

Full catalog produced at `.scratch/e2e-coverage-wave-2/research/05-error-paths-catalog.md`. Key findings: 30+ UI-reachable error paths across 10 RPCs; `renewContract` and `setTrainingFocus` have no UI binding (dead code); most errors map to generic failure messages; sacking yields misleading generic errors for `changeTactics`, `startMatch`, `submitMatchCommand`, `advanceCalendar`.