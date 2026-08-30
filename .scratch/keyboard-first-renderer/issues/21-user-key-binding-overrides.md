# 21: User key binding overrides

**What to build:** the rebinding surface: a `keybindings.json` inherited from Electron `userData`
(sibling of `saves/`), surfaced over four new typed RPC methods
(`getKeyBindingOverrides`, `setKeyBindingOverride`, `resetKeyBinding`, `resetAllKeyBindings`) with
file I/O in main — never `localStorage`, the Saves dir, or the event stream. Overrides are a layered
`record<ActionId, binding>` over unchanged coded defaults. The help overlay becomes the rebinding
surface (palette offers a "Rebind…" command), with per-Action reset and reset-all and the effective
default always visible. Locked infrastructure keys (`Escape`, `Primary+K`, `Primary+/`, `Enter`)
reject rebinding with a reason; colliding rebinds are rejected naming the conflicting Action;
unsupported binding shapes are rejected; a corrupt override file is tolerated at startup and fixed
on the next write.

**Decisions:**

- Configurable yes, stored machine-locally in a `keybindings.json` under Electron `userData` (a sibling of `saves/`), read/written in main through the existing typed RPC seam — never `localStorage`, the Saves dir, or the event stream; locked infrastructure keys (`Escape`, `Primary+K`, `Primary+/`, `Enter`) are non-rebindable; collisions are validated with the conflicting Action named; the help overlay is the rebinding surface (palette offers "Rebind…"), with per-Action reset and reset-all. See [Agent Note](../../../.agents/notes/implemented/feature/2026-08-30-user-key-binding-overrides.md).

**Blocked by:** 18.

**Status:** resolved

- [x] AC-34: Rebinding roundtrips the typed RPC seam and persists under `userData`; applies across saves and restarts; never in saves/event stream; no migration. (`packages/contracts/test/roundtrip.test.ts` — four procedures' payload/success/error roundtrips; `apps/desktop/test/keybindings.test.ts` — set→get→fresh-file-read persistence, two-step-as-one-entry, last-write-wins, reset; main owns `keybindings.json` under `userData`, renderer never touches the filesystem, nothing enters a save/stream/migration. Mapped Playwright restart proof deferred to ticket 22's AC-37 and recorded there.)
- [x] AC-35: Locked infra keys reject rebinding with a reason; colliding rebinds are rejected naming the conflicting Action; unsupported shapes rejected. (`apps/desktop/test/override-validation.test.ts` — locked both directions, collisions against effective bindings naming the conflicting Action, full shape/scope-expressibility matrix; `apps/desktop/test/keybindings.test.ts` main-side guard; `main-renderer-guard-match.test.ts` semantics agreement.)
- [x] AC-36: Help overlay is the rebinding surface (palette offers "Rebind…"), shows effective bindings, supports per-Action reset and reset-all; a corrupt override file is tolerated. (`apps/desktop/test/discoverability-rebinding.test.tsx` — effective bindings + rebound marker, in-place capture, Escape-cancel, rejection rendering, per-Action reset, reset-all; `discoverability-command-palette.test.tsx` "Rebind…" Action; `keybindings.test.ts` tolerant corrupt decode + fixed-on-next-write.)

## Comments

- Published from the approved to-tickets breakdown (spec: `.scratch/keyboard-first-renderer/spec.md`, Stage 6).
- Implemented, reviewed (APPROVE), low repairs folded (main↔renderer binding-grammar reconciliation to `Primary\+\S` — the unescaped forms genuinely diverged; mount-fetch/rebind race guard; `open-rebind` → overlay wiring test). Close: the decision ticket is `issues/14-user-rebinding.md` (the ticket's own `14-user-key-binding-overrides.md` citation does not exist); "Rebind…" is a real registry Action so the palette stays a command surface. Note `2026-08-30-user-key-binding-overrides` promoted proposed → implemented. Cross-tier collision semantics (a career-global Action reclaiming a screen key, or a screen Action bound to `Space` under Continue) were routed to `decision-request-binding-collision-tiers.md` rather than guessed; the badge-lag limitation is recorded in the note. AC-34's Playwright restart proof deferred to ticket 22's AC-37 in this same close. Gate green (`pnpm check:all`: typecheck/lint/effect-lint/verify-md-links ✓, 454 desktop tests, contracts 34).