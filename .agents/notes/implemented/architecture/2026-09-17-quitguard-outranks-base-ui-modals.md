# QuitGuard outranks Base UI modals

**Date:** 2026-09-17

**Status:** implemented

**Class:** architecture

**Source:** `.scratch/group-a-reconciliation/issues/21-quit-dialog-under-base-ui-modals.md`

## Decision

The Quit dialog outranks any open Base UI modal. When the player presses Cmd+Q (or closes the
window), the quit confirmation takes priority over whatever screen-level dialog is open.

## Rationale

The Quit dialog is an application-level concern — it answers "are you sure you want to close the
application?" A Base UI confirm dialog is a screen-level concern — it answers "are you sure you want
to perform this action inside the app?" The application-level intent should always override the
screen-level one. A player should not have to dismiss a screen confirm before they can quit.

## Implementation

Two changes, independent but both needed:

1. **z-index** (`MODAL_SCRIM_TOP`, `z-[60]`) — raised above the hand-rolled overlay tier (`z-40`)
   and the Base UI surface tier (`z-50`). Tailwind's default z scale stops at 50, hence the
   arbitrary value. This was the fix for ticket 20.

2. **Portal to `document.body`** — Base UI's `Dialog` is modal by default and marks everything
   outside its portal `inert` and `aria-hidden`. `QuitGuard` renders inside `#root` (before
   `<RouterProvider>`), so it was caught by that inert subtree. Portalling via `createPortal` to
   `document.body` places the dialog outside `#root`, where Base UI's inert attribute does not
   reach it. The `z-[60]` scrim still paints above the `z-50` Base UI surface.