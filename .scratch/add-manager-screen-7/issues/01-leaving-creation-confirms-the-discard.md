# 01: Leaving career creation confirms before discarding the generated world

**What to build:** A player who abandons career creation after the world has been built is asked
before it is thrown away, instead of losing it on the way out.

Today, leaving creation at any stage returns to the Main Menu immediately and the provisional world
is discarded on the way — silently, with no acknowledgement that anything existed. The spec's §21
forbids exactly this: Back "should not silently discard a generated world." The product does not
retain managerless careers, so §21's second branch applies — the player is told the newly generated
career will be discarded, and chooses.

The confirmation appears only when there is something to lose. Before league selection is submitted
no world exists, and after the career commits there is nothing provisional left; in both cases
leaving stays immediate. Between those points, leaving raises a confirmation naming what goes,
defaulting focus to the safe choice — staying — in line with the destructive-confirmation pattern
§14 and §21 both use. Declining returns the player to the step they left from, with the world and
every choice already made still intact; confirming discards and leaves. The same gate covers every
way out of the flow that the player initiates, not just the Cancel control, so the guarantee is
about leaving rather than about one button.

Seam: the confirmation is a renderer-side gate in front of the existing discard edge, and it adds
no failure of its own to the error channel. The discard remains fire-and-forget and idempotent, and
the standing invariant is unchanged — a provisional career must never become visible merely because
its deletion failed, so a discard that fails still leaves nothing for the player to find. The gate
needs no service the creation flow does not already hold.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] Leaving creation while a generated or generating world exists raises a confirmation that names
      what will be discarded; the player can stay or discard.
- [x] Declining returns to the step the player left from with the world, the manager entries, and the
      club selection all intact — nothing is regenerated and nothing is reset.
- [x] Confirming discards the provisional world and leaves, as it does today.
- [x] Leaving before any world exists, and leaving after the career has committed, are both immediate
      and raise no confirmation.
- [x] Focus opens on the safe choice, the dialog is operable by keyboard, and dismissing it restores
      focus to the control that opened it.
- [x] A discard that fails still leaves no career visible to the player.
- [x] `pnpm check:all` is green.
