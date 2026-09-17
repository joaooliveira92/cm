# 20: The Quit dialog paints under any overlay the router renders

**What to fix:** pressing Cmd+Q, or closing the window, while an overlay is open shows only a darker
scrim. The quit confirmation from [ticket 03](03-quit-confirmation.md) is hidden underneath.

Found in the review of desktop-suite-red ticket 07, by reading the code:

- `src/renderer/main.tsx` renders `<QuitGuard />` before `<RouterProvider>`. The renderer has no
  portals.
- `QuitGuard` and the router-rendered overlays (`TeachingSplash`, `HelpOverlay` and `CommandPalette`
  in `KeyboardSpine`, and the `mainMenu.tsx` modals) share `MODAL_SCRIM` (`fixed inset-0 z-40`,
  `theme.ts`). At equal z-index, later DOM order paints on top, so the overlay covers the dialog.
- The splash card (`w-[28rem]`) is wider than the Quit dialog (`max-w-sm`) and covers it completely.
  Clicks meant for Quit land on the splash.

It is recoverable. Focus moves to the dialog's Cancel button, so Tab and Enter still work without
the player seeing the dialog. Clicking the bare scrim closes the splash and reveals the dialog.
No data is lost.

Smallest fix: put the Quit dialog above every modal layer, either with a higher z-index or by
rendering it after `<RouterProvider>`. The first player-visible check is Cmd+Q during the first-run
splash.

**Blocked by:** None

**Status:** resolved

- [x] With the teaching splash, help overlay or command palette open, the Quit dialog is visible,
      topmost, and its buttons receive clicks
- [x] A test proves it for at least the splash
