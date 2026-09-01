# 12: Unified modal anatomy across overlays

**What to build:** every overlay in the renderer — preferences, help, command palette, confirmations, and the transfer counter-offer — shares one modal anatomy, so dialogs never feel hand-copied or divergent. That anatomy is a chrome-gradient title band over a strong-panel body, in two sizes: compact centered for confirmations and the counter-offer, wide/anchored for help and the command palette (which keeps its combobox anatomy), all closing on a uniform scrim click. The change unites the hand-copied overlay chromes and fixes the Keep/Discard scrim-click gap, and never introduces a `<Dialog>` component.

Keyboard behavior is explicitly untouched: Escape, tab trap, and overlay focus restore stay exactly where the shipped focus model puts them. Match-readiness is inline content, not a modal, and no match-readiness overlay is invented; quit-confirm has no renderer component — this ticket patterns the shells that exist.

The slice's edge promise: `MODAL` constants plus a documented anatomy; the overlays render that anatomy, and their behavior contracts remain with the focus model. Callers observe a uniform chrome band, body, and scrim-click across every overlay, and no keyboard behavior change.

**Decisions:**

- **`MODAL` constants + a documented anatomy (chrome-gradient title band, strong-panel body, two sizes, uniform scrim-click closing) — never a `<Dialog>` component; behavior (focus trap, Escape, overlay focus restore) is explicitly untouched, the focus model's, not this map's.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-08-31-layout-grammar-beyond-tables.md).

**Blocked by:** 08 — Token foundation, alias-first repaint, and the slate guard (the modal's chrome-gradient title band and strong-panel body consume the token system and the chrome-panel constant).

**Status:** ready-for-agent

- [ ] Every existing overlay renders the shared modal anatomy: chrome-gradient title band, strong-panel body, two sizes (compact centered; wide/anchored), and uniform scrim-click closing.
- [ ] The command palette keeps its combobox anatomy; no keyboard behavior (Escape, tab trap, focus restore) changes anywhere.
- [ ] The Keep/Discard scrim-click gap is closed.
- [ ] No `<Dialog>` component is introduced; the anatomy is `MODAL` constants plus a documented definition.
- [ ] Match-readiness is inline content, not a modal; no match-readiness overlay ships. The quit-confirm shell is patterned the same way when its feature builds.
- [ ] `pnpm check:all` is green at this commit.