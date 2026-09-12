# 03: Continue says why it stopped, and when it failed

**What to build:** Every press of Continue produces one structured, readable account of what the
advance did, and a press that fails says so.

Today the advance's result is fetched and thrown away — the chrome reads only whether a request is
in flight — so the player sees the season readout change and must infer the rest. A press that
fails outside the League table produces nothing at all: an archived save, a completed season, or an
unreachable main process all look identical to a press that did nothing.

One press, one result. The surface states why Continue stopped and groups the consequences the
advance reports: a Matchday resolved, a Transfer Window opened or closed, the Season concluded, the
board's verdict, and the manager's outcome. Where several arrive together they are ordered manager
outcome, board verdict, season conclusion, Matchday result, Transfer Window transition — that
orders the display and never licenses dropping the lower-priority ones. Each consequence offers
direct navigation to the screen that owns it. The result stays inspectable until the player
dismisses it or acts on it; a toast that vanishes is not sufficient, because this surface carries
the transient half of a notification system this project deliberately does not have.

It is not an inbox and must not grow into one: no persistence, no read state, no history, no
pagination. It represents the most recent advance and nothing else.

A typed failure renders its existing player-facing sentence in the same place, and the career is
left exactly where it was. State changes are announced politely, once — not on every frame of an
advance in flight.

Copy constraint: the unit is the Matchday, and no copy expresses time in days or dates. The surface
must not promise that Continue stops whenever something needs attention, because it does not; the
honest promise is that it stops at major career boundaries.

Seam: no new RPC method and no payload change. The result already crosses the process boundary and
is discarded; this ticket consumes it. Failures stay exactly the three the advance can already
raise.

**Decisions:**

- Every consequence returned by a single advance renders in one structured Continue result, not a
  chain of toasts: it states why Continue stopped, groups related consequences, preserves every
  interrupt-worthy field, provides direct navigation to owning screens, and remains inspectable
  until deliberately dismissed or acted on. The stop set is exactly the fields the advance's result
  returns. See [Agent Note](../../../.agents/notes/implemented/feature/2026-08-29-continue-as-global-career-loop.md).

**Blocked by:** 02 (Continue exists once) — the surviving control is the one that grows the surface,
and the removed one carried the only error line.

**Status:** resolved

- [x] Advancing from any career screen produces a result surface naming why the advance stopped.
- [x] Every consequence the advance reports appears; when several arrive together they are ordered
      manager outcome, board verdict, season conclusion, Matchday result, window transition, and
      none is dropped.
- [x] Each consequence offers navigation to the screen that owns it.
- [x] The surface survives until dismissed or acted on, and persists nothing across a reload.
- [x] A failed advance renders its typed sentence and leaves the career unchanged.
- [x] The stop is announced once to assistive technology; an advance in flight is not announced
      repeatedly.
- [x] No copy in the surface expresses time in days or dates, and none claims Continue stops
      whenever something needs attention.
- [x] `pnpm check:all` is green.
