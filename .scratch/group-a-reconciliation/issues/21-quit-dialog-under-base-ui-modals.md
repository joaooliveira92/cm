# 21: The Quit dialog takes no clicks while a Base UI modal is open

**What to fix:** [ticket 20](20-quit-dialog-hidden-under-router-overlays.md) raised the Quit dialog
above both z-index tiers, so it now paints on top of every hand-rolled overlay (`z-40`) and every
vendored shadcn/Base UI surface (`z-50`). One case survives it.

The vendored `Dialog` is modal by default. While it is open it marks everything outside its portal
`inert` and `aria-hidden` — and `QuitGuard` renders inside `#root`, which is exactly that outside
content. So with one open, the quit dialog paints on top but takes no clicks, and it drops out of
the accessibility tree: `getByRole("dialog", { name: "Quit" })` does not resolve.

Found in the review of ticket 20, by reading the code. The one current caller is
`chrome/header/HeaderActionsMenu.tsx:19` (`ConfirmDialog`), so the reachable path is: open the
header actions menu, trigger a confirm, press Cmd+Q.

This pre-dates ticket 20 and that ticket did not worsen it — `z-40` lost to these surfaces already.
Raising the z-index cannot fix it, because the block is `inert`, not paint order.

**There is a decision here, so do not just pick one.** Does Quit outrank a Base UI modal? If it
does, the fix is structural rather than cosmetic — `QuitGuard` portals outside the inert subtree, or
sets `inert` itself and takes the top of the modal stack. If it does not, the correct behaviour is
arguably to leave the confirm dialog in charge and let the player answer it first. Write a decision
request before implementing.

**Blocked by:** None

**Status:** resolved

- [x] The decision is recorded: Quit either outranks an open Base UI modal or defers to it
- [x] With `HeaderActionsMenu`'s confirm dialog open, Cmd+Q behaves as that decision says
- [x] A test covers it on the `HeaderActionsMenu` path
