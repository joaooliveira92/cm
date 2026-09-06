# 04: Outstanding items are resolvable, not just stated

**What to build:** A player who is told something is outstanding can get to it in one step, and is
told about all of it rather than the first item only.

The readiness assessment already classifies what the career loop has to say before the Calendar
advances — blockers that stop the advance, advisories that must stay ignorable — but the chrome
renders a single line and shows only the first advisory. A player with unanswered bids *and* no
Tactic hears about one of them, resolves it, and discovers the second.

Every outstanding item is listed, blockers before advisories, each stating what it is and what
happens if it is left alone. Each item carries a destination — the screen that owns the fix — so
"resolve this" is a step rather than a hunt. An advisory stays advisory: the advance still proceeds,
because a player who chooses to let a bid lapse has answered it.

The destination belongs to the item, not to the component rendering it: the surface must not infer
which screen owns a blocker from its copy.

Seam: renderer plus the pure readiness module. No RPC change; every fact the assessment reads is
one the chrome already holds.

**Decisions:**

- Readiness is a derived state displayed persistently while its predicate holds, never a notice that
  is marked read or dismissed, because dismissal does not resolve the condition. At a boundary the
  loop lists every blocking condition and routes to the owning screens. See [Agent Note](../../../.agents/notes/proposed/feature/2026-08-29-continue-as-global-career-loop.md).
- Blockers and advisories are both reported, so resolving a blocker does not reveal a second
  surprise; an advisory that blocked the advance would turn the affordance into a soft-lock. See
  [Agent Note](../../../.agents/notes/implemented/architecture/2026-09-03-the-first-pending-decision.md).

**Blocked by:** 03 (Continue says why it stopped) — both land in the same surface, and where the
result panel sits decides where the outstanding list sits.

**Status:** resolved

- [x] Every outstanding item is listed, blockers first, in a stable order.
- [x] Each item states its consequence and offers navigation to the screen that owns the fix.
- [x] Following an item's destination and resolving it removes that item without a manual reload.
- [x] An advisory never prevents the advance; a blocker always does, with its reason visible rather
      than hidden behind a disabled control's tooltip.
- [x] The destination is carried by the item; no component maps copy to a route.
- [x] `pnpm check:all` is green.
