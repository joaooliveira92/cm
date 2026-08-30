# TanStack Hotkeys Viability for the Key-Binding Layer

Produced by research subagent on 2026-08-29.

Sources:

- https://tanstack.com/hotkeys/latest/docs/overview — official overview, alpha notice, feature list
- https://tanstack.com/hotkeys/latest/docs/framework/react/guides/hotkeys — React guide (`ignoreInputs`, `useHotkeyRegistrations`)
- https://github.com/TanStack/hotkeys — repo README, open issues, commit and release history
- https://raw.githubusercontent.com/TanStack/hotkeys/main/docs/config.json — full docs page index (used to establish what is *not* documented)
- https://registry.npmjs.org/@tanstack/hotkeys, `.../@tanstack/react-hotkeys`, `.../react-hotkeys-hook`, `.../tinykeys`, `.../@tanstack/react-router`, `.../@tanstack/react-table` — registry metadata (versions, publish timestamps, peer deps)
- https://api.npmjs.org/downloads/point/last-week/* — download counts
- Published tarballs, read directly: `@tanstack/hotkeys@0.8.0`, `@tanstack/react-hotkeys@0.10.0`, `react-hotkeys-hook@5.3.3`, `tinykeys@4.0.0`, `@tanstack/react-router@1.170.32` — `.d.ts` and compiled `.js` are the authority for every capability claim below
- https://github.com/TanStack/router/issues/918 — "Accessibility", open since 2024-01-04
- https://tanstack.com/table/latest/docs/overview — headless-UI statement
- Local: `/Users/joao/dev/audit/apps/desktop/package.json` — React 19.2, no TanStack dependency today

Nothing below comes from a blog post or forum. Where I state that something does not exist, I checked the published type surface and the compiled source, not just the docs.

## 1. TanStack Hotkeys maturity

| Fact | Value | Evidence |
|---|---|---|
| Core version | `@tanstack/hotkeys@0.8.0`, published 2026-04-25 | npm registry |
| React adapter version | `@tanstack/react-hotkeys@0.10.0`, published 2026-04-25 | npm registry |
| Declared status | **alpha** — "TanStack Hotkeys is alpha. We are actively developing the library and are open to feedback and contributions." (README line 54); docs overview repeats "currently in alpha and its API is still subject to change" | README, docs overview |
| First publish | 2026-02-10 (core), repo created 2026-01-21 | npm registry, GitHub API |
| Versions shipped | 24 core / 27 React in ~2.5 months, then nothing | npm registry |
| Last release | 2026-04-25 — **4 months ago** | GitHub releases, npm |
| Commits since last release | CI/chore only: pnpm upgrades, codeowners, zizmor workflow, README header. Latest is 2026-08-15 | GitHub commits API |
| Open issues | 23 (34 counting PRs) | GitHub API |
| Stars | 708 | GitHub API |
| Weekly downloads | core 689k, React adapter 642k | npm downloads API |
| License | MIT | GitHub API |
| Architecture | Framework-agnostic core plus adapters. Core is `@tanstack/hotkeys` (depends only on `@tanstack/store`); adapters published for React, Preact, Solid, Vue, Angular, Svelte, Lit — all at 0.10.0/0.11.0, all published 2026-04-25 | npm registry per package |
| React 19 | `peerDependencies: { react: ">=16.8", react-dom: ">=16.8" }`. No React-19-specific breakage found in open issues | package.json of `@tanstack/react-hotkeys@0.10.0` |
| Bundle cost | Core published ESM gzips to ~19.7 KB, React adapter ~5.7 KB (unminified `dist`, so a bundler will land meaningfully lower). Unpacked: 745 KB core / 242 KB adapter. `sideEffects: false`, per-module files, so tree-shaking should trim the recorder/key-state/format modules if unused | measured on the published tarballs |

The download figure is misleading. 642k/week on a library that is four months without a release, with 23 open issues, is the TanStack brand halo, not evidence of production hardening. The signal that matters is release cadence: twelve versions in five weeks in March, then a hard stop on 2026-04-25 with only chore commits since.

## 2. Capability fit

Read from `@tanstack/hotkeys@0.8.0` `dist/*.d.ts` and `dist/hotkey-manager.js`.

| Requirement | TanStack Hotkeys | Detail |
|---|---|---|
| Scoped / contextual bindings | **Absent** | There is no scope concept anywhere: not in `HotkeyOptions`, not in `HotkeyManager`, not in the docs index (no scopes page exists). `HotkeysProvider` in the React adapter is *only* a default-options container — its props are `{ hotkey, hotkeyRecorder, hotkeySequence, hotkeySequenceRecorder }` partial option objects. It carries no scope state. The only lever is per-registration `enabled?: boolean`, which you would have to wire yourself. |
| Sequence bindings (`g` then `s`) | **Yes** | `SequenceManager`, `HotkeySequence = Array<Hotkey>`, `useHotkeySequence`, `SequenceOptions.timeout` default 1000 ms. Steps may carry modifiers. |
| Suppression in inputs / contenteditable | **Yes, and the default is good** | `HotkeyOptions.ignoreInputs`. Ignores text inputs, textarea, select and contenteditable; does *not* ignore `type=button/submit/reset`. Smart default: `true` for single keys and Shift/Alt combos, `false` for Ctrl/Meta shortcuts and `Escape`. |
| Priority / layering when a modal is open | **Absent, and structurally so** | `#processTargetEvent` loops over *every* registration on the target and fires *every* match. `stopPropagation` is applied to the DOM event, which does nothing to the in-manager loop. So a screen-level `Escape` and a modal-level `Escape` both fire, in registration order. Open issue [#42 "stopPropagation with multiple modal"](https://github.com/TanStack/hotkeys/issues/42), filed 2026-02-24, is exactly this and is still open. |
| Programmatic enumeration of active bindings | **Yes — best in class** | `useHotkeyRegistrations()` returns `{ hotkeys: HotkeyRegistrationView[], sequences: SequenceRegistrationView[] }` reactively, no provider required. Each view carries `hotkey`, `parsedHotkey`, `options` (including `options.meta?.name`/`description`, extensible by declaration merging), `target`, `triggerCount`. `HotkeyManager.registrations` is a raw `Store<Map<string, HotkeyRegistration>>` you can subscribe to. Plus `isRegistered()`, `getRegistrationCount()`, and `formatForDisplay`/`KEY_DISPLAY_SYMBOLS` for rendering the key map. This is precisely the help-overlay / command-palette read path the ticket asks about. |
| Conflict handling | Partial | `ConflictBehavior = 'warn' \| 'error' \| 'replace' \| 'allow'`, default `'warn'` — which *warns but still runs both*. `'replace'` unregisters the incumbent, which is destructive and unordered, not a layer stack. |

Two additional findings that bite a keyboard-first CM clone specifically:

- **`?` is not a bindable key.** The `Hotkey` type's `PunctuationKey` union is `'/' '[' ']' '\\' '=' '-' ',' '.' ';' '`'` — no `?`. And `Shift+` combinations are deliberately typed against `NonPunctuationKey` only, so `Shift+/` is not expressible either. Open issue [#19 "`Mod+?` / `?` missing"](https://github.com/TanStack/hotkeys/issues/19), filed 2026-02-17, still open. The conventional "press `?` for help" binding requires dropping to the `ParsedHotkey` object escape hatch.
- **Global single-key hotkeys fight focused widgets.** Open issues [#138](https://github.com/TanStack/hotkeys/issues/138) (single-key hotkeys fire while a focused ARIA composite widget — tabs, menu, listbox, **grid** — already owns the key) and [#142](https://github.com/TanStack/hotkeys/issues/142) (`Space` overrides native activation of the focused element). Both land directly on a squad/table screen driven by arrow keys and Space.
- **The enumeration path has a known React bug.** [#113](https://github.com/TanStack/hotkeys/issues/113): "`useHotkeyRegistrations` causes React setState-in-render warning with `useHotkey`", open since 2026-04-28. The single most valuable feature is the one with the open React-integration defect.

## 3. Router and Table focus story

| Claim | Verdict | Evidence |
|---|---|---|
| TanStack Router provides no focus management on navigation | **Confirmed** | I grepped the entire published `.d.ts` surface of `@tanstack/react-router@1.170.32` for "focus". Exactly one hit, in `link.d.ts`: `preloadDelay` — "Delay in ms before preloading on focus, hover, or viewport entry". That is a preload trigger, not focus management. There is no focus restoration, no route announcer, no a11y hook. Router issue [#918 "Accessibility"](https://github.com/TanStack/router/issues/918) has been open since 2024-01-04, last touched 2026-07-11, ~50 reactions, labelled `enhancement`, still unimplemented: "the focus stays where it is… and the screen-reader provides absolutely no feedback." Router *does* ship scroll restoration, which is a different problem. |
| TanStack Table provides no DOM or focus handling | **Confirmed** | Headless by design: it "provides the logic, state, processing and API for UI elements and interactions, but does not provide markup, styles, or pre-built implementations." You render every `<table>`/`<tr>`/`<td>` and own every event handler. There is no documented grid/roving-tabindex recipe. Current stable is `@tanstack/react-table@9.2.4`. |

Neither library helps with focus. Roving tabindex, focus restoration on screen change, and focus trapping in modals are all this app's problem regardless of which key-binding library wins. Note also that `apps/desktop/package.json` has **no** TanStack dependency today, so "we already use TanStack" is not an argument available here.

## 4. Alternatives on the same axes

| Axis | `@tanstack/react-hotkeys@0.10.0` | `react-hotkeys-hook@5.3.3` | `tinykeys@4.0.0` | Roll our own (~150 lines) |
|---|---|---|---|---|
| Status | **alpha**, 0.x, self-declared unstable API | Stable, 5.x since 2025-04 | Stable, 4.0.0 (2026-05-20) | n/a |
| Last release / activity | 2026-04-25; chore-only commits since | 2026-06-26; repo pushed 2026-08-26 | 2026-05-20; repo pushed 2026-05-26, 6 open issues | n/a |
| Age / adoption | 7 months old, 708 stars | Since 2019, 127 versions, 3,512 stars, 4.35M downloads/wk | Since 2020, 4,101 stars, 307k downloads/wk | n/a |
| React integration | Hooks (`useHotkey`, `useHotkeySequence`, …) | Hooks (`useHotkeys`) + `HotkeysProvider` | None — plain DOM subscribe, you write the `useEffect` | You write it |
| Scoped / contextual bindings | ✗ none | ✓ `scopes` option + `HotkeysProvider` with `activeScopes`, `enableScope`, `disableScope`, `toggleScope` | ✗ none — you'd swap keybinding maps by hand | ✓ if you build a scope stack |
| Sequences | ✓ `HotkeySequence`, 1000 ms timeout | ✓ `sequenceTimeoutMs`, `sequenceSplitKey`; entries flagged `isSequence` | ✓ space-separated (`"g s"`, `"y e e t"`), `timeout` default 1000 | ✗ nontrivial to get right (timeout, partial-match reset) |
| Input / contenteditable suppression | ✓ `ignoreInputs`, sensible per-hotkey default | ✓ `enableOnFormTags` (per-tag list or boolean), `enableOnContentEditable`, `ignoreEventWhen` predicate | ✓ `defaultKeybindingsHandlerIgnore` skips contenteditable and form elements; overridable via `ignore` | ✗ you write the `closest()` checks |
| Priority / layering for modals | ✗ every match fires; open bug #42 | ~ no explicit priority, but scopes give you the mechanism: disable the screen scope when the modal opens | ✗ none; `capture: true` is the only lever, and it's all-or-nothing | ✓ a scope stack with "topmost layer wins" is the whole point, ~40 of the 150 lines |
| Enumeration of active bindings | ✓✓ `useHotkeyRegistrations()`, live, with `meta.name`, plus display formatters | ✓ `useHotkeysContext().hotkeys` — every registration carries `hotkey`, `keys`, `scopes`, `description`, `metadata`, `isSequence`. Registration into the context happens on mount regardless of scope, so a help overlay can render all bindings and grey out inactive scopes. Requires `HotkeysProvider` | ✗ nothing — the keybinding map is a plain object you own, so you can enumerate *your own* source of truth but the library offers no registry | ✓ trivially — the registry is yours |
| Cross-platform `Mod` | ✓ `Mod` → Cmd/Ctrl, plus `formatForDisplay` / macOS symbols | ✓ `mod` modifier | ✓ `$mod` | ✗ you write it |
| Type safety of key strings | ✓✓ template-literal `Hotkey` union (but see the `?` gap) | ✗ plain `string` | ✗ plain `string` (does support regex keys, e.g. `"$mod+([0-9])"`) | your call |
| Display formatting for a help overlay | ✓ `formatForDisplay`, `formatHotkeySequence`, `KEY_DISPLAY_SYMBOLS`, HIG-ish labels | ✗ you format `description` + keys yourself | ✗ nothing | ✗ you write it |
| Size (gzipped published ESM, unminified) | ~25 KB (core + React adapter) | ~3.4 KB | ~2.4 KB (advertised "~1KB" minified) | ~1 KB |
| Devtools | ✓ separate `*-hotkeys-devtools` packages | ✗ | ✗ | ✗ |

What each alternative does **not** do, stated plainly:

- **`react-hotkeys-hook`**: no *ordered* priority stack — two active scopes both matching a key both fire; you express layering by disabling scopes, which is a manual discipline rather than an enforced stack. No key-string type safety (`Keys = string \| readonly string[]`). No display formatting helpers. Enumeration requires the provider and returns registrations irrespective of whether their scope is currently active, so the help overlay must cross-reference `activeScopes` itself.
- **`tinykeys`**: no scopes, no priority, no registry, no React binding, no metadata/description field. It is a matcher, not a key-binding *system*. Everything above the raw match is yours.
- **Rolling our own**: no sequence matching for free (partial-match state plus timeout plus reset-on-mismatch is the fiddly part), no cross-platform `Mod`, no display formatting, no layout-quirk handling (AZERTY, punctuation, IME, Numpad — see TanStack issues #149, #101, #20, #19, all open, all real). You would rediscover these one bug report at a time.

## 5. Recommendation

**Use `react-hotkeys-hook@5.x` as the key-binding primitive. Do not adopt TanStack Hotkeys for this app yet.**

The facts that drive it:

1. **TanStack Hotkeys has no scopes and no layering, and that is the single most important requirement on the list.** A keyboard-first CM clone is defined by "the same key means different things on different screens, and a modal takes precedence." `HotkeyManager.#processTargetEvent` fires *every* matching registration with no ordering and no way to stop the loop; `HotkeysProvider` is a default-options bag, not a scope container. Open issue #42 ("stopPropagation with multiple modal") has sat open since February. `react-hotkeys-hook` ships `scopes` plus `enableScope`/`disableScope`/`toggleScope` today, which covers both the per-screen and the modal case.
2. **It is self-declared alpha and has stalled.** README: "TanStack Hotkeys is alpha… its API is still subject to change." Version 0.8.0/0.10.0. Twelve releases in five weeks in March, then nothing since 2026-04-25 — four months of CI-and-chore commits while 23 issues stay open. Taking a 0.x dependency on the app's most pervasive interaction layer, with an explicitly unstable API and no evident maintenance velocity, is the wrong risk to accept for a layer that will be touched by every screen.
3. **The specific open bugs land on this app's exact usage.** `?` is not expressible as a hotkey (#19) and a help overlay wants `?`. Single-key global hotkeys fire while a focused grid/listbox owns the key (#138) and `Space` overrides native activation (#142) — both are the squad table. And `useHotkeyRegistrations`, the one capability where TanStack is clearly ahead, has an open React setState-in-render defect (#113).
4. **The enumeration requirement is satisfied by `react-hotkeys-hook` too, just less prettily.** `useHotkeysContext().hotkeys` gives every registration with `hotkey`, `keys`, `scopes`, `description`, `metadata`, and `isSequence` — enough to build both the help overlay and the command palette. This was the strongest argument for TanStack and it turns out not to be exclusive.
5. **Sequences and input suppression are not differentiators.** All three libraries do `g` then `s` and all three skip inputs and contenteditable. This does not decide anything.
6. **Cost of being wrong is low, and the escape hatch is cheap.** `react-hotkeys-hook` is ~3.4 KB gzipped with a stable 5.x API, 3.5k stars, and active maintenance as of 2026-08-26. Wrap it behind a thin internal module (`useBinding(scope, key, handler, { description })` plus a `useKeyMap()` reader) so the app never imports it directly. If TanStack Hotkeys reaches 1.0 with a scope/priority model, the swap is confined to that module.

Do not roll our own. The 150-line estimate is honest for the scope stack and the `keydown` dispatch, and dishonest about sequence matching, cross-platform `Mod`, and keyboard-layout edge cases — the exact set of problems that fills TanStack Hotkeys' issue tracker.

Independently of this choice: **budget for focus work.** Neither TanStack Router nor TanStack Table gives you anything — Router's public type surface mentions "focus" once, in a preload-delay doc comment, and its accessibility issue has been open since January 2024; Table is headless and renders no DOM at all. Roving tabindex, focus restoration on screen change, and modal focus trapping are all hand-written in this app no matter which key-binding library is chosen.
