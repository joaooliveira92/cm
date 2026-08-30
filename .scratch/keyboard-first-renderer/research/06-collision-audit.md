# 06-collision-audit

Research into which keys are reserved or captured by Electron, macOS, and
Windows such that a keyboard-first football management app running in an
Electron renderer cannot claim them.

## Findings

### 1. Electron's menu-accelerator reservations

Electron creates a default application menu unless `Menu.setApplicationMenu()` is
called with a custom `Menu` instance.  The default menu template includes the
following submenus and their accelerator-bearing items:

| Submenu      | Role constant | Items with default accelerators                                                              |
|--------------|---------------|-----------------------------------------------------------------------------------------------|
| App (*macOS*) | `appMenu`     | `about`, `hide` (Cmd+H), `hideOthers` (Opt+Cmd+H), `quit` (Cmd+Q)                            |
| File         | `fileMenu`    | `close` (Cmd+W, macOS) or `quit` (Ctrl+W / Ctrl+Q, Win/Linux)                                |
| Edit         | `editMenu`    | `undo` (Cmd+Z), `redo` (Cmd+Shift+Z), `cut` (Cmd+X), `copy` (Cmd+C), `paste` (Cmd+V), `selectAll` (Cmd+A), `delete`, `pasteAndMatchStyle` (macOS) |
| View         | `viewMenu`    | `reload` (Cmd+R), `forceReload`, `toggleDevTools` (Cmd+Opt+I / Ctrl+Shift+I), `resetZoom` (Cmd+0), `zoomIn` (Cmd+=), `zoomOut` (Cmd+-), `togglefullscreen` (Ctrl+Cmd+F) |
| Window       | `windowMenu`  | `minimize` (Cmd+M), `zoom`, `close` (Cmd+W, macOS)                                            |
| Help         | `help`        | (no default accelerator beyond the menu search bar on macOS)                                  |

**Key fact: a custom `Menu.setApplicationMenu()` overrides the default menu
entirely.**  The app can therefore:

- Omit any role it does not need.
- Remove any accelerator it wants to reclaim for the renderer.
- Supply its own accelerator strings (or none) on roles it keeps.

The `MenuItem` roles whose accelerators Electron cannot avoid assigning are
**none** — the role merely defines behaviour; the accelerator is explicit in the
template.  If the app builds a menu with no roles at all, Electron will happily
run with an empty menu (or no menu, by calling `Menu.setApplicationMenu(null)`).

On macOS, the **app menu** is special: the OS inserts a fixed first submenu
with the app name even if the app does not provide one.  The items `hide`,
`hideOthers`, and `quit` in that submenu are unavoidable in the sense that the
OS shows them, but their accelerators are standard macOS behaviour (Cmd+H,
Cmd+Q) and the app does not need to listen for them — the system handles them
before they reach the renderer.

[Source: Electron Application Menu tutorial](https://www.electronjs.org/docs/latest/tutorial/application-menu)
[Source: Electron MenuItem roles](https://www.electronjs.org/docs/latest/api/menu-item)

### 1a. Unavoidable Electron main-process intercepts

Even with a fully custom menu, the `before-input-event` on `webContents` can
intercept *any* key before it reaches the renderer.  By default Electron does
**not** install such a handler — the renderer gets DOM `keydown`/`keyup` for
every key the OS delivers.  The one exception is **DevTools**:
`Cmd+Opt+I` / `Ctrl+Shift+I` opens DevTools via Chromium's built-in shortcut
and cannot be stopped from the renderer; it can only be prevented by overriding
the menu item's accelerator or by calling
`webContents.setIgnoreMenuShortcuts(true)` from the main process.

[Source: Electron Keyboard Shortcuts tutorial](https://www.electronjs.org/docs/latest/tutorial/keyboard-shortcuts)
[Source: webContents `before-input-event`](https://www.electronjs.org/docs/latest/api/web-contents#event-before-input-event)

### 2. macOS system-level reservations

The macOS operating system reserves the following keyboard combinations at the
system level.  An Electron renderer **cannot** receive or prevent any of these:

| Shortcut                    | Action                       | Overridable in Electron? |
|-----------------------------|------------------------------|--------------------------|
| Cmd+Tab                     | App switcher                 | **No** — handled by the Dock before any app |
| Cmd+Space                   | Spotlight search             | **No** — system-wide; can be changed in System Settings |
| Cmd+` (grave accent)        | Cycle windows of front app   | **No** — window manager |
| Cmd+Q                       | Quit app                     | **No** — system handles this; app receives `will-quit` |
| Cmd+H                       | Hide app                     | **No** — system action (menu role `hide`) |
| Cmd+M                       | Minimize front window        | **No** — system action (menu role `minimize`) |
| Cmd+W                       | Close front window           | **No** — system action (menu role `close`) |
| Cmd+Opt+Esc                 | Force Quit dialog            | **No** — system modal |
| Ctrl+Up                     | Mission Control (desktop)    | **No** — system gesture |
| Ctrl+Down                   | App Exposé (window overview) | **No** — system gesture |
| F11 / Fn+F11 / Cmd+MissionControl | Show Desktop          | **No** — system gesture |
| F12 / Fn+F12                | Show Dashboard (older macOS) | **No** — system gesture |
| Ctrl+Fn+F2/F3/etc.          | Keyboard navigation (focus menu bar, Dock, etc.) | **No** — accessibility system shortcuts |
| Opt+Cmd+8                   | Invert colours               | **No** — accessibility |
| Power / Touch ID            | Sleep / Lock                 | **No** — hardware |
| Ctrl+Cmd+Q                  | Lock screen                  | **No** — system |
| Shift+Cmd+Q                 | Log out                      | **No** — system |
| Fn (single press, macOS Tahoe+) | Show Character Viewer    | Partial — system intercepts unless disabled in System Settings |

The following macOS shortcuts are **not system-reserved** but are strong
conventions that the app should not break:

| Shortcut | Convention |
|----------|------------|
| Cmd+C    | Copy       |
| Cmd+V    | Paste      |
| Cmd+X    | Cut        |
| Cmd+A    | Select All |
| Cmd+Z    | Undo       |
| Cmd+Shift+Z | Redo   |
| Cmd+F    | Find       |
| Cmd+S    | Save       |
| Cmd+P    | Print      |
| Cmd+O    | Open       |
| Cmd+,    | Preferences|

These reach the renderer and can be overridden with `preventDefault()`, but
doing so would break user expectations in editable text fields.  In a
management app with few text inputs, the safe pattern is to let them pass when
a text field is focused and intercept them elsewhere.

[Source: Apple Support — Mac keyboard shortcuts](https://support.apple.com/en-us/102650)

### 3. Windows system-level reservations

Windows reserves the following combinations.  An Electron app **cannot** claim
them:

| Shortcut             | Action                        | Overridable in Electron?     |
|----------------------|-------------------------------|------------------------------|
| Win key (⊞)          | Open Start menu               | **No** — handled by the shell before the app |
| Win+L                | Lock workstation              | **No** — system secure attention sequence |
| Win+D                | Show desktop                  | **No** — shell |
| Win+E                | Open File Explorer            | **No** — shell |
| Win+I                | Open Settings                 | **No** — shell |
| Win+G                | Xbox Game Bar                 | **No** — shell |
| Win+R                | Run dialog                    | **No** — shell |
| Win+S                | Search                        | **No** — shell |
| Win+T                | Cycle taskbar apps            | **No** — shell |
| Win+Tab              | Task View                     | **No** — shell |
| Win+V                | Clipboard history             | **No** — shell |
| Win+X                | Quick Link menu               | **No** — shell |
| Win+number           | Launch / switch to taskbar app| **No** — shell |
| Alt+Tab              | Window switcher               | **No** — handled before the app |
| Alt+F4               | Close window / app            | **No** — system |
| Alt+Space            | Window menu (restore/move/size/min/max/close) | **No** — system |
| Ctrl+Alt+Del         | Secure attention sequence (Lock, Task Manager, etc.) | **No** — system |
| Ctrl+Shift+Esc       | Task Manager                  | **No** — system |
| F1                   | Help                          | **No** — system default |
| F10                  | Activate menu bar accelerators| **No** — system |
| PrtScn               | Capture screen to clipboard   | **No** — system |
| Win+Shift+S          | Snip & Sketch                 | **No** — shell |
| Win+PrtScn           | Save screenshot to file       | **No** — shell |
| Win+K                | Cast to wireless display      | **No** — shell |
| Win+H                | Dictation                     | **No** — shell |
| Win+A                | Quick Settings                | **No** — shell (Win 11) |
| Win+N                | Notification Center           | **No** — shell |
| Win+W                | Widgets                       | **No** — shell (Win 11) |
| Win+Z                | Snap layouts                  | **No** — shell (Win 11) |
| Win+C                | Copilot / Speech              | **No** — shell (Win 11) |
| Win+Space            | Switch input language/keyboard layout | **No** — shell |
| Ctrl+Esc             | Open Start menu (alternative) | **No** — system |

Additionally, Windows uses **Alt+underlined letter** as menu accelerators.
If the app uses a custom application menu (which Electron renders as a native
Win32 menu), the user can navigate it with Alt alone — this is built into the
Win32 menu bar and cannot be turned off.  However, if the app sets no
application menu (or removes the menu bar entirely via `win.setMenu(null)`
on Windows), the Alt-key menu navigation is gone.

[Source: Microsoft — Keyboard (Win32 UX guide)](https://learn.microsoft.com/en-us/windows/win32/uxguide/inter-keyboard)
[Source: Microsoft — Keystroke Messages (Win32 inputdev)](https://learn.microsoft.com/en-us/windows/win32/inputdev/about-keyboard-input)

### 4. react-hotkeys-hook known limitations

**react-hotkeys-hook@5.x** (`useHotkeys`) has the following relevant properties:

1. **Single-key handling**: `useHotkeys('g', callback)` fires on *any* press of
   the `g` key that is not inside a form element (by default).  It does **not**
   wait for a second key — it treats `g` as a completed single-key shortcut.
   This means `g` as a **prefix key** (press-and-release-then-another-key,
   like `g` `g` in Vim) is **not natively supported** without the sequence
   syntax.

2. **Sequential hotkeys**: The library supports sequences via the `>` split key:
   `useHotkeys('g>i', callback)` requires pressing `g`, then `i` within
   `sequenceTimeoutMs` (default 1000ms).  This works, but the first keypress
   (`g`) is consumed and does NOT trigger any other `useHotkeys('g', ...)` that
   might also be registered.  The library dispatches only the matching
   sequential callback, not the single-key one.

3. **Conflicting single-key + sequential**: If both `useHotkeys('g', ...)` and
   `useHotkeys('g>i', ...)` are registered, pressing `g` will fire the single-key
   callback immediately on `keydown`.  The sequential listener waits for the
   next key within the timeout.  If `i` follows within 1000ms, *both* callbacks
   fire (the single-key for `g` and the sequential for `g>i`).  There is no
   built-in "defer single-key until timeout expires" mode.

4. **Browser/reserved keys that react-hotkeys-hook cannot override** (noted in
   its own docs): `meta+w` (close tab), `meta+n` (new window), `meta+t` (new
   tab), `meta+shift+w` (close window), `meta+shift+n` (incognito),
   `meta+shift+t` (reopen closed tab), `meta+1..9` (focus tab).  These are
   Chromium-level shortcuts that the browser reserves regardless of
   `preventDefault`.

5. **`preventDefault` option**: When set to `true`, the hook calls
   `event.preventDefault()` on the matched keystroke.  This works for most
   combinations, but some browser shortcuts (noted above) ignore it.

6. **`enableOnFormTags`**: Defaults to `false` — single letters like `g` do NOT
   fire when an `<input>`, `<textarea>`, or `<select>` is focused.  This is
   correct behaviour for a management app where typing in a text field should
   not trigger game commands.

7. **`ignoreModifiers`**: When `true`, matches the key regardless of modifier
   state.  Useful for catching `/` to focus search regardless of keyboard
   layout.

8. **`mod` alias**: Triggers on either `ctrl` or `meta`, whichever is pressed.
   Cross-platform safe.

**No known issues with specific modifier-key combinations** beyond the
Chromium-reserved set above.  The library correctly handles `ctrl+<key>`,
`alt+<key>`, `shift+<key>`, `meta+<key>`, function keys, arrow keys, and
space/enter/escape.

[Source: react-hotkeys-hook README](https://github.com/JohannesKlauss/react-hotkeys-hook)
[Source: react-hotkeys-hook Basic Usage docs](https://react-hotkeys-hook.vercel.app/docs/documentation/useHotkeys/basic-usage)
[Source: react-hotkeys-hook API docs](https://react-hotkeys-hook.vercel.app/docs/api/use-hotkeys)

### 5. Common unresolvable conflicts

From known Electron app practice, the following key combinations are universally
understood to be unclaimable in an Electron renderer:

| Key combo        | Platform | Reason                                      |
|------------------|----------|---------------------------------------------|
| Cmd+Tab          | macOS    | App switcher — system handles before app    |
| Alt+Tab          | Windows  | Window switcher — system handles before app |
| Ctrl+Alt+Del     | Windows  | Secure attention sequence                   |
| Win+L            | Windows  | Lock workstation (secure)                   |
| Cmd+Q            | macOS    | Quit — system action via menu role          |
| Cmd+H            | macOS    | Hide — system action via menu role          |
| Cmd+M            | macOS    | Minimize — system action via menu role      |
| Cmd+W            | macOS    | Close window — system action via menu role  |
| Alt+F4           | Windows  | Close window                                |
| Cmd+Space        | macOS    | Spotlight — unless user changes the binding |
| Win+single letter| Windows  | Reserved by shell (various Win+ combos)     |
| F1               | Windows  | System help                                 |
| F10              | Windows  | Menu accelerator mode                       |
| Cmd+Opt+I        | macOS    | DevTools (Chromium built-in)                |
| Ctrl+Shift+I     | Win/Linux| DevTools (Chromium built-in)                |
| Cmd+Opt+J        | macOS    | DevTools Console (Chromium built-in)        |
| Cmd+Opt+U        | macOS    | View Source (Chromium built-in)             |
| Cmd+R / Ctrl+R   | both     | Reload — but reclaimable via menu override  |

## Reserved Keys Table

| Key combination            | OS / Layer         | Category       | Claimable in renderer?   | Notes |
|----------------------------|--------------------|----------------|--------------------------|-------|
| `g` (single, no modifiers) | —                  | free           | **Yes**                  | Use `useHotkeys('g', ...)` with `enableOnFormTags: false` |
| `a`–`z` (single, no mods) | —                  | free           | **Yes**                  | Safe when no text field focused (default `enableOnFormTags: false`) |
| `0`–`9` (single)          | —                  | free           | **Yes**                  | Safe outside form fields |
| `F1`–`F12`                | Windows (F1, F10), macOS (F11, F12) | OS/Convention | **Partial** | `F2`–`F9` work on both platforms; `F1` reserved on Windows; `F11`/`F12` reserved on macOS for desktop/exposé |
| `Space`                   | —                  | convention     | **Yes**                  | Must not fire inside text input; standard for "Continue" |
| `Enter` / `Return`        | —                  | convention     | **Yes**                  | Usually activates default button; safe to use app-wide |
| `Escape`                  | —                  | convention     | **Yes**                  | Standard for close/cancel; can be overridden |
| Arrow keys                | —                  | free           | **Yes**                  | Scroll / grid navigation; can be overridden with `preventDefault` |
| `Tab`, `Shift+Tab`        | OS / Electron      | navigation     | **Partial**              | Used for focus cycling; can intercept via `before-input-event` but breaks accessibility |
| `Cmd+C` / `Ctrl+C`        | —                  | convention     | **Yes with caution**     | Convention for copy; override only when no text selection |
| `Cmd+V` / `Ctrl+V`        | —                  | convention     | **Yes with caution**     | Convention for paste |
| `Cmd+X` / `Ctrl+X`        | —                  | convention     | **Yes with caution**     | Convention for cut |
| `Cmd+A` / `Ctrl+A`        | —                  | convention     | **Yes with caution**     | Convention for select all |
| `Cmd+Z` / `Ctrl+Z`        | —                  | convention     | **Yes with caution**     | Convention for undo |
| `Cmd+Shift+Z` / `Ctrl+Shift+Z` | —            | convention     | **Yes with caution**     | Convention for redo |
| `Cmd+S` / `Ctrl+S`        | —                  | convention     | **Yes**                  | Save; safe to use game-meaning in a non-document app |
| `Cmd+F` / `Ctrl+F`        | —                  | convention     | **Yes**                  | Find; can be reclaimed if app has no find UI |
| `Cmd+,`                   | macOS              | convention     | **Yes**                  | Preferences |
| `Cmd+Tab`                 | macOS              | OS-reserved    | **No**                   | App switcher |
| `Alt+Tab`                 | Windows            | OS-reserved    | **No**                   | Window switcher |
| `Cmd+Space`               | macOS              | OS-reserved    | **No**                   | Spotlight |
| `Win+L`                   | Windows            | OS-reserved    | **No**                   | Lock workstation |
| `Ctrl+Alt+Del`            | Windows            | OS-reserved    | **No**                   | Secure attention |
| `Alt+F4`                  | Windows            | OS-reserved    | **No**                   | Close window |
| `Cmd+Q`                   | macOS              | OS-reserved    | **No**                   | Quit |
| `Cmd+H`                   | macOS              | OS-reserved    | **No**                   | Hide |
| `Cmd+M`                   | macOS              | OS-reserved    | **No**                   | Minimize |
| `Cmd+W`                   | macOS              | OS-reserved    | **No**                   | Close window |
| `Cmd+Opt+Esc`             | macOS              | OS-reserved    | **No**                   | Force quit dialog |
| `Ctrl+Up` / `Ctrl+Down`   | macOS              | OS-reserved    | **No**                   | Mission Control / App Exposé |
| `Cmd+\``                   | macOS              | OS-reserved    | **No**                   | Same-app window cycling |
| `F11` / `F12`             | macOS              | OS-reserved    | **No**                   | Exposé / Dashboard (can be changed in System Settings) |
| `Cmd+Opt+I` / `Ctrl+Shift+I` | Chromium/Electron | Electron-hardcoded | **No** — from renderer | DevTools; can be suppressed by removing menu accelerator |
| `Cmd+R` / `Ctrl+R`        | Chromium/Electron | Electron       | **Yes** — via menu override | Remove `reload` role from menu |
| `Win+<key>`               | Windows            | OS-reserved    | **No**                   | Reserved by shell |

## Claimable Keys Note

For a keyboard-first football management app, the following key space is safely
available **if** the app:

1. Provides its own `Menu.setApplicationMenu()` omitting unwanted roles and accelerators.
2. Does not rely on any Electron default menu accelerator.
3. Uses `before-input-event` and/or `setIgnoreMenuShortcuts(true)` in the main process as needed.
4. Uses `useHotkeys` with `enableOnFormTags: false` (the default) so single keys do not fire while typing.

**Safely claimable:**

- **All unmodified single-letter keys** (`a`–`z`) — 26 keys for global or screen-specific shortcuts.
- **All unmodified digit keys** (`0`–`9`) — 10 keys.
- **All function keys except F1** (Windows), **except F11/F12** (macOS).
- **Any `Ctrl+<key>` combination** not listed above as OS-reserved.
- **Any `Alt+<key>` combination** — but note that on Windows, `Alt` activates the menu bar; if the app has no menu bar (or removes it), this is safe.
- **Any `Shift+<key>` combination** — safe unless it collides with a Chromium shortcut.
- **Any `Ctrl+Shift+<key>` combination** — safe.
- **`Space`** — for Continue / primary action (use `enableOnFormTags` guard).
- **`Escape`** — for close/cancel.
- **Arrow keys** — for grid and list navigation (use `preventDefault` to stop scrolling).
- **Sequence-based shortcuts** — e.g., `g>i`, `g>t`, using react-hotkeys-hook's `>` syntax with a reasonable timeout (e.g. 500ms).  This allows multiple commands under the `g` prefix, though note the caveat that the first key also fires any single-key `g` binding.

**Key concern with `g` as prefix:** If you register both `useHotkeys('g', ...)`
for some action AND `useHotkeys('g>i', ...)` for another, pressing `g` fires
the single-key callback immediately.  The sequential listener waits for the
next key.  If `i` follows, both callbacks fire.  To use `g` as a pure prefix
(like Vim's `g` key), you must **not** register a single-key `g` binding, or
you must implement a deferral mechanism (e.g., set a flag on `g` press and
clear it on timeout if no second key follows).

## Sources

- Electron Application Menu template: <https://www.electronjs.org/docs/latest/tutorial/application-menu>
- Electron MenuItem roles: <https://www.electronjs.org/docs/latest/api/menu-item>
- Electron Accelerators: <https://www.electronjs.org/docs/latest/tutorial/keyboard-shortcuts>
- Electron globalShortcut: <https://www.electronjs.org/docs/latest/api/global-shortcut>
- Electron `before-input-event`: <https://www.electronjs.org/docs/latest/api/web-contents#event-before-input-event>
- Apple Mac keyboard shortcuts: <https://support.apple.com/en-us/102650>
- Microsoft Keyboard UX guide: <https://learn.microsoft.com/en-us/windows/win32/uxguide/inter-keyboard>
- Microsoft Keyboard input overview: <https://learn.microsoft.com/en-us/windows/win32/inputdev/about-keyboard-input>
- react-hotkeys-hook README: <https://github.com/JohannesKlauss/react-hotkeys-hook>
- react-hotkeys-hook docs (basic usage, API): <https://react-hotkeys-hook.vercel.app/docs/documentation/useHotkeys/basic-usage>