# 08: Token foundation, alias-first repaint, and the slate guard

**What to build:** the whole renderer repaints onto the adopted chrome-blue palette in one reversible change with zero JSX edits — two visual languages never coexist on screen, and the change reverts in a single commit. The token system ships as one role-named `@theme` block (non-inline) in the renderer's single CSS entry, emitting custom properties on `:root` and generating utilities that reference them through `var()`. The `slate-*` call sites repaint atomically through `--color-slate-*` alias entries, so the existing 391-site body of `slate-*` classes resolves to the adopted palette without touching a single component. The consumption idiom ships with it: the `PANEL`, `PANEL_CHROME`, `BTN_PRIMARY`, and `BTN_SECONDARY` class-string constants and the token-retuned `FOCUS_RING` — no `Panel`/`Button` component library. `@theme inline`, a raw `:root` foundation, and a preset file are all rejected. The mechanical guard is live from this commit: any fresh `slate-*` class fails `pnpm check:all`, with the existing sites recorded as a baseline registry that is the migration backlog.

The slice's edge promise: this is the wide-refactor expand step — the old `slate-*` surface still exists (as aliases), so nothing downstream is forced to change; the alias layer is the seam every later rename ticket deletes. Callers observe no new failure on the RPC boundary and no class-name churn; the only observable contract is that `check:all` goes red on a fresh flat-slate class and green otherwise.

**Decisions:**

- **Retro chrome-blue visual frame adopted.** CSS custom properties for palette (dark base, chrome-blue gradients, panel-dark surfaces), typography (Trebuchet MS, 12px table body), panel system (semi-transparent bordered containers), two-tier buttons (gradient primary, flat secondary), and compact spacing (py-0.5 rows). Skin system deferred. See [Agent Note](../../../.agents/notes/implemented/architecture/2026-08-29-visual-design-tokens.md).
- **`@theme` (non-inline) in `index.css` emitting role-named `--color-*` utilities; constants not components; alias-first global repaint then shared-layer-first renames; `no-slate-class-name` lint rule as the guard.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-08-31-token-adoption-and-migration.md).

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] The renderer's single CSS entry defines the full role-named `--color-*` token set (palette, typography scales, panel surfaces and borders, two-tier button surfaces, compact density, focus ring) via `@theme`, non-inline; tokens emit custom properties on `:root` and generate utilities referencing them via `var()`. No `@theme inline`, no separate `:root` foundation, no preset file.
- [x] `--color-slate-*` alias entries repaint every existing `slate-*` utility to the adopted palette with zero JSX edits — the baseline diff is CSS-only and reverts in one commit.
- [x] The `PANEL`, `PANEL_CHROME`, `BTN_PRIMARY`, and `BTN_SECONDARY` class-string constants and the token-retuned `FOCUS_RING` exist as the consumption idiom; the renderer communicates no flat-slate surface anywhere on screen.
- [x] A `no-slate-class-name` rule lives in the effect-lint harness, inspecting string and template-literal classNames, with the existing sites as a baseline registry (the migration backlog); the harness's fixtures directory includes a fixture that must trip the rule, and the clean repository passes `pnpm check:all` with the rule live.
- [x] A fresh `slate-*` class added anywhere in the renderer fails `check:all` (the guard is proven by a test, not just asserted).
- [x] `pnpm check:all` is green at this commit.

Decisions from tickets 02 and 05 are realized here in full; their token **values** are inventoried in the linked notes — read them before writing CSS.