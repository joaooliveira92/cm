# Agent Note: Token adoption mechanism and migration strategy

Status: proposed

## Problem

The adopted chrome-blue visual frame ([Visual design tokens and chrome-blue retro frame](../architecture/2026-08-29-visual-design-tokens.md)) has been decided since 2026-08-29 but not built: `apps/desktop/src/renderer/index.css` is still a single `@import "tailwindcss";` line, there is no `:root` block, no `@theme`, no custom properties anywhere, and the renderer has since grown *more* flat-slate styling, not less. Exactly 391 `slate-*` class tokens sit across 25 files (dominated by slate-400/800/700/100, with one light-theme outlier in `ClubSelectionScreen.tsx` and one hand-coded hex in `DataTable.tsx`). The frame decision specified the *look* but not how to apply it to a tree that is already styled; nothing said how a token gets plumbed into a component or how ~391 call sites move onto the language incrementally. That missing adoption half is this decision.

The frame note's own mechanism clause (`:root` block + Tailwind `theme.extend`) is a **Tailwind 3 answer and will not run on Tailwind 4** (4.3.3 here): v4 has no `theme.extend`, and token utilities come from `@theme`. The mechanism was therefore genuinely undecided.

## Proposal

**Token mechanism: Tailwind 4 `@theme` in its default, non-inline mode, living in `index.css`.** The entire token system — semantic `--color-*` custom properties plus the alias layer described below — is one `@theme` block in the single CSS entry `main.tsx` already imports. `@theme` emits each token as a real CSS custom property on `:root` *and* generates utilities that reference those properties via `var()`. One mechanism therefore satisfies both consumption idioms at once:

- **Utility generation** keeps the codebase's existing utility-class idiom (`bg-panel-bg` compiles to `background-color: var(--color-panel-bg)`).
- **Runtime switchability**, the skin system's future need, is not surrendered: because the emitted utilities reference `var()`, overriding the custom properties under a scope (e.g. `[data-skin="…"]`) repaints the whole renderer without touching a single utility class.

`@theme inline` is explicitly rejected: it inlines the values into the utilities, the utilities stop referencing the variables, and a later skin override can no longer repaint in place. The deferred skin system is only cheap because the default (non-inline) mode keeps the `var()` reference alive. A raw `:root` block is rejected as the *foundation* because it generates no utilities and wins nothing today — no runtime skin system exists. It is reserved as the later skin mechanism: if a real skin system ever ships, its override layer is a scoped re-declaration of the same custom properties, not a second foundation.

**Naming: role-based, prefixed, never hue-literal.** Tokens are named for what they are *for* (`--color-panel-bg`, `--color-text-primary`) and declared as `--color-*` so Tailwind generates utilities from them. The existing `--chrome-top/mid/bottom` survive unchanged: "chrome" names the gradient treatment's role, not a hue. Hue-literal names are rejected outright — a name that states today's color is a lie after the first palette change, and the whole point is that a reskin re-declares values without renaming anything.

**Where they live: `index.css`.** The `@theme` block and the handful of non-utility globals (panel/button base classes, focus ring, scrollbar treatments) all sit in the one CSS file the renderer already imports. A preset is rejected: it is a Tailwind 3 sharing concept, and this renderer has a single consumer, one entry file, and no multi-theme build.

**Consumption: generated utilities plus shared class-string constants, not a component library.** No `Panel`/`Button` component abstraction is introduced. This codebase already answered that question once: the only repeated decorative styling became the `FOCUS_RING` constant (`renderer/focus.ts`), not a component. Panels and buttons are styled containers with no behavior — no focus trap, no keyboard semantics — the things components are for. The shared vocabulary is:

- `PANEL`, `PANEL_CHROME` class-string constants for the panel system and its chrome header variant;
- `BTN_PRIMARY`, `BTN_SECONDARY` constants for the two button tiers;
- `FOCUS_RING` retuned to tokens (it currently carries one `ring-offset-slate-950`), in the same pass the constants land.

The table layer (`DataTable`, `TablePanel`) keeps its component form — that is where sorting, filtering, focus, and selection behavior live. Screens keep composing utilities and the named constants, as they do today.

**Migration sequencing: alias-first foundation, then shared-layer-first renames underneath it.**

1. **Alias step (the visual repaint, atomic).** Add the `@theme` block with the semantic tokens *and* alias entries mapping the ~10 in-use `slate-*` shades to adopted values — `--color-slate-400: var(--color-text-secondary)`, etc. Every existing `slate-*` class resolves to an adopted color with **zero JSX churn**: the whole renderer repaints in one change and the revert is one commit. This is why screen-by-screen visual sequencing is never needed: no screen ever shows two palettes.
2. **Constants step.** `PANEL`, `PANEL_CHROME`, `BTN_PRIMARY`, `BTN_SECONDARY`, and the retuned `FOCUS_RING` land; leaf utilities in early files start consuming them.
3. **Shared-layer rename step.** `CareerChrome`, `DataTable`, `TablePanel`, `LightweightDialog` call sites move onto semantic utilities. Doing the shared layer before the screens is what makes per-screen renames possible: the shared components span every screen, so any screen's slate no longer survives in its shared chrome once this step lands.
4. **Screen rename step.** The dense screens follow: creation flow → squad → transfers → league table → season summary.
5. **Alias deletion.** Each `--color-slate-*` alias entry is deleted as its last user renames away; the migration is done when the alias layer is empty and the lint baseline (below) is zero.

The three candidate strategies lose for structural reasons. **Screen-by-screen** is impossible, not just slower: `DataTable`, `CareerChrome`, `TablePanel`, and `FOCUS_RING` span every screen, so a per-screen migration would re-touch the shared layer screen after screen and no screen would ever be fully migrated. **Alias-first** (as the *lead*) beats **primitives-first** at the same job: primitives-first lands the shared layer first but shows a visible split tree from day one (rethemed `DataTable` floating on flat slate pages); alias-first gets the whole renderer onto the adopted palette atomically and reversibly, then the shared-layer work proceeds as a rename under a stable, already-adopted visual.

**Mixed-state period: none visible, by construction.** Because the alias step repaints globally in one change, two palettes never coexist on screen. Atomicity-per-screen as a *requirement* is rejected — with the shared layer spanning every screen, per-screen atomicity is incoherent; alias-first is the only way to get atomicity at all. The only residue is source-level: `slate-*` strings remain in classNames until each rename step lands. That residue is the migration backlog, and it is invisible on screen.

**Regression guard: a `no-slate-class-name` rule in `scripts/effect-lint.ts`, live from the alias commit.** This is mechanical and grep-detectable, so per the repo's lint-routing discipline it belongs in the linter, not in skill prose. The rule fits `effect-lint.ts`'s existing shape: an AST-based scan over `.tsx` files, one more `Rule[]` entry whose `test` matches a `className` JSX attribute and inspects its initializer for `slate-`. Two implementation requirements: the initializer may be a template literal with interpolation (`className={… ${FOCUS_RING.join(" ")} …}`), so the rule must look inside `JsxExpression`/template segments, not only plain string literals; and `FOCUS_RING` itself must be token-retuned in the same pass so the rule does not immediately flag it. The ~391 existing sites form a baseline registry that shrinks as renames land — the rule *is* the schedule, and a fresh `slate-*` in a new screen fails the gate from day one.

This decision supersedes the mechanism clause of [Visual design tokens and chrome-blue retro frame](../architecture/2026-08-29-visual-design-tokens.md): its `theme.extend` + `:root` proposal is replaced by the `@theme` mechanism. The supersession is **partial** — that note's token *values* (palette, typography, panel system, buttons) stand unmodified; only the plumbing clause is absorbed here, and the frame note is left active rather than archived. Its "Skin system" section is also updated in effect: skins remain deferred and gated as recorded, but now with a decided foundation — the `@theme` override layer — instead of the vague "swap the `:root` block" it left open.

## Alternatives considered

1. **Raw `:root` block as the foundation.** Wins runtime switchability but loses utility generation entirely, and nothing today needs switchability. Rejected as the foundation; the mechanism is reserved for the future skin override layer instead, where it is the right tool.
2. **`@theme inline`.** Inlines token values into emitted utilities, which breaks the `var()` reference a future skin override needs — the deferred skin system would stop being cheap and become a utility re-emission problem. Rejected.
3. **Both `@theme` and a parallel `:root` block.** Redundant: `@theme` already emits the custom properties onto `:root`. A second declaration is a second source of truth. Rejected.
4. **Hue-literal token names** (`--chrome-blue-mid`). A name that asserts the current hue must be rewriter-migrated on every palette change. Rejected.
5. **Tailwind preset file** for the tokens. An npm-package sharing concept; this renderer has one consumer and one entry. Rejected.
6. **A `Panel`/`Button` component library.** The codebase's own precedent (`FOCUS_RING`, a constant) and the absence of behavioral insides both argue against it; styling-only components court a taxonomy 25 files never asked for. Rejected.
7. **Screen-by-screen migration.** Impossible: the shared layer spans every screen, so per-screen migration re-touches shared components repeatedly and no screen ever fully migrates. Rejected.
8. **Primitives-first as the sequence lead.** Lands the shared layer first but shows a split tree while leaves are flat; alias-first delivers the same foundation with no visible split and a one-commit revert. Rejected as the lead.
9. **Per-screen visual atomicity as a requirement.** Incoherent with a shared component layer; alias-first is the only ordering that achieves atomicity, and it achieves it globally. Rejected.
10. **Regression guard as a convention line in a skill.** Mechanical, grep-detectable findings belong in the linter per the repo's routing discipline; prose guidance is for judgements. Rejected.
11. **No regression guard.** The documented failure mode is precisely that flat slate spread *after* the frame was adopted; shipping a migration with no guard reproduces it. Rejected.

## Acceptance criteria

1. `index.css` contains one `@theme` block (default, non-inline) declaring the semantic `--color-*` tokens and the `--color-slate-*` alias layer; `main.tsx`'s existing `import "./index.css"` is unchanged.
2. A token utility (e.g. `bg-panel-bg`) compiles to a `var()` reference, and a scoped override of `--color-panel-bg` repaints the renderer without editing utilities.
3. All 391 `slate-*` occurrences repaint to adopted colors with zero JSX edits (alias step), verifiable by diff and a visual pass.
4. `PANEL`, `PANEL_CHROME`, `BTN_PRIMARY`, `BTN_SECONDARY` constants exist beside a token-retuned `FOCUS_RING`; no `Panel`/`Button` component files are added.
5. Migration proceeds in the documented order; each `--color-slate-*` alias is deletable once its last user renames; the alias layer and the lint baseline reach zero.
6. `no-slate-class-name` rule lives in `scripts/effect-lint.ts`, inspects string and template-literal classNames, has a fixture in the existing fixture pattern, and fails on any fresh slate-* after the alias commit.
7. `pnpm check:all` is green after each migration step; `FOCUS_RING` carries no `slate-*`.

## Risks

- **Alias mapping error repaints everything at once.** The adoption step is the whole renderer in one change. Mitigated by the palette already being decided (the alias maps into decided values, not new guesses) and by the one-commit revert.
- **Lint-rule false negatives from interpolated classNames.** Class values built with `… ${FOCUS_RING.join(" ")} …` are template expressions, not plain string literals; a rule that only inspects `StringLiteral` initializers lets slate through. The rule must descend into `JsxExpression` template segments.
- **Off-alias slate.** The `ClubSelectionScreen` light-theme outlier (slate-200/500/600/700 on a white page, a pre-dark-theme remnant) and the inline `rgb(2 6 23)` in `DataTable.tsx` are not `slate-*` class tokens and will not be caught by the alias or the lint rule; they need explicit retheming in the screen/shared rename steps or they stay off-language.
- **Tailwind 4 mechanism drift.** The `@theme` → `var()` emission is v4 API; a future minor that changes emission defaults or nudges toward `inline` would silently break the skin-switch premise. The non-inline default is stable at 4.3.3; any upgrade that shifts it is caught by checking that emitted utilities still reference variables.
- **Wide mechanical churn.** The rename steps touch 25 files; purely mechanical, but broad. The alias-first ordering contains the *visual* risk; the renames are code-only and gated file by file.