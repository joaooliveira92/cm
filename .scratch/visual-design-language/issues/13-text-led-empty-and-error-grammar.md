# 13: Text-led empty and error grammar

**What to build:** every empty or failed surface in the renderer explains itself in the same text-led voice, with no icons. An empty surface — a table with no rows, a results area that filtered everything out, an otherwise blank panel — renders a muted, centered line of text; when filtering caused the emptiness, a "Clear all filters" action sits with the line so the empty state offers the way back. Squad's dual-action empty state is the one sanctioned exception that may carry an action beyond the filter-clear. A structural failure renders a danger alert panel with a `BTN_SECONDARY` Retry action so severity reads at a glance; the bad-address error screen uses the same grammar without Retry — there is nothing to retry on a malformed route. An inline error renders as a danger line under the field, unboxed, with the field itself danger-tinted; inline errors never get an alert panel.

The slice's edge promise: this is look, not behavior — the error and empty state logic already exists across screens, and this ticket patterns its visuals. Callers observe severity in the shape (danger panel for structural, danger line for inline, muted line for empty) and a Retry only where a retry means something.

**Decisions:**

- **A text-led empty/structural-error/inline-error grammar with `BTN_SECONDARY` Retry — empty surfaces render a muted, centered text line (with `Clear all filters` when filtering caused it), structural errors a danger alert panel with Retry, inline errors a danger line with no box; the bad-address screen uses the grammar without Retry; Squad's dual-action empty is the one sanctioned action-bearing exception.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-08-31-layout-grammar-beyond-tables.md).

**Blocked by:** 08 — Token foundation, alias-first repaint, and the slate guard (the danger/warning tokens and the `BTN_SECONDARY` constant come from the token system).

**Status:** ready-for-agent

- [ ] Empty surfaces render a muted, text-led centered line; where filtering caused the emptiness, a "Clear all filters" action is present with the line.
- [ ] No empty state uses icons; Squad's dual-action empty state is the only sanctioned action-bearing exception to the plain line.
- [ ] Structural failures render a danger alert panel with a `BTN_SECONDARY` Retry action; the bad-address error screen uses the same grammar without Retry.
- [ ] Inline errors render as a danger line under the field with the field danger-tinted — no box, no panel.
- [ ] `pnpm check:all` is green at this commit.