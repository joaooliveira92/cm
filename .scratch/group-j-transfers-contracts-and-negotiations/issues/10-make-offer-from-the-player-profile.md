# 10: Make Offer from the Player Profile

Filed 2026-09-28. The map puts Screen 134 (Make Transfer Offer) on the shipped Transfers screen's Bid
Composer. This ticket adds a way into that composer from the Player Profile. It does not build a
second composer or change the existing one.

Type: task

**Status:** ready-for-agent

**Blocked by:** none.

**What to build:** a **Make Offer** verb on the Player Profile (`PlayerProfileScreen`) that opens the
Transfers screen with that Player already selected and the Bid Composer showing his draft.

- The `transfers` destination (`apps/desktop/src/renderer/navigation/destinations.ts`) gains an
  optional `playerId`, carried as a search param so a bare `transfers` link behaves as it does today.
- On load with a `playerId`, `useTransfersScreen` selects that Player in the right tab: **Market**
  for a contracted Player at another club (a Bid; any such Player can receive one, and Listed does
  not gate it, per CONTEXT.md **Listed**), **Free Agents** for a Player with no club (a Contract
  Offer via `signFreeAgent`). It moves the table cursor onto his row and leaves the session's
  sort and filters as they are. If a saved filter hides the row, clear the filters for that visit
  instead of opening an empty composer.
- The existing composer rules still apply unchanged: window closed, insufficient budget, a draft in
  progress (Keep/Discard).
- The verb is registered with the career bar through `useScreenBottomBarActions` as a secondary,
  because Continue owns the primary slot.

**Not in this ticket:** changes to the Bid Composer's internals, a loan offer (136, out of scope), and
negotiation beyond the single-round Bid (CONTEXT.md **Bid**).

**Parallel work:** Group I ticket 13 adds Scout Player to the same Profile bar. Whichever lands second
adds its button next to the first one; neither owns the bar.

- [ ] The Player Profile's bar shows Make Offer for any Player outside the manager's squad; for the
      manager's own Player it is disabled, and the reason line says why
- [ ] Make Offer on a rival opens Transfers on the Market tab with his draft in the Bid Composer
- [ ] Make Offer on a Free Agent opens Transfers on the Free Agents tab with his Contract Offer terms
- [ ] A bare `transfers` navigation (nav bar, `g 4` binding) behaves exactly as before
- [ ] A saved filter that would hide the Player does not leave the composer empty
- [ ] Renderer tests for both tabs and the bare route; e2e for the profile → Transfers path, since
      it adds a cross-screen entry point; `pnpm check:all` green

## Comments
