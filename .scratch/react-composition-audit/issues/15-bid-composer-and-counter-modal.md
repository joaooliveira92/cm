# 15 — Extract the bid composer and counter-offer modal as compound leaves

Type: task
Status: ready-for-agent

**What to build:** Two distinct UI flows on the transfers screen become their own compound components, both reading from `useTransfers()`:

- **Bid composer** — the contextual Actions region (bid amount input, sign button, window-closed notice, bid alert) plus the dirty-draft Keep/Discard dialog. It is the only consumer of the draft's `confirmDiscard` state and owns the dialog's keyboard lifecycle (initial focus on Keep, Tab trapped, Escape keeps/closed). The dirty-draft reducer itself stays a pure module; the composer just drives it.
- **Counter-offer modal** — the inline counter-offer dialog with its amount input and inline error handling, driven by the shared counter state read from context.

Both are *compound* in the composition-patterns sense: they render as a small cluster over the shared provider context and encapsulate their own sub-composition (dialog + its keyboard, modal + its inline error) rather than receiving ten boolean flags and drill-through callbacks from the screen.

**Blocked by:** 13 (the provider must be live so the composer and modal can read draft/counter state and fire submit commands).

**Status:** ready-for-agent

- [ ] A bid composer compound renders the Actions region and Keep/Discard dialog from `useTransfers()`, and still honours the no-silent-discard lifecycle (dirty draft surfaces the keep/discard decision; Escape keeps and closes; focus returns to the invoking row on keep, to the bid input on discard).
- [ ] A counter-offer compound renders from shared counter state with its inline error on invalid/empty submit; accept/reject/counter still dispatch correctly.
- [ ] No behaviour change to bid validity, the disabled-submit gate, the window-closed notice, or the bid alert.
- [ ] `pnpm check:all` passes.
